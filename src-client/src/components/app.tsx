import React, { useState } from 'react';
import { BrowserRouter, Link, Redirect, Route, Switch } from 'react-router-dom';
import { clearAuthToken } from '../storage';
import { Auth } from './auth';
import { FirebaseStats } from './firebase-stats';
import { ReceiptDetails } from './receipt-details';
import { Receipts } from './receipts';

export const App: React.FC = () => {
    const [authToken, setAuthToken] = useState<string>();

    return authToken ? (
        <BrowserRouter>
            <nav>
                <Link to="/receipt-details" className="navbar-link">
                    Create receipt
                </Link>
                <Link to="/receipts" className="navbar-link">
                    Receipts
                </Link>
                <Link to="/firebase-stats" className="navbar-link">
                    Firebase stats
                </Link>
                <button
                    onClick={() => {
                        clearAuthToken();
                        setAuthToken(undefined);
                    }}
                >
                    Sign out
                </button>
            </nav>

            <Switch>
                <Route path="/receipt-details">
                    <ReceiptDetails authToken={authToken} />
                </Route>
                <Route path="/firebase-stats">
                    <FirebaseStats authToken={authToken} />
                </Route>
                <Route path="/receipts">
                    <Receipts authToken={authToken} />
                </Route>
                <Redirect exact from="/" to="/receipt-details" />
            </Switch>
        </BrowserRouter>
    ) : (
        <Auth setAuthToken={setAuthToken} />
    );
};
