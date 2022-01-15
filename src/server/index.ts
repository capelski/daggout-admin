import express from 'express';
import multer from 'multer';
import { join } from 'path';
import { authHandler, authMiddleware, refreshTokenHandler } from './controllers/auth';
import { firebaseStatsHandler } from './controllers/firebase';
import {
    createReceiptHandler,
    getReceiptByIdHandler,
    getReceiptsHandler,
    getUserReceiptsHandler
} from './controllers/receipts';

const app = express();
const port = process.env.PORT || 3000;

const multerMiddleware = multer({
    storage: multer.memoryStorage()
});

app.use('/daggout-admin', express.static(join(__dirname, '..', '..', 'docs')));

app.post('/api/auth', express.json(), authHandler);

app.post('/api/refresh-token', authMiddleware, refreshTokenHandler);

app.get('/api/user-receipts', getUserReceiptsHandler());

app.get('/api/firebase-stats', authMiddleware, firebaseStatsHandler);

app.get('/api/receipts', authMiddleware, getReceiptsHandler);

app.get('/api/receipts/:id', authMiddleware, getReceiptByIdHandler);

app.post(
    '/api/receipts',
    authMiddleware,
    express.urlencoded({ extended: true }),
    multerMiddleware.single('picture'),
    createReceiptHandler
);

// For development purposes only

app.get('/development/api/user-receipts', getUserReceiptsHandler('daggout_development'));

app.use((_req, res, _next) => {
    // Redirect any non-existing route to index.html
    res.sendFile(join(__dirname, '..', '..', 'docs', 'index.html'));
});

app.listen(port, () => {
    console.info('App listening at port', port);
});
