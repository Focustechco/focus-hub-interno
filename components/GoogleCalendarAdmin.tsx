import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { GoogleCorporateIntegration } from '../types';
import { SettingsIcon, RefreshCwIcon, LogOutIcon, CheckCircle2Icon, XCircleIcon } from './icons';
import { LoadingSpinner } from './Loading';

export const GoogleCalendarAdmin: React.FC = () => {
    const [integration, setIntegration] = useState<GoogleCorporateIntegration | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/google/status');
            if (res.data.connected) {
                setIntegration(res.data.integration);
            } else {
                setIntegration(null);
            }
        } catch (err) {
            setError('Erro ao buscar status da integração.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleConnect = async () => {
        try {
            const res = await api.get('/google/auth-url');
            window.location.href = res.data.url;
        } catch (err) {
            setError('Erro ao gerar link de conexão.');
        }
    };

    const handleDisconnect = async () => {
        if (window.confirm('Tem certeza que deseja remover a integração corporativa do Google Calendar? Todos os eventos sincronizados serão removidos da visualização.')) {
            try {
                setLoading(true);
                await api.delete('/google/disconnect');
                setIntegration(null);
            } catch (err) {
                setError('Erro ao desconectar.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleForceSync = async () => {
        try {
            setSyncing(true);
            const res = await api.post('/google/sync');
            alert(`Sincronização concluída: ${res.data.eventsSynced} eventos atualizados.`);
            await fetchStatus();
        } catch (err) {
            setError('Erro na sincronização manual.');
        } finally {
            setSyncing(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="bg-[#1C1C1C] rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-[#FF6B00]" />
                Google Calendar Corporativo
            </h2>

            {error && (
                <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5" />
                    {error}
                </div>
            )}

            {!integration ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-4">
                        <CalendarIcon className="w-8 h-8 text-[#B3B3B3]" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Conta não conectada</h3>
                    <p className="text-[#B3B3B3] mb-6 max-w-md mx-auto text-sm">
                        Conecte a conta Google corporativa da empresa. Todos os colaboradores verão a mesma agenda sincronizada, funcionando como a fonte oficial de compromissos da equipe.
                    </p>
                    <button 
                        onClick={handleConnect}
                        className="bg-[#FF6B00] hover:bg-[#FF8C33] text-white px-6 py-2 rounded-lg font-semibold transition"
                    >
                        Conectar Google Calendar
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-[#2E2E2E] p-4 rounded-lg">
                        {integration.google_avatar_url ? (
                            <img src={integration.google_avatar_url} alt={integration.google_name} className="w-12 h-12 rounded-full" />
                        ) : (
                            <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">?</div>
                        )}
                        <div className="flex-1">
                            <p className="font-bold">{integration.google_name}</p>
                            <p className="text-sm text-[#B3B3B3]">{integration.google_email}</p>
                        </div>
                        <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1 rounded-full text-sm font-semibold">
                            <CheckCircle2Icon className="w-4 h-4" />
                            Conectado
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#2E2E2E] p-4 rounded-lg">
                            <p className="text-sm text-[#B3B3B3] mb-1">Status da Sincronização</p>
                            <p className="font-semibold capitalize">{integration.sync_status === 'success' ? 'Sincronizado' : integration.sync_status}</p>
                        </div>
                        <div className="bg-[#2E2E2E] p-4 rounded-lg">
                            <p className="text-sm text-[#B3B3B3] mb-1">Eventos Sincronizados</p>
                            <p className="font-semibold">{integration.events_count}</p>
                        </div>
                        <div className="bg-[#2E2E2E] p-4 rounded-lg">
                            <p className="text-sm text-[#B3B3B3] mb-1">Última Sincronização</p>
                            <p className="font-semibold">
                                {integration.last_sync_at ? new Date(integration.last_sync_at).toLocaleString() : 'Nunca'}
                            </p>
                        </div>
                        <div className="bg-[#2E2E2E] p-4 rounded-lg">
                            <p className="text-sm text-[#B3B3B3] mb-1">Intervalo Automático</p>
                            <p className="font-semibold">{integration.sync_interval_minutes} minutos</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-[#2E2E2E]">
                        <button 
                            onClick={handleForceSync}
                            disabled={syncing}
                            className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF8C33] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                        >
                            <RefreshCwIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                        </button>
                        
                        <button 
                            onClick={handleDisconnect}
                            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-semibold transition ml-auto"
                        >
                            <LogOutIcon className="w-4 h-4" />
                            Desconectar Conta
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Also define CalendarIcon if not exported in icons.tsx, we can reuse any existing
const CalendarIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);
