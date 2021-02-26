interface Receipt {
    address: string;
    amount: number;
    id: number;
    items: ReceiptItem[];
    reference: string;
    timestamp: number;
}
