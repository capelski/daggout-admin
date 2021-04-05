import express from 'express';
import firebase from 'firebase-admin';
import multer from 'multer';
import { ResultSetHeader } from 'mysql2';
import fetch from 'node-fetch';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { config } from './config';
import { UserData } from './types/user-data';
import {
    getDbConnection,
    isJsonString,
    jsDateToMySqlDate,
    parseReceiptDates,
    signJsonWebToken,
    verifyJsonWebToken
} from './utils';

const firebaseServiceAccount = require(join(__dirname, '..', config.FIREBASE_SERVICE_ACCOUNT_FILE));

const app = express();
const port = process.env.PORT || 3000;

const multerMiddleware = multer({
    storage: multer.memoryStorage()
});

app.use('/', express.static(join(__dirname, '..', 'public')));

app.post('/api/auth', express.json(), (req, res, next) => {
    const body = req.body;

    if (!body.username) {
        return res.status(400).json({ message: 'Missing username' });
    } else if (!body.password) {
        return res.status(400).json({ message: 'Missing password' });
    } else if (body.username !== config.MASTER_USER || body.password !== config.MASTER_PASSWORD) {
        return res.status(400).json({ message: 'Bad username or password' });
    } else {
        return res.json({
            token: signJsonWebToken({ username: body.username }, config.JWT_SECRET)
        });
    }
});

app.get('/api/user-receipts', (req, res, next) => {
    const { daggoutId, firebaseId } = req.query;

    if (!daggoutId) {
        return res.status(400).json({ message: 'Missing daggoutId parameter' });
    } else if (!firebaseId) {
        return res.status(400).json({ message: 'Missing firebaseId parameter' });
    } else {
        try {
            // TODO Check in Firebase that user/{firebaseId}/daggoutId === daggoutId
            const connection = getDbConnection();

            return new Promise<Receipt[]>((resolve, reject) => {
                connection.query(
                    'SELECT * FROM receipt WHERE userId = ?;',
                    [daggoutId],
                    (error, results, fields) => {
                        try {
                            connection.end();
                        } catch {
                            // If socket has been closed by the other side, trying to end the connection
                            // will raise an exception; empty catch due to connection is already closed
                        }

                        if (error) {
                            reject(error);
                        } else {
                            resolve((results as Receipt[]).map(parseReceiptDates));
                        }
                    }
                );
            })
                .then((receipts) => res.json(receipts))
                .catch((error) => {
                    console.error(error);
                    return res.status(500).json({ message: 'Something went wrong' });
                });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Something went wrong' });
        }
    }
});

app.use((req, res, next) => {
    const authorizationToken = req.headers.authorization;
    if (!authorizationToken) {
        return res.status(401).json({ message: 'Authorization token required' });
    }

    return verifyJsonWebToken(authorizationToken, config.JWT_SECRET)
        .then(() => {
            next();
        })
        .catch(() => res.status(401).json({ message: 'Invalid authorization token' }));
});

