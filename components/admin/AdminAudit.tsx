import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, Search, Filter, Calendar, Clock, User, Shield, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../Loading';

interface AuditLog {
    id: number;
    user_id: string;
    user_name: string;
    action: string;
    resource_type: string;
    resource_id: string;
    details: any;
    ip_address: string;
    created_at: string;
}

export default function AdminAudit() {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    
    // Pagination and Filters
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [actionFilter, setActionFilter] = useState('');
    const [resourceFilter, setResourceFilter] = useState('');
    
    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter, resourceFilter]);

    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/admin/audit', {
                params: { page, limit, action: actionFilter, resourceType: resourceFilter }
            });
            setLogs(response.data.logs || []);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar logs de auditoria' });
        } finally {
            setIsLoading(false);
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E]">
                <div className="flex items-center gap-3">
                    <div className="bg-[#FF6B00]/10 p-2 rounded-lg">
                        <ScrollText className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Logs de Auditoria</h2>
                        <p className="text-sm text-[#B3B3B3]">Rastreie todas as ações críticas realizadas no sistema</p>
                    </div>
                </div>
            </div>

            <div className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-4 flex gap-4">
                <div className="flex-1">
                    <select
                        value={actionFilter}
                        onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                        className="w-full bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-[#FF6B00] outline-none"
                    >
                        <option value="">Todas as Ações</option>
                        <option value="UPDATE_STATUS">Alteração de Status</option>
                        <option value="RESET_PASSWORD">Redefinição de Senha</option>
                        <option value="MASS_COMMUNICATION">Comunicação em Massa</option>
                        <option value="CREATE">Criação</option>
                        <option value="UPDATE">Atualização</option>
                        <option value="DELETE">Exclusão</option>
                    </select>
                </div>
                <div className="flex-1">
                    <select
                        value={resourceFilter}
                        onChange={e => { setResourceFilter(e.target.value); setPage(1); }}
                        className="w-full bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-[#FF6B00] outline-none"
                    >
                        <option value="">Todos os Módulos</option>
                        <option value="user">Usuários</option>
                        <option value="system">Sistema / Admin</option>
                        <option value="task">Tarefas</option>
                        <option value="goal">Metas</option>
                    </select>
                </div>
            </div>

            <div className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-[#B3B3B3]">
                        <thead className="bg-[#0E0E0E] text-xs uppercase font-semibold border-b border-[#2E2E2E]">
                            <tr>
                                <th className="px-6 py-4">Data / Hora</th>
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4">Ação</th>
                                <th className="px-6 py-4">Módulo</th>
                                <th className="px-6 py-4">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2E2E2E]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <LoadingSpinner />
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[#B3B3B3]">
                                        Nenhum log encontrado para os filtros selecionados.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <motion.tr 
                                        key={log.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-[#2E2E2E]/30"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>{new Date(log.created_at).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs mt-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{new Date(log.created_at).toLocaleTimeString('pt-BR')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 font-medium text-white">
                                                <User className="w-4 h-4 text-[#FF6B00]" />
                                                {log.user_name || 'Desconhecido'}
                                            </div>
                                            {log.ip_address && <div className="text-xs font-mono mt-1">{log.ip_address}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#2E2E2E] text-white">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 uppercase text-xs tracking-wider font-semibold">
                                            {log.resource_type}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs overflow-hidden text-xs font-mono bg-[#0E0E0E] p-2 rounded border border-[#2E2E2E] truncate" title={JSON.stringify(log.details)}>
                                                {JSON.stringify(log.details)}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-[#0E0E0E] border-t border-[#2E2E2E] p-4 flex items-center justify-between">
                        <div className="text-sm text-[#B3B3B3]">
                            Mostrando <span className="font-medium text-white">{(page - 1) * limit + 1}</span> até <span className="font-medium text-white">{Math.min(page * limit, total)}</span> de <span className="font-medium text-white">{total}</span> registros
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                                className="p-2 rounded-lg bg-[#1C1C1C] border border-[#2E2E2E] text-white disabled:opacity-50 hover:bg-[#2E2E2E]"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || isLoading}
                                className="p-2 rounded-lg bg-[#1C1C1C] border border-[#2E2E2E] text-white disabled:opacity-50 hover:bg-[#2E2E2E]"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
