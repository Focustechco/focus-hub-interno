import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DatabaseBackup, Download, History, Play, AlertCircle, Database, CheckCircle2 } from 'lucide-react';
import { useToast } from '../Toast';

interface BackupRecord {
    id: string;
    date: string;
    size: string;
    type: 'Automático' | 'Manual';
    status: 'Concluído' | 'Falha';
}

const MOCK_BACKUPS: BackupRecord[] = [
    { id: 'bkp_1', date: new Date().toISOString(), size: '45.2 MB', type: 'Automático', status: 'Concluído' },
    { id: 'bkp_2', date: new Date(Date.now() - 86400000).toISOString(), size: '44.8 MB', type: 'Automático', status: 'Concluído' },
    { id: 'bkp_3', date: new Date(Date.now() - 86400000 * 2).toISOString(), size: '44.1 MB', type: 'Manual', status: 'Concluído' },
    { id: 'bkp_4', date: new Date(Date.now() - 86400000 * 3).toISOString(), size: '0 MB', type: 'Automático', status: 'Falha' },
];

export default function AdminBackup() {
    const { addToast } = useToast();
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backups, setBackups] = useState<BackupRecord[]>(MOCK_BACKUPS);

    const handleNewBackup = () => {
        setIsBackingUp(true);
        addToast({ type: 'success', title: 'Backup Iniciado', message: 'Gerando dump do banco de dados e arquivos...' });
        
        setTimeout(() => {
            const newBackup: BackupRecord = {
                id: `bkp_${Date.now()}`,
                date: new Date().toISOString(),
                size: '45.5 MB',
                type: 'Manual',
                status: 'Concluído'
            };
            setBackups([newBackup, ...backups]);
            setIsBackingUp(false);
            addToast({ type: 'success', title: 'Backup Concluído', message: 'O arquivo está pronto para download.' });
        }, 3000);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E]">
                <div className="flex items-center gap-3">
                    <div className="bg-[#FF6B00]/10 p-2 rounded-lg">
                        <DatabaseBackup className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Backup e Restauração</h2>
                        <p className="text-sm text-[#B3B3B3]">Gerencie cópias de segurança do banco de dados e arquivos</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Actions Panel */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-6 text-center">
                        <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Database className="w-8 h-8 text-[#FF6B00]" />
                        </div>
                        <h3 className="font-bold text-white text-lg mb-2">Novo Backup Manual</h3>
                        <p className="text-sm text-[#B3B3B3] mb-6">
                            Gera um arquivo .sql com todo o conteúdo atual do banco de dados.
                        </p>
                        <button
                            onClick={handleNewBackup}
                            disabled={isBackingUp}
                            className="w-full flex justify-center items-center gap-2 bg-[#FF6B00] hover:bg-[#FF8C33] text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                        >
                            {isBackingUp ? (
                                <span className="animate-spin text-xl">⏳</span>
                            ) : (
                                <Play className="w-5 h-5" />
                            )}
                            {isBackingUp ? 'Gerando Backup...' : 'Iniciar Backup Agora'}
                        </button>
                    </div>

                    <div className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-5">
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-[#FF6B00]" /> Informações
                        </h4>
                        <ul className="space-y-3 text-sm text-[#B3B3B3]">
                            <li className="flex justify-between border-b border-[#2E2E2E] pb-2">
                                <span>Rotina Automática</span>
                                <span className="text-white">Diária às 03:00</span>
                            </li>
                            <li className="flex justify-between border-b border-[#2E2E2E] pb-2">
                                <span>Retenção</span>
                                <span className="text-white">Últimos 30 dias</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Tamanho Estimado</span>
                                <span className="text-white">~45 MB</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* History Panel */}
                <div className="md:col-span-2 bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[#2E2E2E] flex items-center gap-2">
                        <History className="w-5 h-5 text-[#B3B3B3]" />
                        <h3 className="font-bold text-white">Histórico de Backups</h3>
                    </div>
                    
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm text-[#B3B3B3]">
                            <thead className="bg-[#0E0E0E] text-xs uppercase font-semibold border-b border-[#2E2E2E]">
                                <tr>
                                    <th className="px-6 py-4">Data e Hora</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Tamanho</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2E2E2E]">
                                {backups.map((bkp, index) => (
                                    <motion.tr 
                                        key={bkp.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="hover:bg-[#2E2E2E]/30"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="text-white font-medium">
                                                {new Date(bkp.date).toLocaleString('pt-BR')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                bkp.type === 'Automático' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                                            }`}>
                                                {bkp.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{bkp.size}</td>
                                        <td className="px-6 py-4">
                                            {bkp.status === 'Concluído' ? (
                                                <span className="flex items-center gap-1.5 text-green-500">
                                                    <CheckCircle2 className="w-4 h-4" /> Concluído
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-red-500">
                                                    <AlertCircle className="w-4 h-4" /> Falha
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                disabled={bkp.status !== 'Concluído'}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2E2E2E] hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded transition-colors text-xs font-bold uppercase tracking-wider"
                                            >
                                                <Download className="w-3.5 h-3.5" /> Baixar
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
