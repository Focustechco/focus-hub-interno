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
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const response = await api.get('/auth/me');
            setUser(response.data);
        } catch (err) {
            console.error('Auth check failed:', err);
            localStorage.removeItem('token');
            setUser(null);
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
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setUser(user);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
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
            const { token, user } = response.data;
            if (token && user) {
                localStorage.setItem('token', token);
                setUser(user);
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
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, logout, register, checkAuth, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};