app.get('/api/firebase-stats', (req, res, next) => {
    let usersDictionary: { [key: string]: string };

    const firebaseApp = firebase.initializeApp({
        credential: firebase.credential.cert(firebaseServiceAccount),
        databaseURL: config.FIREBASE_DATABASE_URL
    });

    firebaseApp
        .auth()
        .listUsers()
        .then((listUsers) => {
            usersDictionary = listUsers.users.reduce(
                (reduced, user) => ({ ...reduced, [user.uid]: user.email }),
                {}
            );
        })
        .then(() => firebaseApp.database().ref('/users').once('value'))
        .then((snapshot) => {
            const users = snapshot.val();

            const aggregatedData = Object.keys(users).reduce<{
                receiptLessUsers: number;
                referralCodes: { [key: string]: string };
                referrals: { [key: string]: number };
                totalReceipts: number;
                usersRanking: {
                    [key: string]: {
                        receipts: number;
                        userId: string;
                    };
                };
            }>(
                (reduced, userKey) => {
                    const user: UserData = users[userKey];

                    const doesUserHaveReceipts = user.receipts !== undefined;
                    const userReceipts = doesUserHaveReceipts
                        ? Object.keys(user.receipts!).length
                        : 0;

                    const doesUserHasReferralCode =
                        user.customData !== undefined && user.customData.referralCode;
                    const hasUserBeenReferred =
                        user.customData !== undefined && user.customData.referredBy;

                    return {
                        receiptLessUsers: reduced.receiptLessUsers + (doesUserHaveReceipts ? 0 : 1),
                        referralCodes: doesUserHasReferralCode
                            ? {
                                  ...reduced.referralCodes,
                                  [user.customData!.referralCode!]: userKey
                              }
                            : reduced.referralCodes,
                        referrals: hasUserBeenReferred
                            ? {
                                  ...reduced.referrals,
                                  [user.customData!.referredBy!]:
                                      1 + (reduced.referrals[user.customData!.referredBy!] || 0)
                              }
                            : reduced.referrals,
                        totalReceipts: reduced.totalReceipts + userReceipts,
                        usersRanking: doesUserHaveReceipts
                            ? {
                                  ...reduced.usersRanking,
                                  [userKey]: {
                                      receipts: userReceipts,
                                      userId: userKey
                                  }
                              }
                            : reduced.usersRanking
                    };
                },
                {
                    receiptLessUsers: 0,
                    referralCodes: {},
                    referrals: {},
                    totalReceipts: 0,
                    usersRanking: {}
                }
            );

            const receiptsRanking = Object.values(aggregatedData.usersRanking)
                .map((user) => ({
                    userEmail: usersDictionary[user.userId],
                    userId: user.userId,
                    receipts: user.receipts
                }))
                .sort((a, b) => {
                    const receiptsDiff = b.receipts - a.receipts;
                    return receiptsDiff !== 0 ? receiptsDiff : b.userEmail > a.userEmail ? -1 : 1;
                });

            const referrals = Object.keys(aggregatedData.referrals)
                .map((referralKey) => {
                    const userId = aggregatedData.referralCodes[referralKey];
                    const userEmail = usersDictionary[userId];

                    return {
                        userEmail,
                        userId,
                        referrals: aggregatedData.referrals[referralKey]
                    };
                })
                .sort((a, b) => {
                    const referralsDiff = b.referrals - a.referrals;
                    return referralsDiff !== 0 ? referralsDiff : b.userEmail > a.userEmail ? -1 : 1;
                });

            return res.json({
                notifiableUsers: Object.keys(users).length,
                uploadedReceipts: aggregatedData.totalReceipts,
                usersWithoutReceipt: aggregatedData.receiptLessUsers,
                receiptsRanking,
                usersWithReferralCode: Object.keys(aggregatedData.referralCodes).length,
                referrals
            });
        })
        .catch((error) => {
            console.error(error);
            return res.status(500).json({ message: 'Something went wrong' });
        })
        .finally(() => firebaseApp.delete());
});

// TODO Implement paging, filtering and sorting
app.get('/api/receipts', (req, res, next) => {
    try {
        const connection = getDbConnection();

        return new Promise<Receipt[]>((resolve, reject) => {
            connection.query('SELECT * FROM receipt;', (error, results, fields) => {
                try {
                    connection.end();
                } catch {
                    // If socket has been closed by the other side, trying to end the connection
                    // will raise an exception; empty catch due to connection is already closed
                }

                if (error) {
                    reject(error);
                } else {
                    resolve((results as Receipt[]).map(parseReceiptDates));
                }
            });
        })
            .then((receipts) => res.json(receipts))
            .catch((error) => {
                console.error(error);
                return res.status(500).json({ message: 'Something went wrong' });
            });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Something went wrong' });
    }
});

