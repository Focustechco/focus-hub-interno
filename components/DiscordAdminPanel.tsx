import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from './Toast';

const DiscordAdminPanel: React.FC = () => {
    const toast = useToast();
    const [botToken, setBotToken] = useState('');
    const [serverId, setServerId] = useState('');
    const [status, setStatus] = useState<any>({ connected: false });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/discord/status');
            setStatus(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/discord/config', { botToken, serverId });
            if (res.data.success) {
                toast.success('Discord conectado com sucesso!');
                fetchStatus();
            } else {
                toast.error('Falha ao conectar: ' + res.data.message);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao conectar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#1C1C1C] p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center text-[#5865F2]">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 127.14 96.36" fill="currentColor">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.1,53,91,65.69,84.69,65.69Z" />
                </svg>
                Integração com Discord Corporativo
            </h2>

            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                    <form onSubmit={handleConnect} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Bot Token</label>
                            <input 
                                type="password" 
                                value={botToken}
                                onChange={e => setBotToken(e.target.value)}
                                placeholder="Coloque o token do bot..."
                                className="w-full bg-[#2E2E2E] text-white rounded-lg py-2 px-4 focus:ring-1 focus:ring-[#5865F2]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Server ID (Guild ID)</label>
                            <input 
                                type="text" 
                                value={serverId}
                                onChange={e => setServerId(e.target.value)}
                                placeholder="ID do servidor..."
                                className="w-full bg-[#2E2E2E] text-white rounded-lg py-2 px-4 focus:ring-1 focus:ring-[#5865F2]"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading || !botToken || !serverId}
                            className="bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg w-full transition-colors"
                        >
                            {loading ? 'Conectando...' : 'Conectar Bot'}
                        </button>
                    </form>
                </div>
                
                <div className="flex-1 bg-[#2E2E2E] p-4 rounded-lg border border-[#3E3E3E]">
                    <h3 className="text-lg font-semibold mb-3">Status da Conexão</h3>
                    {status.connected ? (
                        <div className="space-y-2">
                            <p className="flex items-center text-green-400">
                                <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                                Conectado Ativamente
                            </p>
                            <p className="text-sm text-[#B3B3B3]"><strong className="text-white">Bot:</strong> {status.botName}</p>
                            <p className="text-sm text-[#B3B3B3]"><strong className="text-white">Servidor:</strong> {status.serverName}</p>
                            <p className="text-sm text-[#B3B3B3]"><strong className="text-white">Membros no Servidor:</strong> {status.memberCount}</p>
                        </div>
                    ) : (
                        <div className="space-y-2 text-[#B3B3B3]">
                            <p className="flex items-center text-red-400">
                                <span className="w-3 h-3 bg-red-400 rounded-full mr-2"></span>
                                Desconectado
                            </p>
                            {status.error && <p className="text-xs text-red-400 mt-2">Erro: {status.error}</p>}
                            <p className="text-sm mt-4">Conecte o bot usando as credenciais ao lado para ativar o Chat Interno.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiscordAdminPanel;
