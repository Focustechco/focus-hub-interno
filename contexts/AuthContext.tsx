import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextData {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    register: (userData: any) => Promise<{ pending?: boolean; message?: string }>;
    checkAuth: () => Promise<void>;
    updateUser: (updatedUser: User) => void;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const rawUser = localStorage.getItem('user') || localStorage.getItem('currentUser');
            const token = localStorage.getItem('token');
            if (rawUser && token) {
                return JSON.parse(rawUser);
            }
        } catch (e) {
            console.warn('[AuthProvider] Failed to parse initial stored user:', e);
        }
        return null;
    });

    const [loading, setLoading] = useState<boolean>(() => {
        // If we already have a cached user and token, don't block the UI with full-screen loading
        if (typeof window === 'undefined') return true;
        const hasToken = !!localStorage.getItem('token');
        const hasUser = !!(localStorage.getItem('user') || localStorage.getItem('currentUser'));
        return hasToken && !hasUser;
    });

    const [error, setError] = useState<string | null>(null);

    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const response = await api.get('/auth/me');
            if (response?.data) {
                setUser(response.data);
                localStorage.setItem('user', JSON.stringify(response.data));
                localStorage.setItem('currentUser', JSON.stringify(response.data));
            }
        } catch (err: any) {
            console.warn('[Auth] Verification failed during checkAuth:', err);
            
            // Only force logout if the server explicitly returned 401 Unauthorized (expired/invalid JWT)
            if (err.response?.status === 401) {
                console.warn('[Auth] Server returned 401 Unauthorized - clearing expired session');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('currentUser');
                setUser(null);
            } else {
                // For network glitches, offline mode, server cold starts, 500s or timeouts:
                // PRESERVE the cached user session so F5 / reload does NOT log out the user!
                console.log('[Auth] Keeping cached user session despite network/server issue');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (email: string, password: string): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user: loggedUser } = response.data;
            if (token) {
                localStorage.setItem('token', token);
            }
            if (loggedUser) {
                localStorage.setItem('user', JSON.stringify(loggedUser));
                localStorage.setItem('currentUser', JSON.stringify(loggedUser));
                setUser(loggedUser);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        setUser(null);
    };

    const register = async (userData: any): Promise<{ pending?: boolean; message?: string }> => {
        setLoading(true);
        setError(null);
        try {
            console.log('[Auth] Sending registration request...');
            const response = await api.post('/auth/register', userData);
            console.log('[Auth] Registration response:', response.data);

            // Check if registration is pending approval
            if (response.data.pending) {
                setLoading(false);
                return { pending: true, message: response.data.message };
            }

            // Auto-login if registration is immediate (legacy behavior)
            const { token, user: registeredUser } = response.data;
            if (token && registeredUser) {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(registeredUser));
                localStorage.setItem('currentUser', JSON.stringify(registeredUser));
                setUser(registeredUser);
            }

            setLoading(false);
            return { pending: false };
        } catch (err: any) {
            console.error('[Auth] Registration error:', err);
            setError(err.response?.data?.message || 'Registration failed');
            setLoading(false);
            throw err;
        }
    };

    // Update current user (for profile updates)
    const updateUser = (updatedUser: User) => {
        if (user && user.id === updatedUser.id) {
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, logout, register, checkAuth, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};