app.get('/api/receipts/:id', (req, res, next) => {
    const { id } = req.params;

    try {
        const connection = getDbConnection();

        return new Promise<Receipt | undefined>((resolve, reject) => {
            connection.query(
                'SELECT * FROM receipt WHERE id = ?;',
                [id],
                (error, results, fields) => {
                    if (error) {
                        try {
                            connection.end();
                        } catch {
                            // If socket has been closed by the other side, trying to end the connection
                            // will raise an exception; empty catch due to connection is already closed
                        }

                        reject(error);
                    } else {
                        resolve(
                            (results as []).length > 0
                                ? parseReceiptDates((results as Receipt[])[0])
                                : undefined
                        );
                    }
                }
            );
        })
            .then((receipt) => {
                if (receipt) {
                    return new Promise<Receipt>((resolve, reject) => {
                        connection.query(
                            'SELECT * FROM receipt_item WHERE receiptId = ?;',
                            [id],
                            (error, results, fields) => {
                                try {
                                    connection.end();
                                } catch {
                                    // If socket has been closed by the other side, trying to end the connection
                                    // will raise an exception; empty catch due to connection is already closed
                                }

                                if (error) {
                                    reject(error);
                                } else {
                                    resolve({ ...receipt, items: results as ReceiptItem[] });
                                }
                            }
                        );
                    })
                        .then((receipt) => {
                            return res.json(receipt);

                            // TODO Display receipt's picture url

                            // const firebaseApp = firebase.initializeApp({
                            //     credential: firebase.credential.cert(firebaseServiceAccount),
                            //     databaseURL: config.FIREBASE_DATABASE_URL,
                            //     storageBucket: config.FIREBASE_STORAGE_BUCKET
                            // });

                            // return firebaseApp
                            //     .database()
                            //     .ref(`daggoutIds/${receipt.userId}`)
                            //     .once('value')
                            //     .then((snapshot) => {
                            //         const firebaseUserId = snapshot.val();

                            //         return firebase
                            //             .storage()
                            //             .bucket(`receipts/${firebaseUserId}/${receipt.pictureId}`)
                            //             .getMetadata()
                            //             .then((metadata) => {
                            //                 console.log(metadata);

                            //                 return res.json({
                            //                     ...receipt,
                            //                     pictureUrl:
                            //                         'https://firebasestorage.googleapis.com/v0/b/daggout-users-production.appspot.com/o/receipts%2F3ayUIFRc4YSrchsoQNBIOFumOp72%2F1617543219203.png?alt=media&token=41c03201-6790-4936-86c8-0a49d98cc3c0'
                            //                 });
                            //             })
                            //             .catch((error) => {
                            //                 console.error("Error getting the receipt's picture url", error);
                            //                 return res.json(receipt);
                            //             });
                            //     })
                            //     .catch((error) => {
                            //         console.error(
                            //             `Error getting "${receipt.userId}" daggout ID`,
                            //             JSON.stringify(error)
                            //         );
                            //         return res.json(receipt);
                            //     })
                            //     .finally(() => {
                            //         firebaseApp.delete();
                            //     });
                        })
                        .catch((error) => {
                            console.error(error);
                            return res.status(500).json({ message: 'Something went wrong' });
                        });
                } else {
                    return res.status(404).json({ message: `There is no receipt with Id "${id}"` });
                }
            })
            .catch((error) => {
                console.error(error);
                return res.status(500).json({ message: 'Something went wrong' });
            });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Something went wrong' });
    }
});

