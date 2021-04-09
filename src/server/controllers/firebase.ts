import express from 'express';
import firebase from 'firebase-admin';
import { FirebaseStats } from '../../shared/types';
import { config } from '../config';
import { FirebaseUserData } from '../types/firebase-user-data';

export const firebaseStatsHandler: express.Handler = (req, res, next) => {
    let usersDictionary: { [key: string]: string };

    const firebaseApp = firebase.initializeApp({
        credential: firebase.credential.cert(config.FIREBASE_SERVICE_ACCOUNT),
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
                    const user: FirebaseUserData = users[userKey];

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

            const firebaseStats: FirebaseStats = {
                notifiableUsers: Object.keys(users).length,
                uploadedReceipts: aggregatedData.totalReceipts,
                usersWithoutReceipt: aggregatedData.receiptLessUsers,
                receiptsRanking,
                usersWithReferralCode: Object.keys(aggregatedData.referralCodes).length,
                referrals
            };

            return res.json(firebaseStats);
        })
        .catch((error) => {
            console.error(error);
            return res.status(500).json({ message: 'Something went wrong' });
        })
        .finally(() => firebaseApp.delete());
};
