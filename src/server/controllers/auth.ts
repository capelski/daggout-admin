import express from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { config } from '../config';
import { JwtToken } from '../types/jwt-token';

export const authHandler: express.Handler = (req, res, _next) => {
    const body = req.body;

    if (!body.username) {
        return res.status(400).json({ message: 'Missing username' });
    } else if (!body.password) {
        return res.status(400).json({ message: 'Missing password' });
    } else if (body.username !== config.MASTER_USER || body.password !== config.MASTER_PASSWORD) {
        return res.status(400).json({ message: 'Bad username or password' });
    } else {
        return res.json({
            token: signJsonWebToken({ username: body.username }, config.JWT_SECRET)
        });
    }
};

export const authMiddleware: express.Handler = (req, res, next) => {
    const authorizationToken = req.headers.authorization;
    if (!authorizationToken) {
        return res.status(401).json({ message: 'Authorization token required' });
    }

    return verifyJsonWebToken(authorizationToken, config.JWT_SECRET)
        .then(() => next())
        .catch(() => res.status(401).json({ message: 'Invalid authorization token' }));
};

export const refreshTokenHandler: express.Handler = (req, res, _next) => {
    const authorizationToken = req.headers.authorization!;

    return verifyJsonWebToken(authorizationToken, config.JWT_SECRET).then((token) =>
        res.json({
            token: signJsonWebToken({ username: token.username }, config.JWT_SECRET)
        })
    );
};

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
