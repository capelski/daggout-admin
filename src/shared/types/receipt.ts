import { ReceiptItem } from './receipt-item';

export interface Receipt {
    address: string;
    amount: number;
    brand: string;
    devolutionPeriod?: number;
    id: number;
    items: ReceiptItem[];
    notificationAdvance?: number;
    notificationDate?: number; // Javascript Date milliseconds
    pictureId: string;
    pictureUrl?: string; // Only when getting the receipt by id
    purchaseDate: number; // Javascript Date milliseconds
    reference: string;
    userId: string;
}
