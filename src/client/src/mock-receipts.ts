import { Receipt } from '../../shared/types';

export const getReceiptItemId = () => Math.ceil(Math.random() * 100000);

export const mockReceipts: Receipt[] = [
    {
        address: 'Av. del Manzanares 210',
        amount: 79.99,
        brand: 'H&M',
        devolutionPeriod: 30,
        id: 1644187140000,
        items: [
            {
                amount: 79.99,
                category: 'Jackets',
                color: 'Grey/Checked',
                id: getReceiptItemId(),
                name: 'Oversized wool-blend coat',
                quantity: 1,
                receiptId: 1644187140000,
                reference: '1027182001',
                size: 'S'
            }
        ],
        notificationAdvance: 7,
        notificationDate: 1645187140000,
        pictureId: '1644187140000.jpg',
        purchaseDate: 1644187140000,
        reference: 'ASO87F30G3',
        userId: 'l3bowski'
    },
    {
        address: 'C/ de Narváez 20',
        amount: 32.98,
        brand: 'Zara',
        devolutionPeriod: 30,
        id: 1641245736340,
        items: [
            {
                amount: 19.99,
                category: 'Jeans',
                color: 'Light blue',
                id: getReceiptItemId(),
                name: 'FADED SLIM FIT JEANS WITH FIVE POCKETS',
                quantity: 1,
                receiptId: 1641245736340,
                reference: 'p07215350',
                size: 'M'
            },
            {
                amount: 12.99,
                category: 'Shirts',
                color: 'Black / White',
                id: getReceiptItemId(),
                name: 'REGULAR-FIT SHIRT FEATURING A CAMP COLLAR AND LONG SLEEVES WITH BUTTONED CUFFS',
                quantity: 1,
                receiptId: 1641245736340,
                reference: 'p06604104',
                size: 'M'
            }
        ],
        notificationAdvance: 7,
        notificationDate: 1641345736340,
        pictureId: '1641245736340.jpg',
        purchaseDate: 1641245736340,
        reference: 'BSO16F40Z3',
        userId: 'barea'
    }
];
