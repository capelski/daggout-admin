import { Receipt } from '../types';

export const validateReceipt = (data: Partial<Receipt>) => {
    const errors: { message: string }[] = [];

    if (!data.address) {
        errors.push({ message: 'Missing receipt Address' });
    }
    if (!data.amount || isNaN(data.amount)) {
        errors.push({ message: 'Missing receipt Amount' });
    }
    if (!data.brand) {
        errors.push({ message: 'Missing receipt Brand' });
    }
    if (data.devolutionPeriod && isNaN(data.devolutionPeriod)) {
        errors.push({ message: 'Wrong Devolution period' });
    }
    if (data.notificationAdvance && isNaN(data.notificationAdvance)) {
        errors.push({ message: 'Wrong Notification advance' });
    }
    if (!data.purchaseDate || isNaN(data.purchaseDate)) {
        errors.push({ message: 'Missing receipt Purchase date' });
    }
    if (!data.reference) {
        errors.push({ message: 'Missing receipt Reference' });
    }
    if (!data.userId) {
        errors.push({ message: 'Missing receipt User id' });
    }

    if (!data.items || !(data.items instanceof Array) || data.items.length === 0) {
        errors.push({ message: 'Missing receipt Items' });
    } else {
        data.items.forEach((receiptItem, index) => {
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

    return errors;
};
