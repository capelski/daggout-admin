import express from 'express';
import firebase from 'firebase-admin';
import { ResultSetHeader } from 'mysql2';
import fetch from 'node-fetch';
import { v4 as uuid } from 'uuid';
import { Receipt, ReceiptItem } from '../../shared/types';
import { config } from '../config';
import { getDbConnection, isJsonString, jsDateToMySqlDate, parseReceiptDates } from '../utils';
import { signJsonWebToken } from './auth';

export const createReceiptHandler: express.Handler = (req, res, next) => {
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
            credential: firebase.credential.cert(config.FIREBASE_SERVICE_ACCOUNT),
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

                                notificationDate = jsDateToMySqlDate(notificationDateMilliseconds);
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
                            return res.status(500).json({ message: 'Error uploading the picture' });
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
};

export const getReceiptByIdHandler: express.Handler = (req, res, next) => {
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
                if (!receipt) {
                    return res.status(404).json({ message: `There is no receipt with Id "${id}"` });
                } else {
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
                            const firebaseApp = firebase.initializeApp({
                                credential: firebase.credential.cert(
                                    config.FIREBASE_SERVICE_ACCOUNT
                                ),
                                databaseURL: config.FIREBASE_DATABASE_URL,
                                storageBucket: config.FIREBASE_STORAGE_BUCKET
                            });

                            return firebaseApp
                                .database()
                                .ref(`daggoutIds/${receipt.userId}`)
                                .once('value')
                                .then((snapshot) => {
                                    const firebaseUserId = snapshot.val();

                                    return firebase
                                        .storage()
                                        .bucket()
                                        .file(`receipts/${firebaseUserId}/${receipt.pictureId}`)
                                        .getSignedUrl({
                                            action: 'read',
                                            expires: new Date().getTime() + 3600 * 1000
                                        })
                                        .then((signedUrls) => {
                                            return res.json({
                                                ...receipt,
                                                pictureUrl: signedUrls[0]
                                            });
                                        })
                                        .catch((error) => {
                                            console.error(
                                                "Error getting the receipt's picture url",
                                                error
                                            );
                                            return res.json(receipt);
                                        });
                                })
                                .catch((error) => {
                                    console.error(
                                        `Error getting "${receipt.userId}" daggout ID`,
                                        JSON.stringify(error)
                                    );
                                    return res.json(receipt);
                                })
                                .finally(() => {
                                    firebaseApp.delete();
                                });
                        })
                        .catch((error) => {
                            console.error('Error querying the receipt items', error);
                            return res.status(500).json({ message: 'Something went wrong' });
                        });
                }
            })
            .catch((error) => {
                console.error('Error querying the receipt', error);
                return res.status(500).json({ message: 'Something went wrong' });
            });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Something went wrong' });
    }
};

// TODO Implement paging, filtering and sorting
export const getReceiptsHandler: express.Handler = (req, res, next) => {
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
};

export const getUserReceiptsHandler: express.Handler = (req, res, next) => {
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
};
