interface Receipt {
    address: string;
    amount: number;
    brand: string;
    devolutionPeriod?: number;
    id: number;
    items: ReceiptItem[];
    notificationAdvance?: number;
    notificationDate?: number; // Javascript Date milliseconds
    pictureId: string;
    purchaseDate: number; // Javascript Date milliseconds
    reference: string;
    userId: string;
}
