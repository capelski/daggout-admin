interface Receipt {
    address: string;
    amount: number;
    date: number; // Javascript Date milliseconds
    id: number;
    items: ReceiptItem[];
    reference: string;
    userId: string;
}
