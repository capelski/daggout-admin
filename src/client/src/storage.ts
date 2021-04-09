const authTokenKey = 'authToken';

export const clearAuthToken = () => localStorage.removeItem(authTokenKey);

export const getAuthToken = () => localStorage.getItem(authTokenKey);

export const saveAuthToken = (authToken: string) => localStorage.setItem(authTokenKey, authToken);
