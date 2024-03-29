import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

export const config = {
    DB_DATABASE: process.env.DB_DATABASE,
    DB_HOST: process.env.DB_HOST,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_PORT: 3306,
    DB_SOCKET_PATH: process.env.DB_SOCKET_PATH,
    DB_USER: process.env.DB_USER,
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    FIREBASE_FUNCTIONS_URL: process.env.FIREBASE_FUNCTIONS_URL,
    FIREBASE_SERVICE_ACCOUNT: require(join(
        __dirname,
        '..',
        '..',
        process.env.FIREBASE_SERVICE_ACCOUNT_FILE!
    )),
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    JWT_SECRET: process.env.JWT_SECRET || 'Any string will do',
    MASTER_USER: process.env.MASTER_USER,
    MASTER_PASSWORD: process.env.MASTER_PASSWORD
};
