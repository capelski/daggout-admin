import React, { useState } from 'react';

interface AuthProps {
    setAuthToken: (authToken: string) => void;
}

export const Auth: React.FC<AuthProps> = (props) => {
    const [errorMessage, setErrorMessage] = useState<string>();
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');

    return (
        <div>
            <p>
                Username
                <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                />
            </p>
            <p>
                Password
                <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                />
            </p>
            <p style={{ color: 'red' }}>{errorMessage}</p>
            <button
                type="button"
                onClick={() => {
                    setErrorMessage(undefined);

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
                                response.json().then((data) => props.setAuthToken(data.token));
                            } else {
                                response.json().then((error) => setErrorMessage(error.message));
                            }
                        })
                        .catch((error) => {
                            console.log(error);
                            setErrorMessage(error);
                        });
                }}
            >
                Send
            </button>
        </div>
    );
};
