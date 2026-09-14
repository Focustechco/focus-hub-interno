import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Smartphone, Monitor, Globe, XCircle, AlertTriangle, Key } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../Loading';

interface UserSession {
    id: string;
    userId: string;
    userName: string;
    device: string;
    browser: string;
    os: string;
    ip: string;
    location: string;
    lastActive: string;
    isCurrent: boolean;
}

// Mocked sessions for the security panel preview
// In a real scenario, these would come from a user_sessions DB table tracking JWTs or tokens
const MOCK_SESSIONS: UserSession[] = [
    {
        id: 'sess_1', userId: 'user_admin', userName: 'Admin Principal',
        device: 'Desktop', browser: 'Chrome', os: 'Windows 11',
        ip: '192.168.1.45', location: 'São Paulo, BR',
        lastActive: new Date().toISOString(), isCurrent: true
    },
    {
        id: 'sess_2', userId: 'user_admin', userName: 'Admin Principal',
        device: 'Mobile', browser: 'Safari', os: 'iOS 17',
        ip: '177.34.12.98', location: 'São Paulo, BR',
        lastActive: new Date(Date.now() - 3600000 * 2).toISOString(), isCurrent: false
    },
    {
        id: 'sess_3', userId: 'user_tech_1', userName: 'João Tech',
        device: 'Desktop', browser: 'Firefox', os: 'macOS',
        ip: '200.145.32.11', location: 'Rio de Janeiro, BR',
        lastActive: new Date(Date.now() - 3600000 * 5).toISOString(), isCurrent: false
    }
];

export default function AdminSecurity() {
    const { addToast } = useToast();
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulating an API call to /api/admin/security/sessions
        const loadSessions = async () => {
            setIsLoading(true);
            setTimeout(() => {
                setSessions(MOCK_SESSIONS);
                setIsLoading(false);
            }, 800);
        };
        loadSessions();
    }, []);

    const revokeSession = (id: string) => {
        if (!window.confirm('Forçar o logout deste dispositivo?')) return;
        setSessions(prev => prev.filter(s => s.id !== id));
        addToast({ type: 'success', title: 'Sessão revogada', message: 'O dispositivo foi desconectado com sucesso.' });
    };

    if (isLoading) return <div className="flex justify-center p-10"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E]">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/10 p-2 rounded-lg">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Painel de Segurança</h2>
                        <p className="text-sm text-[#B3B3B3]">Monitoramento de sessões, dispositivos e acessos ativos</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-[#1C1C1C] border border-[#2E2E2E] p-5 rounded-xl">
                    <div className="text-red-500 mb-2"><AlertTriangle className="w-6 h-6" /></div>
                    <h4 className="text-white font-bold text-lg mb-1">Tentativas de Login</h4>
                    <p className="text-2xl font-mono text-white">0 <span className="text-sm text-green-500 ml-2">Normais</span></p>
                    <p className="text-xs text-[#B3B3B3] mt-2">Nas últimas 24 horas</p>
                </div>
                <div className="bg-[#1C1C1C] border border-[#2E2E2E] p-5 rounded-xl">
                    <div className="text-[#FF6B00] mb-2"><Key className="w-6 h-6" /></div>
                    <h4 className="text-white font-bold text-lg mb-1">Redefinições de Senha</h4>
                    <p className="text-2xl font-mono text-white">2</p>
                    <p className="text-xs text-[#B3B3B3] mt-2">Nesta semana</p>
                </div>
                <div className="bg-[#1C1C1C] border border-[#2E2E2E] p-5 rounded-xl">
                    <div className="text-blue-500 mb-2"><Monitor className="w-6 h-6" /></div>
                    <h4 className="text-white font-bold text-lg mb-1">Dispositivos Ativos</h4>
                    <p className="text-2xl font-mono text-white">{sessions.length}</p>
                    <p className="text-xs text-[#B3B3B3] mt-2">Conectados agora</p>
                </div>
            </div>

            <div className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] overflow-hidden">
                <div className="p-4 border-b border-[#2E2E2E] flex justify-between items-center">
                    <h3 className="font-bold text-white">Sessões Ativas</h3>
                    <button 
                        onClick={() => {
                            if(window.confirm('Isto irá desconectar TODOS os usuários de TODOS os dispositivos. Continuar?')) {
                                setSessions([]);
                                addToast({ type: 'success', title: 'Logout em Massa', message: 'Todas as sessões foram encerradas.' });
                            }
                        }}
                        className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5"
                    >
                        <XCircle className="w-3.5 h-3.5" /> Forçar Logout Global
                    </button>
                </div>
                
                <div className="divide-y divide-[#2E2E2E]">
                    {sessions.length === 0 ? (
                        <div className="p-8 text-center text-[#B3B3B3]">Nenhuma sessão ativa encontrada.</div>
                    ) : (
                        sessions.map(session => (
                            <motion.div key={session.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 hover:bg-[#2E2E2E]/30 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div className="flex gap-4">
                                    <div className="bg-[#0E0E0E] p-3 rounded-xl border border-[#2E2E2E] h-fit">
                                        {session.device === 'Mobile' ? (
                                            <Smartphone className="w-6 h-6 text-[#B3B3B3]" />
                                        ) : (
                                            <Monitor className="w-6 h-6 text-[#B3B3B3]" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-white">{session.userName}</span>
                                            {session.isCurrent && (
                                                <span className="bg-green-500/10 text-green-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Sessão Atual</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-[#B3B3B3]">
                                            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {session.browser} no {session.os}</span>
                                            <span className="text-gray-600">•</span>
                                            <span>{session.location}</span>
                                        </div>
                                        <div className="text-xs font-mono text-gray-500 mt-1">IP: {session.ip}</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between md:justify-end md:flex-col gap-2">
                                    <div className="text-xs text-[#B3B3B3]">
                                        Última ativ: <span className="text-white">{new Date(session.lastActive).toLocaleTimeString()}</span>
                                    </div>
                                    {!session.isCurrent && (
                                        <button 
                                            onClick={() => revokeSession(session.id)}
                                            className="text-xs bg-[#2E2E2E] hover:bg-red-500/20 hover:text-red-500 text-[#B3B3B3] px-3 py-1.5 rounded-lg transition-colors font-medium"
                                        >
                                            Revogar Acesso
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
