interface Receipt {
    address: string;
    amount: number;
    brand: string;
    id: number;
    items: ReceiptItem[];
    pictureId: string;
    purchaseDate: number; // Javascript Date milliseconds
    reference: string;
    userId: string;
}
