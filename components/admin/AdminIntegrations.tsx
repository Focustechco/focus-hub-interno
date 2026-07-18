import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link2, CheckCircle2, XCircle, Calendar, MessageSquare, Smartphone, Bell, Settings2, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../Loading';
import DiscordAdminPanel from '../../components/DiscordAdminPanel';

interface IntegrationStatus {
    id: string;
    name: string;
    description: string;
    status: 'connected' | 'disconnected' | 'error';
    details?: string;
    lastSync?: string;
    connectedAt?: string;
}

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 48 48" {...props}>
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
        <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
);

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 127.14 96.36" {...props}>
        <path fill="#5865F2" d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83a97.68 97.68 0 0 0-29.08 0A72.37 72.37 0 0 0 45.67 0a105.89 105.89 0 0 0-26.23 8.09C2.04 33.84-2.4 58.85.92 83.46a105.73 105.73 0 0 0 32.14 16.15a77.7 77.7 0 0 0 6.89-11.1a68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19a77 77 0 0 0 6.89 11.1a105.25 105.25 0 0 0 32.19-16.15c4.01-32.03-4.18-56.12-19.25-75.4zM42.79 65.43c-5.96 0-10.89-5.45-10.89-12.18s4.83-12.19 10.89-12.19c6.12 0 11.02 5.53 10.88 12.19c0 6.73-4.82 12.18-10.88 12.18zm41.54 0c-5.96 0-10.89-5.45-10.89-12.18s4.83-12.19 10.89-12.19c6.12 0 11.02 5.53 10.88 12.19c0 6.73-4.84 12.18-10.88 12.18z"/>
    </svg>
);

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" {...props}>
        <path fill="#25D366" d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.85-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18l-3.12.82l.83-3.04l-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24c2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81c-.23-.08-.39-.12-.56.12c-.17.25-.64.81-.78.97c-.14.17-.29.19-.54.06c-.25-.12-1.05-.39-1.99-1.23c-.74-.66-1.23-1.47-1.38-1.72c-.14-.25-.02-.38.11-.51c.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31c-.22.25-.86.85-.86 2.07c0 1.22.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74c.59.26 1.05.41 1.41.52c.59.19 1.13.16 1.56.1c.48-.07 1.47-.6 1.67-1.18c.21-.58.21-1.07.14-1.18s-.22-.16-.47-.28z"/>
    </svg>
);

const ICONS: Record<string, React.ElementType> = {
    google: GoogleIcon,
    discord: DiscordIcon,
    whatsapp: WhatsAppIcon,
    push: Bell
};

export default function AdminIntegrations() {
    const { addToast } = useToast();
    const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStatuses = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/admin/integrations/status');
            setIntegrations(response.data);
        } catch (error) {
            console.error('Error fetching integration statuses:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar status das integrações' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatuses();
    }, []);

    if (isLoading) return <div className="flex justify-center p-10"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E]">
                <div className="flex items-center gap-3">
                    <div className="bg-[#FF6B00]/10 p-2 rounded-lg">
                        <Link2 className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Central de Integrações</h2>
                        <p className="text-sm text-[#B3B3B3]">Gerencie as conexões externas da plataforma</p>
                    </div>
                </div>
                <button 
                    onClick={fetchStatuses}
                    className="flex items-center gap-2 bg-[#2E2E2E] hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar Status
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {integrations.map((integ, index) => {
                    const Icon = ICONS[integ.id] || Link2;
                    const isConnected = integ.status === 'connected';
                    
                    return (
                        <motion.div
                            key={integ.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-6 relative overflow-hidden"
                        >
                            {/* Decorative background glow based on status */}
                            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-10 blur-3xl ${
                                isConnected ? 'bg-green-500' : integ.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                            }`} />

                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl ${
                                        isConnected ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'bg-[#2E2E2E] text-gray-500'
                                    }`}>
                                        <Icon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{integ.name}</h3>
                                        <p className="text-sm text-[#B3B3B3]">{integ.description}</p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                                    isConnected 
                                        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                                        : integ.status === 'error'
                                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                                }`}>
                                    {isConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    {isConnected ? 'Conectado' : integ.status === 'error' ? 'Erro' : 'Desconectado'}
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-[#2E2E2E] relative z-10">
                                <div className="grid grid-cols-2 gap-4">
                                    {integ.details && (
                                        <div>
                                            <p className="text-xs text-[#B3B3B3] mb-1">Detalhes</p>
                                            <p className="text-sm text-white truncate" title={integ.details}>
                                                {integ.details}
                                            </p>
                                        </div>
                                    )}
                                    {integ.lastSync && (
                                        <div>
                                            <p className="text-xs text-[#B3B3B3] mb-1">Última Sincronização</p>
                                            <p className="text-sm text-white">
                                                {new Date(integ.lastSync).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-6 flex gap-2">
                                    <button className="flex-1 bg-[#2E2E2E] hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2">
                                        <Settings2 className="w-4 h-4" />
                                        Configurar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Configuração de Webhook do Discord (movido de Ferramentas de Foco) */}
            <DiscordWebhookConfig />
        </div>
    );
}

const DiscordWebhookConfig: React.FC = () => {
    const { addToast } = useToast();
    const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('focushub_discord_webhook') || '');
    const [selectedEvents, setSelectedEvents] = useState<string[]>(() => {
        const saved = localStorage.getItem('focushub_discord_events');
        return saved ? JSON.parse(saved) : ['task.created', 'task.completed'];
    });
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

    const events = [
        { id: 'task.created', label: '📋 Nova Tarefa', desc: 'Quando uma tarefa é criada' },
        { id: 'task.completed', label: '✅ Tarefa Concluída', desc: 'Quando uma tarefa é marcada como concluída' },
        { id: 'task.overdue', label: '⚠️ Tarefa Atrasada', desc: 'Quando uma tarefa passa do prazo' },
        { id: 'user.checkin', label: '👋 Check-in', desc: 'Quando alguém registra entrada' },
        { id: 'user.checkout', label: '🚪 Check-out', desc: 'Quando alguém registra saída' },
        { id: 'post.created', label: '📝 Nova Publicação', desc: 'Quando um post é criado no mural' },
    ];

    const handleSave = () => {
        localStorage.setItem('focushub_discord_webhook', webhookUrl);
        localStorage.setItem('focushub_discord_events', JSON.stringify(selectedEvents));
        setTestResult(null);
        addToast({ type: 'success', title: 'Sucesso', message: 'Configurações salvas!' });
    };

    const handleToggleEvent = (eventId: string) => {
        setSelectedEvents(prev =>
            prev.includes(eventId)
                ? prev.filter(e => e !== eventId)
                : [...prev, eventId]
        );
    };

    const handleTest = async () => {
        if (!webhookUrl) return;
        setIsTesting(true);
        setTestResult(null);

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: '🔔 Teste de Integração',
                        description: 'Webhook do Focus Hub configurado com sucesso!',
                        color: 0xFF6B00,
                        footer: { text: 'Focus Hub' },
                        timestamp: new Date().toISOString()
                    }]
                })
            });
            setTestResult(response.ok ? 'success' : 'error');
        } catch {
            setTestResult('error');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-6 mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center text-white">
                <MessageSquare className="w-6 h-6 mr-3 text-[#5865F2]" />
                Webhook do Discord
            </h2>
            <p className="text-sm text-[#B3B3B3] mb-6">
                Configure um webhook para receber notificações automáticas do Focus Hub diretamente no seu servidor do Discord.
            </p>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-[#B3B3B3] mb-2">URL do Webhook</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="url"
                            value={webhookUrl}
                            onChange={e => setWebhookUrl(e.target.value)}
                            placeholder="https://discord.com/api/webhooks/..."
                            className="flex-grow p-3 bg-[#0E0E0E] rounded-lg border border-[#2E2E2E] focus:ring-1 focus:ring-[#5865F2] outline-none text-white transition-colors"
                        />
                        <button
                            onClick={handleTest}
                            disabled={!webhookUrl || isTesting}
                            className="px-6 py-3 bg-[#2E2E2E] text-white rounded-lg hover:bg-[#3E3E3E] disabled:opacity-50 transition-colors flex items-center justify-center font-medium min-w-[120px]"
                        >
                            {isTesting ? 'Testando...' : 'Testar'}
                        </button>
                    </div>
                    {testResult === 'success' && (
                        <p className="text-green-500 text-sm mt-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Webhook funcionando! Verifique seu Discord.</p>
                    )}
                    {testResult === 'error' && (
                        <p className="text-red-500 text-sm mt-2 flex items-center gap-1"><XCircle className="w-4 h-4" /> Erro ao enviar. Verifique a URL do webhook.</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-[#B3B3B3] mb-3">Eventos a Notificar</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {events.map(event => (
                            <label key={event.id} className={`flex items-start p-4 rounded-xl border cursor-pointer transition-all ${selectedEvents.includes(event.id) ? 'bg-[#5865F2]/10 border-[#5865F2]/50' : 'bg-[#0E0E0E] border-[#2E2E2E] hover:border-[#3E3E3E]'}`}>
                                <input
                                    type="checkbox"
                                    checked={selectedEvents.includes(event.id)}
                                    onChange={() => handleToggleEvent(event.id)}
                                    className="mt-1"
                                />
                                <div className="ml-3">
                                    <div className="text-sm font-bold text-white">{event.label}</div>
                                    <div className="text-xs text-[#B3B3B3] mt-1">{event.desc}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-[#2E2E2E]">
                    <button onClick={handleSave} className="px-6 py-2.5 bg-[#FF6B00] text-white rounded-lg hover:bg-[#FF8C33] transition-colors font-bold shadow-lg shadow-[#FF6B00]/20">
                        Salvar Configurações
                    </button>
                </div>
            </div>
        </div>
    );
};

const GoogleCalendarSection: React.FC = () => {
    const { addToast } = useToast();
    const [isConnected, setIsConnected] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkGoogleStatus();
        // Check for OAuth callback
        const params = new URLSearchParams(window.location.search);
        if (params.get('google_connected') === 'true') {
            addToast({ type: 'success', title: 'Sucesso', message: 'Google Calendar conectado com sucesso!' });
            window.history.replaceState({}, '', window.location.pathname);
            setIsConnected(true);
            setIsConfigured(true);
        }
        if (params.get('google_error')) {
            addToast({ type: 'error', title: 'Erro', message: 'Erro ao conectar Google Calendar' });
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const checkGoogleStatus = async () => {
        try {
            const { data } = await api.get('/google/status');
            setIsConnected(data.connected);
            setIsConfigured(data.configured);
        } catch (error) {
            console.error('Error checking Google status:', error);
            // If connection fails, keep isConfigured as false (default)
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const { data } = await api.get('/google/auth-url');

            if (data.error) {
                addToast({ type: 'error', title: 'Erro', message: data.message || 'Google Calendar não configurado' });
                return;
            }

            window.location.href = data.authUrl;
        } catch (error) {
            addToast({ type: 'error', title: 'Erro', message: 'Erro ao conectar com Google' });
        }
    };

    const handleDisconnect = async () => {
        try {
            await api.delete('/google/disconnect');
            setIsConnected(false);
            addToast({ type: 'success', title: 'Sucesso', message: 'Desconectado do Google Calendar' });
        } catch (error) {
            addToast({ type: 'error', title: 'Erro', message: 'Erro ao desconectar' });
        }
    };

    return (
        <div className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-6 mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center text-white">
                <svg className="w-6 h-6 mr-3 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
                </svg>
                Google Calendar
            </h2>

            {isLoading ? (
                <div className="text-[#B3B3B3]">Verificando conexão...</div>
            ) : !isConfigured ? (
                <div className="bg-[#0E0E0E] p-4 rounded-lg border border-yellow-500/20">
                    <p className="text-yellow-500 font-medium mb-2 flex items-center gap-2">⚠️ Configuração Pendente</p>
                    <p className="text-[#B3B3B3] text-sm">
                        O administrador precisa configurar as credenciais do Google Cloud Console para habilitar esta integração.
                        Verifique também se a variável VITE_API_URL está correta no backend/Vercel.
                    </p>
                </div>
            ) : isConnected ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">Conectado ao Google Calendar</span>
                    </div>
                    <button
                        onClick={handleDisconnect}
                        className="px-6 py-2.5 bg-[#2E2E2E] text-white rounded-lg hover:bg-red-500/20 hover:text-red-500 transition-colors font-medium border border-[#3E3E3E] hover:border-red-500/50"
                    >
                        Desconectar
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-[#B3B3B3]">
                        Conecte a conta Google oficial da empresa para sincronizar agendas e eventos.
                    </p>
                    <button
                        onClick={handleConnect}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#4285F4] text-white rounded-lg hover:bg-[#3367D6] transition-colors font-medium"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                        </svg>
                        Conectar Google Calendar
                    </button>
                </div>
            )}
        </div>
    );
};

const WhatsAppIntegrationSection: React.FC = () => {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('LOADING');
    const [loading, setLoading] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [stats, setStats] = useState<{ sentToday: number; sentThisWeek: number; connectedUsers: number } | null>(null);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/whatsapp/status');
            setStatus(res.data.status);
            if (res.data.status === 'WAITING_FOR_SCAN' || res.data.status === 'DISCONNECTED') {
                fetchQr();
            }
        } catch (error) {
            console.error('Failed to fetch status', error);
            setStatus('ERROR');
        }
    };

    const fetchQr = async () => {
        try {
            const res = await api.get('/whatsapp/qr');
            if (res.data.qr) {
                setQrCode(res.data.qr);
            }
        } catch (error) {
            console.error('Failed to fetch QR', error);
        }
    };

    useEffect(() => {
        fetchStatus();
        fetchStats();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/whatsapp/stats');
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const handleSendTest = async () => {
        if (!testPhone) return alert('Digite um número');
        setLoading(true);
        try {
            await api.post('/whatsapp/send', {
                to: testPhone,
                message: '🔔 Teste de Integração Focus Hub: Seu WhatsApp está conectado com sucesso!'
            });
            alert('Mensagem enviada com sucesso!');
        } catch (error) {
            alert('Falha ao enviar mensagem');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-6 mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center text-white">
                <svg className="w-6 h-6 mr-3 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp Bot (Evolution API)
            </h2>

            <div className="bg-[#0E0E0E] p-6 rounded-xl border border-[#2E2E2E]">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <p className="text-white font-medium mb-2">Status da Conexão</p>
                        <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold shadow-sm ${status === 'CONNECTED' ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30' :
                            status === 'WAITING_FOR_SCAN' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                                'bg-red-500/20 text-red-500 border border-red-500/30'
                            }`}>
                            {status === 'CONNECTED' ? '● CONECTADO' :
                                status === 'WAITING_FOR_SCAN' ? '● AGUARDANDO LEITURA DO QR' :
                                    `● DESCONECTADO (${status})`}
                        </div>
                        <p className="text-sm text-[#B3B3B3] mt-3">
                            {status === 'CONNECTED'
                                ? 'O bot do sistema está ativo e pronto para enviar mensagens e alertas para a equipe.'
                                : 'Escaneie o QR Code com o celular oficial da empresa para conectar o WhatsApp do sistema.'}
                        </p>
                        {stats?.error && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
                                <strong>Erro:</strong> {stats.error}
                            </div>
                        )}
                    </div>

                    {status !== 'CONNECTED' && (
                        <div className="flex flex-col items-center">
                            {qrCode ? (
                                <div className="bg-white p-3 rounded-xl shadow-lg">
                                    <img src={qrCode} alt="WhatsApp QR Code" className="w-40 h-40 object-contain" />
                                </div>
                            ) : (
                                <div className="w-40 h-40 flex flex-col items-center justify-center bg-[#1C1C1C] rounded-xl border border-[#3E3E3E]">
                                    <LoadingSpinner />
                                    <span className="text-xs text-[#B3B3B3] mt-2">Carregando QR...</span>
                                </div>
                            )}
                            <p className="text-xs text-[#B3B3B3] mt-3 text-center">Abra o WhatsApp &gt; Aparelhos Conectados</p>
                        </div>
                    )}
                </div>

                {status === 'CONNECTED' && (
                    <div className="mt-8 pt-6 border-t border-[#2E2E2E]">
                        <h3 className="text-sm font-semibold text-white mb-3">Testar Envio Manual</h3>
                        <div className="flex gap-3 max-w-md">
                            <input
                                type="text"
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                                placeholder="5511999999999"
                                className="flex-1 bg-[#1C1C1C] border border-[#3E3E3E] rounded-lg text-white px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#25D366] focus:border-[#25D366] outline-none transition-colors"
                            />
                            <button
                                onClick={handleSendTest}
                                disabled={loading || !testPhone}
                                className="bg-[#25D366] hover:bg-[#128C7E] text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {loading ? '...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            {
                status === 'CONNECTED' && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-[#0E0E0E] border border-[#2E2E2E] p-5 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[#B3B3B3] uppercase tracking-wider font-semibold mb-1">Enviadas Hoje</p>
                                <p className="text-3xl font-bold text-[#25D366]">{stats.sentToday}</p>
                            </div>
                            <div className="bg-[#25D366]/10 p-3 rounded-lg">
                                <MessageSquare className="w-6 h-6 text-[#25D366]" />
                            </div>
                        </div>
                        <div className="bg-[#0E0E0E] border border-[#2E2E2E] p-5 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[#B3B3B3] uppercase tracking-wider font-semibold mb-1">Esta Semana</p>
                                <p className="text-3xl font-bold text-[#FF6B00]">{stats.sentThisWeek}</p>
                            </div>
                            <div className="bg-[#FF6B00]/10 p-3 rounded-lg">
                                <Activity className="w-6 h-6 text-[#FF6B00]" />
                            </div>
                        </div>
                        <div className="bg-[#0E0E0E] border border-[#2E2E2E] p-5 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[#B3B3B3] uppercase tracking-wider font-semibold mb-1">Total de Usuários</p>
                                <p className="text-3xl font-bold text-[#34A853]">{stats.connectedUsers}</p>
                            </div>
                            <div className="bg-[#34A853]/10 p-3 rounded-lg">
                                <Users className="w-6 h-6 text-[#34A853]" />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Commands Reference */}
            <div className="bg-[#0E0E0E] border border-[#2E2E2E] p-5 rounded-xl mt-6">
                <p className="font-bold text-white mb-3 flex items-center">
                    <Bot className="w-5 h-5 mr-2 text-[#25D366]" /> 
                    Comandos Disponíveis do Chatbot
                </p>
                <p className="text-sm text-[#B3B3B3] mb-4">A equipe pode enviar os seguintes comandos para o número do bot para interagir com a plataforma:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    <div className="bg-[#1C1C1C] p-3 rounded-lg border border-[#2E2E2E] flex items-center justify-between">
                        <code className="text-[#25D366] font-bold">!tarefas</code>
                        <span className="text-[#B3B3B3] text-xs">Lista tarefas pendentes</span>
                    </div>
                    <div className="bg-[#1C1C1C] p-3 rounded-lg border border-[#2E2E2E] flex items-center justify-between">
                        <code className="text-[#25D366] font-bold">!hoje</code>
                        <span className="text-[#B3B3B3] text-xs">Tarefas do dia</span>
                    </div>
                    <div className="bg-[#1C1C1C] p-3 rounded-lg border border-[#2E2E2E] flex items-center justify-between">
                        <code className="text-[#25D366] font-bold">!concluir ID</code>
                        <span className="text-[#B3B3B3] text-xs">Conclui uma tarefa</span>
                    </div>
                    <div className="bg-[#1C1C1C] p-3 rounded-lg border border-[#2E2E2E] flex items-center justify-between">
                        <code className="text-[#25D366] font-bold">!entrada</code>
                        <span className="text-[#B3B3B3] text-xs">Registra check-in</span>
                    </div>
                    <div className="bg-[#1C1C1C] p-3 rounded-lg border border-[#2E2E2E] flex items-center justify-between">
                        <code className="text-[#25D366] font-bold">!saida</code>
                        <span className="text-[#B3B3B3] text-xs">Registra check-out</span>
                    </div>
                    <div className="bg-[#1C1C1C] p-3 rounded-lg border border-[#2E2E2E] flex items-center justify-between">
                        <code className="text-[#25D366] font-bold">!status</code>
                        <span className="text-[#B3B3B3] text-xs">Resumo diário</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
