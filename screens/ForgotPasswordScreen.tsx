import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SendIcon, CheckCircle2Icon, ChevronLeftIcon } from '../components/icons';
import api from '../services/api';

interface ForgotPasswordScreenProps {
    onBackToLogin: () => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBackToLogin }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await api.post('/auth/forgot-password', { email });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao enviar email.');
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
                    <h1 className="text-2xl font-bold mb-4 text-green-400">Email Enviado!</h1>
                    <p className="text-[#B3B3B3] mb-6">
                        Se o email existir em nossa base, você receberá instruções para redefinir sua senha.
                    </p>
                    <div className="bg-[#2E2E2E] p-4 rounded-lg mb-6">
                        <p className="text-sm text-[#B3B3B3]">
                            📧 Verifique sua caixa de entrada e spam.
                        </p>
                    </div>
                    <button
                        onClick={onBackToLogin}
                        className="w-full bg-[#FF6B00] hover:bg-[#FF8C33] text-white font-bold py-3 rounded-lg transition-all"
                    >
                        Voltar para Login
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
                        <SendIcon className="w-6 h-6" />
                        Esqueci minha senha
                    </h2>
                    <p className="text-[#B3B3B3]">Digite seu email para recuperar o acesso</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-[#B3B3B3]">E-mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full mt-1 p-3 bg-[#2E2E2E] rounded-lg border border-transparent focus:border-[#FF6B00] focus:ring-[#FF6B00] transition"
                            placeholder="seu@email.com"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#FF6B00] hover:bg-[#FF8C33] text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                    >
                        {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <button
                        onClick={onBackToLogin}
                        className="text-sm text-[#B3B3B3] hover:text-[#FF6B00] transition flex items-center justify-center gap-1 mx-auto"
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                        Voltar para Login
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPasswordScreen;
