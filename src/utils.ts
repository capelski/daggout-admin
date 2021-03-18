import jsonwebtoken from 'jsonwebtoken';
import mysql2 from 'mysql2';
import { config } from './config';
import { JwtToken } from './types/jwt-token';

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

export const signJsonWebToken = (rawToken: JwtToken, secret: string) =>
    jsonwebtoken.sign(rawToken, secret, { expiresIn: '3h' });

export const verifyJsonWebToken = (encodedToken: string, secret: string): Promise<JwtToken> => {
    return new Promise((resolve, reject) => {
        jsonwebtoken.verify(encodedToken, secret, undefined, (error, decodedToken) => {
            if (error) {
                reject(error);
            } else {
                resolve(decodedToken as JwtToken);
            }
        });
    });
};
