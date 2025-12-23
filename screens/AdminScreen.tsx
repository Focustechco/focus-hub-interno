import React, { useState, useMemo, useEffect } from 'react';
import { User, Role, Task, CheckIn } from '../types';
import { ShieldIcon, UserIcon, ClipboardIcon, FileTextIcon, SearchIcon, CheckCircle2Icon, XIcon } from '../components/icons';
import ProfileModal from '../components/ProfileModal';
import api from '../services/api';

interface AdminScreenProps {
    currentUser: User;
    users: User[];
    tasks: Task[];
    checkIns: CheckIn[];
    onUpdateUser: (user: User) => void;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ currentUser, users, tasks, checkIns, onUpdateUser }) => {
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [reportSearchTerm, setReportSearchTerm] = useState('');

    // Estados para aprovação de usuários
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [approvingUser, setApprovingUser] = useState<string | null>(null);

    // Buscar usuários pendentes ao carregar
    useEffect(() => {
        if (currentUser.role === Role.ADMIN) {
            fetchPendingUsers();
        }
    }, [currentUser.role]);

    const fetchPendingUsers = async () => {
        setLoadingPending(true);
        try {
            const response = await api.get('/auth/pending');
            setPendingUsers(response.data);
        } catch (error) {
            console.error('Erro ao buscar usuários pendentes:', error);
        } finally {
            setLoadingPending(false);
        }
    };

    const handleApproveUser = async (userId: string, approved: boolean) => {
        setApprovingUser(userId);
        try {
            await api.put(`/auth/approve/${userId}`, { approved });
            // Remover da lista local
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Erro ao processar aprovação:', error);
        } finally {
            setApprovingUser(null);
        }
    };

    const handleOpenProfileModal = (user: User) => {
        setSelectedUser(user);
        setIsProfileModalOpen(true);
    };

    const handleCloseProfileModal = () => {
        setSelectedUser(null);
        setIsProfileModalOpen(false);
    };

    if (currentUser.role !== Role.ADMIN) {
        return (
            <div className="text-center p-8">
                <h1 className="text-2xl font-bold text-red-500">Acesso Negado</h1>
                <p className="text-gray-400">Você não tem permissão para acessar esta página.</p>
            </div>
        );
    }

    const totalTasks = (tasks || []).length;
    const pendingTasks = (tasks || []).filter(t => t.status === 'pendente').length;
    const completedTasks = (tasks || []).filter(t => t.status === 'concluida').length;

    const dailyReports = checkIns
        .filter(c => c.dailyReport)
        .sort((a, b) => new Date(b.checkOutTime!).getTime() - new Date(a.checkOutTime!).getTime());

    const filteredDailyReports = useMemo(() => {
        if (!reportSearchTerm.trim()) {
            return dailyReports;
        }
        const searchTermLower = reportSearchTerm.toLowerCase();
        return dailyReports.filter(report => {
            const user = users.find(u => u.id === report.userId);
            return user ? user.name.toLowerCase().includes(searchTermLower) : false;
        });
    }, [dailyReports, reportSearchTerm, users]);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Painel do Administrador</h1>
            <p className="text-[#B3B3B3] mb-8">Visão geral do sistema e gerenciamento de usuários.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#1C1C1C] p-6 rounded-lg shadow-md flex items-start">
                    <div className="bg-blue-500/20 p-3 rounded-full mr-4">
                        <UserIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Usuários Totais</h3>
                        <p className="text-3xl font-bold mt-1">{(users || []).length}</p>
                    </div>
                </div>
                <div className="bg-[#1C1C1C] p-6 rounded-lg shadow-md flex items-start">
                    <div className="bg-[#FF6B00]/20 p-3 rounded-full mr-4">
                        <ClipboardIcon className="w-6 h-6 text-[#FF6B00]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Tarefas Totais</h3>
                        <p className="text-3xl font-bold mt-1">{totalTasks}</p>
                        <p className="text-sm text-[#B3B3B3] mt-1">{pendingTasks} pendentes, {completedTasks} concluídas.</p>
                    </div>
                </div>
            </div>

            {/* Seção de Aprovação de Usuários Pendentes */}
            {pendingUsers.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 p-6 rounded-lg shadow-md mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center text-yellow-400">
                        <ShieldIcon className="w-5 h-5 mr-2" />
                        🔔 Solicitações Pendentes de Aprovação ({pendingUsers.length})
                    </h2>
                    <div className="space-y-4">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="bg-[#1C1C1C] p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                                        alt={user.name}
                                        className="w-12 h-12 rounded-full border-2 border-yellow-500/50"
                                    />
                                    <div>
                                        <p className="font-semibold text-white">{user.name}</p>
                                        <p className="text-sm text-[#B3B3B3]">{user.email}</p>
                                        <div className="flex gap-4 mt-1 text-xs text-[#B3B3B3]">
                                            <span>📁 {user.sector || 'Setor não informado'}</span>
                                            <span>💼 {user.job_title || 'Cargo não informado'}</span>
                                        </div>
                                        <p className="text-xs text-[#B3B3B3] mt-1">
                                            📅 Solicitado em: {user.join_date ? new Date(user.join_date).toLocaleDateString('pt-BR') : 'Data não disponível'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleApproveUser(user.id, true)}
                                        disabled={approvingUser === user.id}
                                        className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                                    >
                                        {approvingUser === user.id ? (
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                        ) : (
                                            <CheckCircle2Icon className="w-4 h-4" />
                                        )}
                                        Aprovar
                                    </button>
                                    <button
                                        onClick={() => handleApproveUser(user.id, false)}
                                        disabled={approvingUser === user.id}
                                        className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                                    >
                                        <XIcon className="w-4 h-4" />
                                        Rejeitar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loadingPending && (
                <div className="bg-[#1C1C1C] p-6 rounded-lg shadow-md mb-8 flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 mr-3 text-[#FF6B00]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Carregando solicitações pendentes...</span>
                </div>
            )}
            <div className="bg-[#1C1C1C] p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Lista de Usuários</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#2E2E2E]">
                                <th className="p-3">Nome</th>
                                <th className="p-3">Setor</th>
                                <th className="p-3">Cargo</th>
                                <th className="p-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b border-[#2E2E2E] hover:bg-[#2a2a2a]">
                                    <td className="p-3 flex items-center">
                                        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                                        {user.name}
                                    </td>
                                    <td className="p-3">{user.sector}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs rounded-full font-semibold flex items-center w-fit ${user.role === Role.ADMIN ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-300'
                                            }`}>
                                            {user.role === Role.ADMIN ? <ShieldIcon className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <button onClick={() => handleOpenProfileModal(user)} className="text-sm text-[#FF6B00] hover:underline">Editar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 bg-[#1C1C1C] p-6 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold flex items-center">
                        <FileTextIcon className="w-5 h-5 mr-2" /> 📋 Relatórios da Equipe
                    </h2>
                    <div className="relative w-full sm:max-w-xs">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B3B3B3]" />
                        <input
                            type="text"
                            placeholder="Buscar por usuário..."
                            value={reportSearchTerm}
                            onChange={(e) => setReportSearchTerm(e.target.value)}
                            className="w-full bg-[#2E2E2E] text-white rounded-lg py-2 pl-10 pr-4 focus:ring-1 focus:ring-[#FF6B00] border border-transparent focus:border-[#FF6B00]"
                        />
                    </div>
                </div>
                {(filteredDailyReports || []).length > 0 ? (
                    <div className="space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                        {filteredDailyReports.map(report => {
                            const user = users.find(u => u.id === report.userId);
                            if (!user) return null;
                            return (
                                <div key={report.id} className="p-4 bg-[#2E2E2E] rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center">
                                            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                                            <div>
                                                <p className="font-semibold text-white">{user.name}</p>
                                                <p className="text-xs text-[#B3B3B3]">{user.sector}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-[#B3B3B3]">
                                            {new Date(report.checkOutTime!).toLocaleString()}
                                        </p>
                                    </div>
                                    <p className="text-sm text-white/90 whitespace-pre-wrap bg-[#1c1c1c] p-3 rounded-md">{report.dailyReport}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-[#B3B3B3] py-8">
                        {(dailyReports || []).length > 0 ? 'Nenhum relatório encontrado para a sua busca.' : 'Nenhum relatório diário foi publicado ainda.'}
                    </p>
                )}
            </div>
            {selectedUser && (
                <ProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={handleCloseProfileModal}
                    userToEdit={selectedUser}
                    onSave={onUpdateUser}
                    currentUserRole={currentUser.role}
                />
            )}
        </div>
    );
};

export default AdminScreen;