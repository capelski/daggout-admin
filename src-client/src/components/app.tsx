import React, { useState } from 'react';
import { BrowserRouter, Link, Redirect, Route, Switch } from 'react-router-dom';
import { AddReceipt } from './add-receipt';
import { Auth } from './auth';
import { FirebaseStats } from './firebase-stats';
import { Receipts } from './receipts';

export const App: React.FC = () => {
    const [authToken, setAuthToken] = useState<string>();

    return authToken ? (
        <BrowserRouter>
            <nav>
                <Link to="/add-receipt" className="navbar-link">
                    Add receipt
                </Link>
                <Link to="/receipts" className="navbar-link">
                    Receipts
                </Link>
                <Link to="/firebase-stats" className="navbar-link">
                    Firebase stats
                </Link>
            </nav>

            <Switch>
                <Route path="/add-receipt">
                    <AddReceipt authToken={authToken} />
                </Route>
                <Route path="/firebase-stats">
                    <FirebaseStats authToken={authToken} />
                </Route>
                <Route path="/receipts">
                    <Receipts authToken={authToken} />
                </Route>
                <Redirect exact from="/" to="/add-receipt" />
            </Switch>
        </BrowserRouter>
    ) : (
        <Auth setAuthToken={setAuthToken} />
    );
};
