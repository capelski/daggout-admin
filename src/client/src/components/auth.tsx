import React, { useEffect, useState } from 'react';
import { getAuthToken, saveAuthToken } from '../storage';

interface AuthProps {
    setAuthToken: (authToken: string) => void;
}

const mockToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImZ1dHVyZSIsImlhdCI6MTYzMTg3ODMxOCwiZXhwIjoxNjMxODg5MTE4fQ.UfTW_I3Zulav4RoWrJsZFHGJhQlDrLIejTuj25d3ibk';

export const Auth: React.FC<AuthProps> = (props) => {
    const [errorMessage, setErrorMessage] = useState<string>();
    const [isLoading, setIsLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');

    useEffect(() => {
        const savedAuthToken = getAuthToken();
        if (savedAuthToken) {
            props.setAuthToken(savedAuthToken);

            // setIsLoading(true);
            // fetch('/api/refresh-token', {
            //     headers: {
            //         Authorization: savedAuthToken
            //     },
            //     method: 'POST'
            // })
            //     .then((response) => {
            //         if (response.ok) {
            //             response.json().then((data) => {
            //                 saveAuthToken(data.token);
            //                 props.setAuthToken(data.token);
            //             });
            //         } else {
            //             // Saved token is invalid or expired
            //             clearAuthToken();
            //         }
            //     })
            //     .catch(() => {
            //         // If refresh fails, user will have to re-authenticate
            //         clearAuthToken();
            //     })
            //     .finally(() => {
            //         setIsLoading(false);
            //     });
        }
    }, []);

    return (
        <div>
            <h1>Daggout admin</h1>
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
                <img
                    height={32}
                    src="/daggout-admin/images/spinner.gif"
                    style={{ marginLeft: 16 }}
                    width={32}
                />
            )}
            <p style={{ color: 'red' }}>{errorMessage}</p>
            <button
                disabled={isLoading}
                onClick={() => {
                    setErrorMessage(undefined);
                    setIsLoading(true);

                    if (!username) {
                        setErrorMessage('Username is missing');
                        setIsLoading(false);
                    } else if (!password) {
                        setErrorMessage('Password is missing');
                        setIsLoading(false);
                    } else {
                        setTimeout(() => {
                            saveAuthToken(mockToken);
                            props.setAuthToken(mockToken);
                            setIsLoading(false);
                        }, 1000);
                    }

                    // fetch('/api/auth', {
                    //     body: JSON.stringify({
                    //         username,
                    //         password
                    //     }),
                    //     headers: {
                    //         'content-type': 'application/json'
                    //     },
                    //     method: 'POST'
                    // })
                    //     .then((response) => {
                    //         if (response.ok) {
                    //             response.json().then((data) => {
                    //                 saveAuthToken(data.token);
                    //                 props.setAuthToken(data.token);
                    //             });
                    //         } else {
                    //             response.json().then((error) => setErrorMessage(error.message));
                    //         }
                    //     })
                    //     .catch((error) => {
                    //         console.log(error);
                    //         setErrorMessage(error);
                    //     })
                    //     .finally(() => {
                    //         setIsLoading(false);
                    //     });
                }}
                type="button"
            >
                Send
            </button>
        </div>
    );
};
