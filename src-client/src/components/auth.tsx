import React, { useEffect, useState } from 'react';
import { clearAuthToken, getAuthToken, saveAuthToken } from '../storage';

interface AuthProps {
    setAuthToken: (authToken: string) => void;
}

export const Auth: React.FC<AuthProps> = (props) => {
    const [errorMessage, setErrorMessage] = useState<string>();
    const [isLoading, setIsLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');

    useEffect(() => {
        const savedAuthToken = getAuthToken();
        if (savedAuthToken) {
            setIsLoading(true);
            fetch('/api/refresh-token', {
                headers: {
                    Authorization: savedAuthToken
                },
                method: 'POST'
            })
                .then((response) => {
                    if (response.ok) {
                        response.json().then((data) => {
                            saveAuthToken(data.token);
                            props.setAuthToken(data.token);
                        });
                    } else {
                        // Saved token is invalid or expired
                        clearAuthToken();
                    }
                })
                .catch(() => {
                    // If refresh fails, user will have to re-authenticate
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, []);

    return (
        <div>
            <p>
                Username
                <input
                    disabled={isLoading}
                    onChange={(event) => setUsername(event.target.value)}
                    type="text"
                    value={username}
                />
            </p>
            <p>
                Password
                <input
                    disabled={isLoading}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    value={password}
                />
            </p>
            {isLoading && (
                <img height={32} src="/images/spinner.gif" style={{ marginLeft: 16 }} width={32} />
            )}
            <p style={{ color: 'red' }}>{errorMessage}</p>
            <button
                disabled={isLoading}
                onClick={() => {
                    setErrorMessage(undefined);
                    setIsLoading(true);

                    fetch('/api/auth', {
                        body: JSON.stringify({
                            username,
                            password
                        }),
                        headers: {
                            'content-type': 'application/json'
                        },
                        method: 'POST'
                    })
                        .then((response) => {
                            if (response.ok) {
                                response.json().then((data) => {
                                    saveAuthToken(data.token);
                                    props.setAuthToken(data.token);
                                });
                            } else {
                                response.json().then((error) => setErrorMessage(error.message));
                            }
                        })
                        .catch((error) => {
                            console.log(error);
                            setErrorMessage(error);
                        })
                        .finally(() => {
                            setIsLoading(false);
                        });
                }}
                type="button"
            >
                Send
            </button>
        </div>
    );
};
