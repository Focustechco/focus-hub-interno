import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextData {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    register: (userData: any) => Promise<void>;
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

    const register = async (userData: any): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/auth/register', userData);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setUser(user);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
            throw err;
        } finally {
            setLoading(false);
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
