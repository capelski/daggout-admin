export interface FirebaseStats {
    notifiableUsers: number;
    uploadedReceipts: number;
    usersWithoutReceipt: number;
    receiptsRanking: {
        userEmail: string;
        userId: string;
        receipts: number;
    }[];
    usersWithReferralCode: number;
    referrals: {
        userEmail: string;
        userId: string;
        referrals: number;
    }[];
}
