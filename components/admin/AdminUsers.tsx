import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Filter, Plus, MoreVertical, Shield, User as UserLucide, 
    Edit, Ban, Lock, Unlock, Key, Trash2, Mail, ChevronDown 
} from 'lucide-react';
import { User, Role } from '../../types';
import api from '../../services/api';
import { useToast } from '../Toast';
import ProfileModal from '../ProfileModal';
import { LoadingSpinner } from '../Loading';

interface AdminUsersProps {
    currentUser: User;
    users: User[];
    onUpdateUser: (user: User) => void;
    onDeleteUser: (userId: string) => void;
    onCreateUser: (user: Partial<User>) => Promise<void>;
}

interface ExpandedUser extends User {
    task_count?: number;
    completed_tasks?: number;
    goal_count?: number;
    post_count?: number;
    last_checkin?: string;
    status: 'active' | 'archived' | 'suspended' | 'blocked';
    avatar_url?: string;
    job_title?: string;
}

export default function AdminUsers({ currentUser, users: propUsers, onUpdateUser, onDeleteUser, onCreateUser }: AdminUsersProps) {
    const { addToast } = useToast();
    const [expandedUsers, setExpandedUsers] = useState<ExpandedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    
    // Modals
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Create User State
    const [newUser, setNewUser] = useState<Partial<User>>({
        name: '',
        email: '',
        role: Role.USER,
        sector: 'Administração',
        jobTitle: '',
        bio: '',
        password: ''
    });
    const [isCreating, setIsCreating] = useState(false);
    
    // Password Reset
    const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        fetchExpandedUsers();
    }, []);

    const fetchExpandedUsers = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/admin/users');
            setExpandedUsers(response.data);
        } catch (error) {
            console.error('Error fetching expanded users:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar dados dos usuários' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (userId: string, newStatus: string) => {
        try {
            await api.put(`/admin/users/${userId}/status`, { status: newStatus });
            setExpandedUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus as any } : u));
            addToast({ type: 'success', title: 'Sucesso', message: 'Status do usuário atualizado' });
        } catch (error) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao atualizar status' });
        }
        setActionMenuOpenId(null);
    };

    const handleResetPassword = async () => {
        if (!resetPasswordUserId || newPassword.length < 6) {
            addToast({ type: 'error', title: 'Erro', message: 'A senha deve ter no mínimo 6 caracteres' });
            return;
        }

        try {
            await api.post(`/admin/users/${resetPasswordUserId}/reset-password`, { newPassword });
            addToast({ type: 'success', title: 'Sucesso', message: 'Senha redefinida com sucesso' });
            setResetPasswordUserId(null);
            setNewPassword('');
        } catch (error) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao redefinir senha' });
        }
    };

    const handleDelete = async (userId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este usuário permanentemente?')) {
            onDeleteUser(userId);
            setExpandedUsers(prev => prev.filter(u => u.id !== userId));
            setActionMenuOpenId(null);
        }
    };

    const handleCreateUserSubmit = async () => {
        if (!newUser.name || !newUser.email || !newUser.password) {
            addToast({ type: 'error', title: 'Erro', message: 'Nome, e-mail e senha são obrigatórios' });
            return;
        }
        try {
            setIsCreating(true);
            await onCreateUser(newUser);
            setIsCreateModalOpen(false);
            setNewUser({ name: '', email: '', role: Role.USER, sector: 'Administração', jobTitle: '', bio: '', password: '' });
            fetchExpandedUsers(); // Refresh the list
        } catch (error) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao criar usuário. O e-mail pode já estar em uso.' });
        } finally {
            setIsCreating(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return expandedUsers.filter(u => {
            const matchesSearch = (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                                  (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            const matchesRole = filterRole === 'ALL' || u.role === filterRole;
            const matchesStatus = filterStatus === 'ALL' || (u.status || 'active') === filterStatus;
            
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [expandedUsers, searchTerm, filterRole, filterStatus]);

    const stats = useMemo(() => {
        return {
            total: expandedUsers.length,
            active: expandedUsers.filter(u => !u.status || u.status === 'active').length,
            admins: expandedUsers.filter(u => u.role === Role.ADMIN).length,
            suspended: expandedUsers.filter(u => u.status === 'suspended' || u.status === 'blocked').length
        };
    }, [expandedUsers]);

    // Close action menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActionMenuOpenId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total de Usuários', value: stats.total, color: 'text-blue-500' },
                    { label: 'Ativos', value: stats.active, color: 'text-green-500' },
                    { label: 'Administradores', value: stats.admins, color: 'text-[#FF6B00]' },
                    { label: 'Suspensos/Bloqueados', value: stats.suspended, color: 'text-red-500' },
                ].map((stat, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E]"
                    >
                        <p className="text-sm text-[#B3B3B3]">{stat.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E]">
                <div className="flex flex-1 gap-4">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3B3B3]" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg py-2 pl-9 pr-4 text-white text-sm focus:ring-1 focus:ring-[#FF6B00] outline-none"
                        />
                    </div>
                    
                    <select 
                        value={filterRole} 
                        onChange={e => setFilterRole(e.target.value)}
                        className="bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    >
                        <option value="ALL">Todos os Cargos</option>
                        <option value={Role.ADMIN}>Administradores</option>
                        <option value={Role.USER}>Usuários</option>
                        <option value={Role.COLLABORATOR}>Colaboradores</option>
                    </select>

                    <select 
                        value={filterStatus} 
                        onChange={e => setFilterStatus(e.target.value)}
                        className="bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    >
                        <option value="ALL">Todos os Status</option>
                        <option value="active">Ativos</option>
                        <option value="archived">Arquivados</option>
                        <option value="suspended">Suspensos</option>
                        <option value="blocked">Bloqueados</option>
                    </select>
                </div>
                
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF8C33] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Novo Usuário
                </button>
            </div>

            {/* Table */}
            <div className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-[#B3B3B3]">
                        <thead className="bg-[#0E0E0E] text-xs uppercase font-semibold border-b border-[#2E2E2E]">
                            <tr>
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Setor / Cargo</th>
                                <th className="px-6 py-4">Tarefas</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Último Acesso</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredUsers.map((user, index) => (
                                    <motion.tr 
                                        key={user.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="border-b border-[#2E2E2E] hover:bg-[#2E2E2E]/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    src={(user.avatarUrl || user.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=FF6B00&color=fff`} 
                                                    alt={user.name} 
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                                <div>
                                                    <div className="font-medium text-white">{user.name}</div>
                                                    <div className="text-xs">{(user.jobTitle || user.job_title) || 'Sem cargo'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{user.email || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span>{user.sector || '-'}</span>
                                                {user.role === Role.ADMIN && (
                                                    <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                                                        <Shield className="w-3 h-3" /> Admin
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-full bg-[#0E0E0E] rounded-full h-1.5 max-w-[60px]">
                                                    <div 
                                                        className="bg-[#FF6B00] h-1.5 rounded-full" 
                                                        style={{ width: `${Math.min(100, ((user.completed_tasks || 0) / Math.max(1, (user.task_count || 1))) * 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs">{user.completed_tasks || 0}/{user.task_count || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {(!user.status || user.status === 'active') && <span className="text-green-500 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Ativo</span>}
                                            {user.status === 'archived' && <span className="text-yellow-500 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> Arquivado</span>}
                                            {user.status === 'suspended' && <span className="text-red-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> Suspenso</span>}
                                            {user.status === 'blocked' && <span className="text-red-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-600"></div> Bloqueado</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.last_checkin ? new Date(user.last_checkin).toLocaleDateString('pt-BR') : 'Nunca'}
                                        </td>
                                        <td className="px-6 py-4 text-center relative">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActionMenuOpenId(actionMenuOpenId === user.id ? null : user.id);
                                                }}
                                                className="p-2 hover:bg-[#2E2E2E] rounded-lg transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {/* Action Dropdown Menu */}
                                            <AnimatePresence>
                                                {actionMenuOpenId === user.id && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="absolute right-8 top-10 w-48 bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl shadow-xl z-10 py-2 overflow-hidden text-left"
                                                    >
                                                        <button 
                                                            onClick={() => { setEditingUser(user); setActionMenuOpenId(null); }}
                                                            className="w-full px-4 py-2 text-sm text-[#B3B3B3] hover:text-white hover:bg-[#2E2E2E] flex items-center gap-2"
                                                        >
                                                            <Edit className="w-4 h-4" /> Editar Perfil
                                                        </button>
                                                        
                                                        {(!user.status || user.status === 'active') ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleStatusChange(user.id, 'suspended')}
                                                                    className="w-full px-4 py-2 text-sm text-yellow-500 hover:bg-[#2E2E2E] flex items-center gap-2"
                                                                >
                                                                    <Ban className="w-4 h-4" /> Suspender
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleStatusChange(user.id, 'blocked')}
                                                                    className="w-full px-4 py-2 text-sm text-red-500 hover:bg-[#2E2E2E] flex items-center gap-2"
                                                                >
                                                                    <Lock className="w-4 h-4" /> Bloquear
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleStatusChange(user.id, 'active')}
                                                                className="w-full px-4 py-2 text-sm text-green-500 hover:bg-[#2E2E2E] flex items-center gap-2"
                                                            >
                                                                <Unlock className="w-4 h-4" /> Restaurar Acesso
                                                            </button>
                                                        )}

                                                        <button 
                                                            onClick={() => { setResetPasswordUserId(user.id); setActionMenuOpenId(null); }}
                                                            className="w-full px-4 py-2 text-sm text-[#B3B3B3] hover:text-white hover:bg-[#2E2E2E] flex items-center gap-2"
                                                        >
                                                            <Key className="w-4 h-4" /> Redefinir Senha
                                                        </button>

                                                        <div className="h-px bg-[#2E2E2E] my-1"></div>

                                                        <button 
                                                            onClick={() => handleDelete(user.id)}
                                                            className="w-full px-4 py-2 text-sm text-red-500 hover:bg-[#2E2E2E] flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Excluir
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-[#B3B3B3]">
                        Nenhum usuário encontrado com os filtros atuais.
                    </div>
                )}
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <ProfileModal 
                    isOpen={true}
                    onClose={() => setEditingUser(null)}
                    userToEdit={editingUser}
                    onSave={(updatedUser) => {
                        onUpdateUser(updatedUser);
                        setExpandedUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
                        setEditingUser(null);
                    }}
                    currentUserRole={currentUser.role}
                />
            )}

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-6 w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                        <h3 className="text-xl font-bold text-white mb-4">Novo Usuário</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3]">Nome</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                                    className="w-full mt-1 p-2 bg-[#0E0E0E] border border-[#2E2E2E] rounded-md text-white focus:ring-1 focus:ring-[#FF6B00] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3]">Email</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                                    className="w-full mt-1 p-2 bg-[#0E0E0E] border border-[#2E2E2E] rounded-md text-white focus:ring-1 focus:ring-[#FF6B00] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3]">Senha Provisória</label>
                                <input
                                    type="text"
                                    value={newUser.password}
                                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                                    className="w-full mt-1 p-2 bg-[#0E0E0E] border border-[#2E2E2E] rounded-md text-white focus:ring-1 focus:ring-[#FF6B00] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3]">Cargo (Role)</label>
                                <select
                                    value={newUser.role}
                                    onChange={e => setNewUser({...newUser, role: e.target.value as Role})}
                                    className="w-full mt-1 p-2 bg-[#0E0E0E] border border-[#2E2E2E] rounded-md text-white focus:ring-1 focus:ring-[#FF6B00] outline-none"
                                >
                                    <option value={Role.USER}>Usuário</option>
                                    <option value={Role.ADMIN}>Administrador</option>
                                    <option value={Role.COLLABORATOR}>Colaborador</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3]">Setor</label>
                                <input
                                    type="text"
                                    value={newUser.sector}
                                    onChange={e => setNewUser({...newUser, sector: e.target.value as any})}
                                    className="w-full mt-1 p-2 bg-[#0E0E0E] border border-[#2E2E2E] rounded-md text-white focus:ring-1 focus:ring-[#FF6B00] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3]">Título/Cargo (Display)</label>
                                <input
                                    type="text"
                                    value={newUser.jobTitle}
                                    onChange={e => setNewUser({...newUser, jobTitle: e.target.value})}
                                    className="w-full mt-1 p-2 bg-[#0E0E0E] border border-[#2E2E2E] rounded-md text-white focus:ring-1 focus:ring-[#FF6B00] outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button 
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 text-sm text-[#B3B3B3] hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleCreateUserSubmit}
                                disabled={isCreating}
                                className="px-4 py-2 text-sm bg-[#FF6B00] hover:bg-[#FF8C33] text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isCreating ? 'Criando...' : 'Criar Usuário'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetPasswordUserId && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-6 w-full max-w-md"
                    >
                        <h3 className="text-xl font-bold text-white mb-2">Redefinir Senha</h3>
                        <p className="text-sm text-[#B3B3B3] mb-4">
                            Digite a nova senha para o usuário. Ele precisará usar esta senha no próximo login.
                        </p>
                        
                        <input
                            type="text"
                            placeholder="Nova senha (mín. 6 caracteres)"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg py-2 px-4 text-white focus:ring-1 focus:ring-[#FF6B00] outline-none mb-6"
                        />

                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => { setResetPasswordUserId(null); setNewPassword(''); }}
                                className="px-4 py-2 text-sm text-[#B3B3B3] hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleResetPassword}
                                disabled={newPassword.length < 6}
                                className="px-4 py-2 text-sm bg-[#FF6B00] hover:bg-[#FF8C33] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Salvar Nova Senha
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
