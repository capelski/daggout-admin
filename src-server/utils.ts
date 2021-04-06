import mysql2 from 'mysql2';
import { config } from './config';

export const getDbConnection = () =>
    mysql2.createConnection({
        host: config.DB_SOCKET_PATH ? undefined : config.DB_HOST,
        port: config.DB_SOCKET_PATH ? undefined : 3306,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_DATABASE,
        socketPath: config.DB_SOCKET_PATH
    });

export const isJsonString = (input: string) => {
    try {
        const parsed = JSON.parse(input);
        return typeof parsed === 'object';
    } catch (error) {
        return false;
    }
};

export const jsDateToMySqlDate = (milliseconds: number) =>
    new Date(milliseconds).toISOString().slice(0, 19).replace('T', ' ');

export const parseReceiptDates = (receipt: any) => {
    receipt.notificationDate = new Date(receipt.notificationDate).getTime();
    receipt.purchaseDate = new Date(receipt.purchaseDate).getTime();
    return receipt;
};
