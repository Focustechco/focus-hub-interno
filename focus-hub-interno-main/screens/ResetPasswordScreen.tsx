import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LockIcon, CheckCircle2Icon, XIcon } from '../components/icons';
import api from '../services/api';

interface ResetPasswordScreenProps {
    token: string;
    onBackToLogin: () => void;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ token, onBackToLogin }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, newPassword });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao redefinir senha.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0E0E0E] flex flex-col items-center justify-center text-white p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#1C1C1C] p-8 rounded-2xl shadow-2xl w-full max-w-md text-center"
                >
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2Icon className="w-12 h-12 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-4 text-green-400">Senha Alterada!</h1>
                    <p className="text-[#B3B3B3] mb-6">
                        Sua senha foi redefinida com sucesso. Você já pode fazer login.
                    </p>
                    <button
                        onClick={onBackToLogin}
                        className="w-full bg-[#FF6B00] hover:bg-[#FF8C33] text-white font-bold py-3 rounded-lg transition-all"
                    >
                        Ir para Login
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0E0E0E] flex flex-col items-center justify-center text-white p-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <h1 className="text-5xl font-extrabold tracking-tight">
                    <span className="text-white">Focus</span><span className="text-[#FF6B00]">Hub</span>
                </h1>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#1C1C1C] p-8 rounded-2xl shadow-2xl w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                        <LockIcon className="w-6 h-6" />
                        Nova Senha
                    </h2>
                    <p className="text-[#B3B3B3]">Digite sua nova senha</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-[#B3B3B3]">Nova Senha</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full mt-1 p-3 bg-[#2E2E2E] rounded-lg border border-transparent focus:border-[#FF6B00] focus:ring-[#FF6B00] transition"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-[#B3B3B3]">Confirmar Senha</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                            className="w-full mt-1 p-3 bg-[#2E2E2E] rounded-lg border border-transparent focus:border-[#FF6B00] focus:ring-[#FF6B00] transition"
                            placeholder="Digite novamente"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <XIcon className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#FF6B00] hover:bg-[#FF8C33] text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Redefinir Senha'}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <button
                        onClick={onBackToLogin}
                        className="text-sm text-[#B3B3B3] hover:text-[#FF6B00] transition"
                    >
                        Voltar para Login
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPasswordScreen;
