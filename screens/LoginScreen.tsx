import React, { useState } from 'react';
import { User, Role } from '../types';
import { ShieldIcon, UserIcon, BriefcaseIcon, LockIcon, CheckCircle2Icon } from '../components/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

interface LoginScreenProps {
    onLogin: (user: User) => void;
    onForgotPassword?: () => void;
    users: User[]; // Kept for compatibility but not used for simulation anymore
}

const roleConfig = {
    [Role.ADMIN]: { label: 'Administração', icon: ShieldIcon },
    [Role.USER]: { label: 'Equipe Focus', icon: BriefcaseIcon },
    [Role.COLLABORATOR]: { label: 'Colaborador', icon: UserIcon }
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onForgotPassword }) => {
    const { login, register, error: authError, loading } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Form states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [sector, setSector] = useState('');
    const [jobTitle, setJobTitle] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLogin && !selectedRole) {
            // Role selection is mandatory for registration
            return;
        }

        try {
            if (isLogin) {
                await login(email, password);
                // onLogin will be triggered by the parent component observing the user state
            } else {
                const result = await register({
                    name,
                    email,
                    password,
                    role: selectedRole,
                    sector,
                    jobTitle
                });

                // Show success screen if registration is pending
                if (result?.pending) {
                    setRegistrationSuccess(true);
                    setSuccessMessage(result.message || 'Cadastro realizado! Aguarde aprovação.');
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Show success screen after registration
    if (registrationSuccess) {
        return (
            <div className="min-h-screen bg-[#0E0E0E] flex flex-col items-center justify-center text-white p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-[#1C1C1C] p-8 rounded-2xl shadow-2xl shadow-green-500/10 w-full max-w-md text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <CheckCircle2Icon className="w-12 h-12 text-green-500" />
                    </motion.div>

                    <h1 className="text-2xl font-bold mb-4 text-green-400">Cadastro Enviado!</h1>

                    <p className="text-[#B3B3B3] mb-6">
                        {successMessage}
                    </p>

                    <div className="bg-[#2E2E2E] p-4 rounded-lg mb-6">
                        <p className="text-sm text-[#B3B3B3]">
                            📧 Em breve você receberá um email confirmando sua aprovação.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setRegistrationSuccess(false);
                            setIsLogin(true);
                            // Reset form
                            setName('');
                            setEmail('');
                            setPassword('');
                            setSelectedRole(null);
                            setSector('');
                            setJobTitle('');
                        }}
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
                transition={{ duration: 0.5 }}
                className="text-center mb-8"
            >
                <h1 className="text-5xl font-extrabold tracking-tight">
                    <span className="text-white">Focus</span><span className="text-[#FF6B00]">Hub</span>
                </h1>
                <p className="text-[#B3B3B3] mt-2">Centralize suas operações e impulsione o desempenho da sua equipe.</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-[#1C1C1C] p-8 rounded-2xl shadow-2xl shadow-orange-500/10 w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
                        <LockIcon className="w-6 h-6" />
                        {isLogin ? 'Entrar no Focus Hub' : 'Criar nova conta'}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="text-sm font-medium text-[#B3B3B3]">Nome Completo</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full mt-1 p-3 bg-[#2E2E2E] rounded-lg border border-transparent focus:border-[#FF6B00] focus:ring-[#FF6B00] transition" />
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium text-[#B3B3B3]">E-mail</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full mt-1 p-3 bg-[#2E2E2E] rounded-lg border border-transparent focus:border-[#FF6B00] focus:ring-[#FF6B00] transition" />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-[#B3B3B3]">Senha</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full mt-1 p-3 bg-[#2E2E2E] rounded-lg border border-transparent focus:border-[#FF6B00] focus:ring-[#FF6B00] transition" />
                    </div>

                    {isLogin && onForgotPassword && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={onForgotPassword}
                                className="text-sm text-[#B3B3B3] hover:text-[#FF6B00] transition"
                            >
                                Esqueci minha senha
                            </button>
                        </div>
                    )}

                    {!isLogin && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-[#B3B3B3]">Setor</label>
                                    <input type="text" value={sector} onChange={e => setSector(e.target.value)} className="w-full mt-1 p-3 bg-[#2E2E2E] rounded-lg border border-transparent focus:border-[#FF6B00] focus:ring-[#FF6B00] transition" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-[#B3B3B3]">Cargo</label>
                                    <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full mt-1 p-3 bg-[#2E2E2E] rounded-lg border border-transparent focus:border-[#FF6B00] focus:ring-[#FF6B00] transition" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-[#B3B3B3] mb-2 block">Selecione sua função:</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(roleConfig) as Role[]).map(role => {
                                        const { label, icon: Icon } = roleConfig[role];
                                        const isSelected = selectedRole === role;
                                        return (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setSelectedRole(role)}
                                                className={`p-2 rounded-lg text-center font-semibold transition-all duration-300 border-2 flex flex-col items-center justify-center ${isSelected ? 'bg-[#FF6B00] border-[#FF8C33] text-white' : 'bg-[#2E2E2E] border-transparent hover:border-[#FF6B00]'}`}
                                            >
                                                <Icon className="w-5 h-5 mb-1" />
                                                <span className="text-[10px]">{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    <AnimatePresence>
                        {authError && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-400 text-center text-sm"
                            >
                                {authError}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#FF6B00] hover:bg-[#FF8C33] active:bg-[#CC5500] text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isLogin ? 'Entrando...' : 'Criando conta...'}
                            </>
                        ) : (isLogin ? 'Entrar' : 'Criar Conta')}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-[#B3B3B3] hover:text-[#FF6B00] transition">
                        {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre aqui'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginScreen;