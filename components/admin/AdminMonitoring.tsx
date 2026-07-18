import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Server, Database, Clock, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../Loading';

interface SystemStats {
    uptime: number;
    nodeVersion: string;
    memory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
    };
    database: {
        connected: boolean;
        time: string;
        version: string;
    };
    timestamp: string;
}

export default function AdminMonitoring() {
    const { addToast } = useToast();
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStats = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/admin/system');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching system stats:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar status do sistema' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600*24));
        const h = Math.floor(seconds % (3600*24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        const s = Math.floor(seconds % 60);
        
        if (d > 0) return `${d}d ${h}h ${m}m`;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        return `${m}m ${s}s`;
    };

    if (isLoading && !stats) return <div className="flex justify-center p-10"><LoadingSpinner /></div>;
    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E]">
                <div className="flex items-center gap-3">
                    <div className="bg-[#FF6B00]/10 p-2 rounded-lg">
                        <Activity className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Monitoramento do Sistema</h2>
                        <p className="text-sm text-[#B3B3B3]">Métricas em tempo real do servidor e banco de dados</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-[#B3B3B3] flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Ao vivo
                    </span>
                    <button 
                        onClick={fetchStats}
                        className="p-2 hover:bg-[#2E2E2E] rounded-lg text-[#B3B3B3] hover:text-white transition-colors"
                        title="Atualizar agora"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Server Status */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-blue-500/10 p-2.5 rounded-lg text-blue-500"><Server className="w-5 h-5" /></div>
                        <h3 className="font-bold text-white">Servidor Node.js</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-[#B3B3B3]">Status</span>
                            <span className="text-sm font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Online
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-[#2E2E2E] pt-4">
                            <span className="text-sm text-[#B3B3B3]">Uptime</span>
                            <span className="text-sm font-mono text-white flex items-center gap-2">
                                <Clock className="w-3 h-3 text-[#FF6B00]" />
                                {formatUptime(stats.uptime)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-[#2E2E2E] pt-4">
                            <span className="text-sm text-[#B3B3B3]">Versão Node</span>
                            <span className="text-sm font-mono text-white">{stats.nodeVersion}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Memory Usage */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-[#FF6B00]/10 p-2.5 rounded-lg text-[#FF6B00]"><Activity className="w-5 h-5" /></div>
                        <h3 className="font-bold text-white">Uso de Memória (RAM)</h3>
                    </div>
                    
                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-white font-medium">Heap Usado</span>
                            <span className="text-[#FF6B00] font-mono">{stats.memory.heapUsed} MB / {stats.memory.heapTotal} MB</span>
                        </div>
                        <div className="w-full bg-[#0E0E0E] rounded-full h-2">
                            <div className="bg-[#FF6B00] h-2 rounded-full" style={{ width: `${Math.min(100, (stats.memory.heapUsed / stats.memory.heapTotal) * 100)}%` }}></div>
                        </div>
                    </div>

                    <div className="space-y-3 mt-6 border-t border-[#2E2E2E] pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-[#B3B3B3]">RSS (Total do Processo)</span>
                            <span className="text-sm font-mono text-white">{stats.memory.rss} MB</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-[#B3B3B3]">Memória Externa (C++)</span>
                            <span className="text-sm font-mono text-white">{stats.memory.external} MB</span>
                        </div>
                    </div>
                </motion.div>

                {/* Database Status */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-purple-500/10 p-2.5 rounded-lg text-purple-400"><Database className="w-5 h-5" /></div>
                        <h3 className="font-bold text-white">Banco de Dados (PostgreSQL)</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-[#B3B3B3]">Status</span>
                            {stats.database.connected ? (
                                <span className="text-sm font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Conectado
                                </span>
                            ) : (
                                <span className="text-sm font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Desconectado
                                </span>
                            )}
                        </div>
                        
                        {stats.database.connected && (
                            <>
                                <div className="flex justify-between items-center border-t border-[#2E2E2E] pt-4">
                                    <span className="text-sm text-[#B3B3B3]">Latência / Sync</span>
                                    <span className="text-sm font-mono text-white flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-purple-400" />
                                        {new Date(stats.database.time).toLocaleTimeString('pt-BR')}
                                    </span>
                                </div>
                                <div className="border-t border-[#2E2E2E] pt-4">
                                    <span className="text-sm text-[#B3B3B3] block mb-1">Versão do Banco</span>
                                    <span className="text-xs font-mono text-white block bg-[#0E0E0E] p-2 rounded truncate" title={stats.database.version}>
                                        {stats.database.version}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