app.post(
    '/api/receipts',
    express.urlencoded({ extended: true }),
    multerMiddleware.single('picture'),
    (req, res, next) => {
        try {
            const receiptData = req.body.receipt;
            if (!receiptData) {
                return res.status(400).json([{ message: 'Missing receipt data' }]);
            } else if (!isJsonString(receiptData)) {
                return res.status(400).json([{ message: 'Wrong receipt JSON data' }]);
            } else if (!req.file) {
                return res.status(400).json([{ message: 'Missing receipt picture' }]);
            }

            const receipt: Receipt = JSON.parse(receiptData);
            const errors: { message: string }[] = [];

            if (!receipt.address) {
                errors.push({ message: 'Missing receipt Address' });
            }
            if (!receipt.amount || isNaN(receipt.amount)) {
                errors.push({ message: 'Missing receipt Amount' });
            }
            if (!receipt.brand) {
                errors.push({ message: 'Missing receipt Brand' });
            }
            if (receipt.devolutionPeriod && isNaN(receipt.devolutionPeriod)) {
                errors.push({ message: 'Wrong Devolution period' });
            }
            if (receipt.notificationAdvance && isNaN(receipt.notificationAdvance)) {
                errors.push({ message: 'Wrong Notification advance' });
            }
            if (!receipt.purchaseDate || isNaN(receipt.purchaseDate)) {
                errors.push({ message: 'Missing receipt Purchase date' });
            }
            if (!receipt.reference) {
                errors.push({ message: 'Missing receipt Reference' });
            }
            if (!receipt.userId) {
                errors.push({ message: 'Missing receipt User id' });
            }

            if (!receipt.items || !(receipt.items instanceof Array) || receipt.items.length === 0) {
                errors.push({ message: 'Missing receipt Items' });
            } else {
                receipt.items.forEach((receiptItem, index) => {
                    if (!receiptItem.amount || isNaN(receiptItem.amount)) {
                        errors.push({
                            message: `Receipt item ${index + 1}: Missing item amount`
                        });
                    }
                    if (!receiptItem.category) {
                        errors.push({
                            message: `Receipt item ${index + 1}: Missing item category`
                        });
                    }
                    if (!receiptItem.name) {
                        errors.push({
                            message: `Receipt item ${index + 1}: Missing item name`
                        });
                    }
                    if (!receiptItem.quantity || isNaN(receiptItem.quantity)) {
                        errors.push({
                            message: `Receipt item ${index + 1}: Missing item quantity`
                        });
                    }
                    if (!receiptItem.reference) {
                        errors.push({
                            message: `Receipt item ${index + 1}: Missing item reference`
                        });
                    }
                });
            }

            if (errors.length > 0) {
                return res.status(400).json(errors);
            }

            const firebaseApp = firebase.initializeApp({
                credential: firebase.credential.cert(firebaseServiceAccount),
                databaseURL: config.FIREBASE_DATABASE_URL,
                storageBucket: config.FIREBASE_STORAGE_BUCKET
            });

            let receiptId: number;
            return firebaseApp
                .database()
                .ref(`daggoutIds/${receipt.userId}`)
                .once('value')
                .then((snapshot) => {
                    const firebaseUserId = snapshot.val();

                    if (!firebaseUserId) {
                        firebaseApp.delete();
                        return res.status(400).json({
                            message: `The "${receipt.userId}" daggout ID doesn't exist `
                        });
                    } else {
                        const filenameParts = req.file.originalname.split('.');
                        const fileExtension = filenameParts[filenameParts.length - 1];
                        const pictureId = `${new Date().getTime()}.${fileExtension}`;
                        const bucket = firebaseApp.storage().bucket();
                        const gcpFile = bucket.file(`receipts/${firebaseUserId}/${pictureId}`);

                        return gcpFile
                            .save(req.file.buffer, {
                                metadata: {
                                    contentType: req.file.mimetype,
                                    metadata: {
                                        firebaseStorageDownloadTokens: uuid()
                                    }
                                }
                            })
                            .then(() => {
                                const connection = getDbConnection();
                                const purchaseDate = jsDateToMySqlDate(receipt.purchaseDate);

                                let notificationDate: string | undefined;
                                if (receipt.devolutionPeriod && receipt.notificationAdvance) {
                                    const notificationDays =
                                        receipt.devolutionPeriod - receipt.notificationAdvance;
                                    const purchaseDate = new Date(receipt.purchaseDate);
                                    const notificationDateMilliseconds = purchaseDate.setDate(
                                        purchaseDate.getDate() + notificationDays
                                    );

                                    notificationDate = jsDateToMySqlDate(
                                        notificationDateMilliseconds
                                    );
                                }

                                return new Promise((resolve, reject) => {
                                    connection.query(
                                        `INSERT INTO receipt (
    address,
    amount,
    brand,
    devolutionPeriod,
    notificationAdvance,
    notificationDate,
    pictureId,
    purchaseDate,
    reference,
    userId)
VALUES (
    ?,
    ${receipt.amount},
    ?,
    ${receipt.devolutionPeriod || 'NULL'},
    ${receipt.notificationAdvance || 'NULL'},
    ${notificationDate ? `"${notificationDate}"` : 'NULL'},
    "${pictureId}",
    "${purchaseDate}",
    ?,
    ?);`,

                                        [
                                            receipt.address,
                                            receipt.brand,
                                            receipt.reference,
                                            receipt.userId
                                        ],
                                        (error, results) => {
                                            if (error) {
                                                try {
                                                    connection.end();
                                                } catch {
                                                    // If socket has been closed by the other side, trying to end the connection
                                                    // will raise an exception; empty catch due to connection is already closed
                                                }
                                                reject(error);
                                            } else {
                                                resolve(results);
                                            }
                                        }
                                    );
                                })
                                    .then((results) => {
                                        receiptId = (results as ResultSetHeader).insertId;
                                        const items = receipt.items.map((item) => [
                                            item.amount,
                                            item.category,
                                            item.color,
                                            item.name,
                                            item.quantity,
                                            item.reference,
                                            receiptId,
                                            item.size
                                        ]);

                                        return new Promise<void>((resolve, reject) => {
                                            connection.query(
                                                `INSERT INTO
receipt_item (amount, category, color, name, quantity, reference, receiptId, size)
VALUES ${items.map((i) => '(?)').join(', ')}`,
                                                items,
                                                (error) => {
                                                    try {
                                                        connection.end();
                                                    } catch {
                                                        // If socket has been closed by the other side, trying to end the connection
                                                        // will raise an exception; empty catch due to connection is already closed
                                                    }

                                                    if (error) {
                                                        reject(error);
                                                    } else {
                                                        resolve();
                                                    }
                                                }
                                            );
                                        });
                                    })
                                    .then(() => {
                                        const idToken = signJsonWebToken(
                                            { username: config.MASTER_USER! },
                                            config.JWT_SECRET
                                        );

                                        return fetch(
                                            `${config.FIREBASE_FUNCTIONS_URL}/schedulePushNotificationHttp`,
                                            {
                                                body: JSON.stringify({
                                                    receipt: parseReceiptDates({
                                                        amount: receipt.amount,
                                                        devolutionPeriod: receipt.devolutionPeriod,
                                                        notificationAdvance:
                                                            receipt.notificationAdvance,
                                                        notificationDate,
                                                        pictureId,
                                                        purchaseDate,
                                                        store: receipt.brand
                                                    }),
                                                    receiptId: String(receiptId),
                                                    userId: firebaseUserId
                                                }),
                                                headers: {
                                                    Authorization: idToken,
                                                    'Content-Type': 'application/json'
                                                },
                                                method: 'POST'
                                            }
                                        )
                                            .then((response) => {
                                                if (response.ok) {
                                                    return res.status(200).send('OK');
                                                } else {
                                                    return response
                                                        .json()
                                                        .then((error) => {
                                                            console.error(error);
                                                            return res.status(500).json({
                                                                message: `Error creating the push notification: ${error.message}`
                                                            });
                                                        })
                                                        .catch((error) => {
                                                            console.error(error);
                                                            return res.status(500).json({
                                                                message: `Error creating the push notification: ${error.message}`
                                                            });
                                                        });
                                                }
                                            })
                                            .catch((error) => {
                                                console.error(error);
                                                return res.status(500).json({
                                                    message: 'Error creating the push notification'
                                                });
                                            });
                                    })
                                    .catch((error) => {
                                        console.error(error);
                                        return res.status(500).json({
                                            message: 'Error inserting receipt into database'
                                        });
                                    });
                            })
                            .catch((error) => {
                                console.error(error);
                                return res
                                    .status(500)
                                    .json({ message: 'Error uploading the picture' });
                            })
                            .finally(() => {
                                firebaseApp.delete();
                            });
                    }
                })
                .catch((error) => {
                    console.error(error);
                    return res.status(500).json({ message: `Error validating the user daggoutId` });
                });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Something went wrong' });
        }
    }
);

app.listen(port, () => {
    console.info('App listening at port', port);
});
