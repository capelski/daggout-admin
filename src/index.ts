import bodyParser from 'body-parser';
import express from 'express';
import firebase from 'firebase-admin';
import { join } from 'path';
import { config } from './config';
import { UserData } from './types/user-data';
import { getDbConnection, signJsonWebToken, verifyJsonWebToken } from './utils';
const firebaseServiceAccount = require('../firebase-service-account.json');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use('/', express.static(join(__dirname, '..', 'public')));

app.post('/auth', (req, res, next) => {
    const body = req.body;

    if (!body.username) {
        return res.status(400).send('Missing username');
    } else if (!body.password) {
        return res.status(400).send('Missing password');
    } else if (body.username !== config.MASTER_USER || body.password !== config.MASTER_PASSWORD) {
        return res.status(400).send('Bad username or password');
    } else {
        return res.json(signJsonWebToken({ username: body.username }, config.JWT_SECRET));
    }
});

app.use((req, res, next) => {
    const authorizationToken = req.headers.authorization;
    if (!authorizationToken) {
        return res.status(401).json({ errorMessage: 'Authorization token required' });
    }

    return verifyJsonWebToken(authorizationToken, config.JWT_SECRET)
        .then(() => {
            next();
        })
        .catch(() => res.status(401).send({ errorMessage: 'Invalid authorization token' }));
});

app.get('/firebase-stats', (req, res, next) => {
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

            const usersRanking = Object.values(aggregatedData.usersRanking).sort((a, b) => {
                return b.receipts - a.receipts;
            });

            return res.send({
                notifiableUsers: Object.keys(users).length,
                uploadedReceipts: aggregatedData.totalReceipts,
                usersWithoutReceipt: aggregatedData.receiptLessUsers,
                receiptsRanking: usersRanking.map((user) => ({
                    userEmail: usersDictionary[user.userId],
                    userId: user.userId,
                    receipts: user.receipts
                })),
                usersWithReferralCode: Object.keys(aggregatedData.referralCodes).length,
                referrals: Object.keys(aggregatedData.referrals).map((referralKey) => {
                    const userId = aggregatedData.referralCodes[referralKey];
                    const userEmail = usersDictionary[userId];

                    return {
                        userEmail,
                        userId,
                        referrals: aggregatedData.referrals[referralKey]
                    };
                })
            });
        })
        .catch((error) => {
            console.log(error);
            return res.status(500).send('Something went wrong');
        })
        .finally(() => firebaseApp.delete());
});

// TODO Implement paging, filtering and sorting
app.get('/receipts', (req, res, next) => {
    try {
        const connection = getDbConnection();

        return new Promise((resolve, reject) => {
            connection.query('SELECT * FROM daggout.receipt;', (err, results, fields) => {
                if (err) {
                    reject(err);
                }
                resolve(results);
            });
        })
            .then((results) => {
                console.log(results);
                return res.send(results);
            })
            .catch((err) => {
                console.log(err);
                return res.status(500).send('Something went wrong');
            });
    } catch (error) {
        console.log(error);
        return res.status(500).send('Something went wrong');
    }
});

app.post('/receipts', (req, res, next) => {
    try {
        const body = req.body as Receipt;
        console.log(body);

        if (!body.address) {
            return res.status(400).send('Missing receipt address');
        } else if (!body.amount || isNaN(body.amount)) {
            return res.status(400).send('Missing receipt amount');
        } else if (!body.reference) {
            return res.status(400).send('Missing receipt reference');
        } else if (!body.timestamp || isNaN(body.timestamp)) {
            return res.status(400).send('Missing receipt timestamp');
        } else if (!body.userId) {
            return res.status(400).send('Missing receipt userId');
        } else {
            if (!body.items || !(body.items instanceof Array) || body.items.length === 0) {
                return res.status(400).send('Missing receipt items');
            }
            // TODO Validate receiptItems
            // else {
            //     body.items.filter((receiptItem) => {
            //     });
            // }
        }

        const connection = getDbConnection();
        const dbDate = new Date(body.timestamp).toISOString().slice(0, 19).replace('T', ' ');

        return new Promise((resolve, reject) => {
            connection.query(
                `INSERT INTO daggout.receipt(address, amount, date, reference, userId)
VALUES (?,${body.amount},"${dbDate}", ?, ?);`,
                [body.address, body.reference, body.userId],
                (err, results, fields) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(results);
                }
            );
        })
            .then((results) => {
                console.log(results);
                return res.send(results);
            })
            .catch((err) => {
                console.log(err);
                return res.status(500).send('Something went wrong');
            });
    } catch (error) {
        console.log(error);
        return res.status(500).send('Something went wrong');
    }
});

app.listen(port, () => {
    console.log('App listening at port', port);
});
