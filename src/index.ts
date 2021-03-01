import bodyParser from 'body-parser';
import express from 'express';
import firebase from 'firebase-admin';
import { ResultSetHeader } from 'mysql2';
import { join } from 'path';
import { config } from './config';
import { UserData } from './types/user-data';
import { getDbConnection, signJsonWebToken, verifyJsonWebToken } from './utils';
const firebaseServiceAccount = require('../firebase-service-account.json');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use('/', express.static(join(__dirname, '..', 'public')));

app.post('/api/auth', (req, res, next) => {
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

            return new Promise((resolve, reject) => {
                connection.query(
                    'SELECT * FROM daggout.receipt WHERE userId = ?;',
                    [daggoutId],
                    (error, results, fields) => {
                        if (error) {
                            reject(error);
                        }
                        resolve(results);
                        connection.end();
                    }
                );
            })
                .then((results) => {
                    (results as Receipt[]).forEach((r) => (r.date = new Date(r.date).getTime()));
                    return res.json(results);
                })
                .catch((error) => {
                    console.log(error);
                    return res.status(500).json({ message: 'Something went wrong' });
                });
        } catch (error) {
            console.log(error);
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
            console.log(error);
            return res.status(500).json({ message: 'Something went wrong' });
        })
        .finally(() => firebaseApp.delete());
});

// TODO Implement paging, filtering and sorting
app.get('/api/receipts', (req, res, next) => {
    try {
        const connection = getDbConnection();

        return new Promise((resolve, reject) => {
            connection.query('SELECT * FROM daggout.receipt;', (error, results, fields) => {
                if (error) {
                    reject(error);
                }
                resolve(results);
                connection.end();
            });
        })
            .then((results) => {
                (results as Receipt[]).forEach((r) => (r.date = new Date(r.date).getTime()));
                return res.json(results);
            })
            .catch((error) => {
                console.log(error);
                return res.status(500).json({ message: 'Something went wrong' });
            });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Something went wrong' });
    }
});

app.post('/api/receipts', (req, res, next) => {
    try {
        const body = req.body as Receipt;
        const errors: { message: string }[] = [];

        if (!body.address) {
            errors.push({ message: 'Missing receipt address' });
        }
        if (!body.amount || isNaN(body.amount)) {
            errors.push({ message: 'Missing receipt amount' });
        }
        if (!body.brand) {
            errors.push({ message: 'Missing receipt brand' });
        }
        if (!body.date || isNaN(body.date)) {
            errors.push({ message: 'Missing receipt date' });
        }
        if (!body.reference) {
            errors.push({ message: 'Missing receipt reference' });
        }
        if (!body.userId) {
            errors.push({ message: 'Missing receipt userId' });
        }

        if (!body.items || !(body.items instanceof Array) || body.items.length === 0) {
            errors.push({ message: 'Missing receipt items' });
        } else {
            body.items.forEach((receiptItem, index) => {
                if (!receiptItem.quantity || isNaN(receiptItem.quantity)) {
                    errors.push({ message: `Receipt item ${index + 1}: Missing item quantity` });
                }
                if (!receiptItem.reference) {
                    errors.push({ message: `Receipt item ${index + 1}: Missing item reference` });
                }
            });
        }

        if (errors.length > 0) {
            return res.status(400).json(errors);
        }

        const connection = getDbConnection();
        const dbDate = new Date(body.date).toISOString().slice(0, 19).replace('T', ' ');

        return new Promise((resolve, reject) => {
            connection.query(
                `INSERT INTO daggout.receipt (address, amount, brand, date, reference, userId)
VALUES (?, ${body.amount}, ?, "${dbDate}", ?, ?);`,
                [body.address, body.brand, body.reference, body.userId],
                (error, results) => {
                    if (error) {
                        reject(error);
                        connection.end();
                    }
                    resolve(results);
                }
            );
        })
            .then((results) => {
                const receiptId = (results as ResultSetHeader).insertId;
                const items = body.items.map((item) => [
                    item.quantity,
                    item.reference,
                    receiptId,
                    item.size,
                    item.details
                ]);

                return new Promise<void>((resolve, reject) => {
                    connection.query(
                        `INSERT INTO
daggout.receipt_item (quantity, reference, receiptId, size, details)
VALUES ${items.map((i) => '(?)').join(', ')}`,
                        items,
                        (error) => {
                            if (error) {
                                reject(error);
                            }
                            resolve();
                            connection.end();
                        }
                    );
                });
            })
            .then(() => res.status(200).send('OK'))
            .catch((error) => {
                console.log(error);
                return res.status(500).json({ message: 'Something went wrong' });
            });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Something went wrong' });
    }
});

app.listen(port, () => {
    console.log('App listening at port', port);
});
