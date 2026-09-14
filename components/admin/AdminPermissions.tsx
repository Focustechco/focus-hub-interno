import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Save, Key, Eye, Edit, Trash2, Plus, Settings } from 'lucide-react';
import { Role } from '../../types';
import api from '../../services/api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../Loading';

interface RolePermission {
    id: number;
    role: string;
    module_slug: string;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_admin: boolean;
}

interface SystemModule {
    slug: string;
    name: string;
}

const ROLES = [Role.ADMIN, Role.USER, Role.COLLABORATOR];

export default function AdminPermissions() {
    const { addToast } = useToast();
    const [permissions, setPermissions] = useState<RolePermission[]>([]);
    const [modules, setModules] = useState<SystemModule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<string>(Role.USER);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [permRes, modRes] = await Promise.all([
                api.get('/admin/permissions'),
                api.get('/admin/modules')
            ]);
            setPermissions(permRes.data);
            setModules(modRes.data);
        } catch (error) {
            console.error('Error fetching permissions:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar permissões' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = async (moduleSlug: string, field: keyof RolePermission) => {
        const existingPerm = permissions.find(p => p.role === selectedRole && p.module_slug === moduleSlug);
        
        let updatedPerm = existingPerm ? { ...existingPerm } : {
            id: 0,
            role: selectedRole,
            module_slug: moduleSlug,
            can_view: true,
            can_create: true,
            can_edit: true,
            can_delete: true,
            can_admin: false,
        };

        if (field === 'can_view' && updatedPerm.can_view) {
            updatedPerm.can_view = false;
            updatedPerm.can_create = false;
            updatedPerm.can_edit = false;
            updatedPerm.can_delete = false;
            updatedPerm.can_admin = false;
        } else if (field !== 'can_view' && !updatedPerm.can_view) {
            return; // Cannot toggle other perms if view is false
        } else {
            updatedPerm = {
                ...updatedPerm,
                [field]: !updatedPerm[field]
            };
        }

        // Optimistic UI update
        setPermissions(prev => {
            const idx = prev.findIndex(p => p.role === selectedRole && p.module_slug === moduleSlug);
            const newState = [...prev];
            if (idx >= 0) newState[idx] = updatedPerm;
            else newState.push(updatedPerm);
            return newState;
        });

        // Save to backend immediately
        try {
            await api.put('/admin/permissions', updatedPerm);
            // Dispatch event to update layout (sidebar)
            window.dispatchEvent(new CustomEvent('permissions-updated'));
        } catch (error) {
            console.error('Error saving permission:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao salvar permissão' });
            fetchPermissions(); // Revert on failure
        }
    };

    if (isLoading) return <div className="flex justify-center p-10"><LoadingSpinner /></div>;

    const currentRolePerms = modules.map(mod => {
        const perm = permissions.find(p => p.role === selectedRole && p.module_slug === mod.slug);
        return {
            module: mod,
            perms: perm || {
                id: 0, role: selectedRole, module_slug: mod.slug,
                can_view: true, can_create: true, can_edit: true, can_delete: true, can_admin: false
            }
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E]">
                <div className="flex items-center gap-3">
                    <div className="bg-[#FF6B00]/10 p-2 rounded-lg">
                        <Shield className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Matriz de Permissões</h2>
                        <p className="text-sm text-[#B3B3B3]">Configure o nível de acesso para cada cargo</p>
                    </div>
                </div>
            </div>

            {/* Role Tabs */}
            <div className="flex gap-2">
                {ROLES.map(role => (
                    <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`px-6 py-3 rounded-t-xl text-sm font-medium transition-colors ${
                            selectedRole === role 
                                ? 'bg-[#1C1C1C] text-white border-t border-l border-r border-[#2E2E2E]' 
                                : 'bg-transparent text-[#B3B3B3] hover:bg-[#2E2E2E]/30 border-t border-l border-r border-transparent'
                        }`}
                    >
                        {role === Role.ADMIN ? 'Administradores' : role === Role.USER ? 'Usuários Padrão' : 'Colaboradores Externos'}
                    </button>
                ))}
            </div>

            {/* Permissions Table */}
            <div className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-b-xl rounded-tr-xl overflow-hidden -mt-6 z-10 relative shadow-xl">
                {selectedRole === Role.ADMIN && (
                    <div className="p-4 bg-green-500/10 text-green-400 text-sm border-b border-green-500/20 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Administradores têm acesso total por padrão ao sistema, mas você pode restringir módulos específicos aqui.
                    </div>
                )}
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-white">
                        <thead className="bg-[#0E0E0E] text-[#B3B3B3] uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Módulo</th>
                                <th className="px-6 py-4 font-semibold text-center w-24">
                                    <div className="flex flex-col items-center gap-1"><Eye className="w-4 h-4" /> Visualizar</div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-center w-24">
                                    <div className="flex flex-col items-center gap-1"><Plus className="w-4 h-4" /> Criar</div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-center w-24">
                                    <div className="flex flex-col items-center gap-1"><Edit className="w-4 h-4" /> Editar</div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-center w-24">
                                    <div className="flex flex-col items-center gap-1"><Trash2 className="w-4 h-4" /> Excluir</div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-center w-24">
                                    <div className="flex flex-col items-center gap-1"><Settings className="w-4 h-4" /> Admin</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRolePerms.map((row, idx) => (
                                <motion.tr 
                                    key={row.module.slug}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="border-b border-[#2E2E2E] hover:bg-[#2E2E2E]/30"
                                >
                                    <td className="px-6 py-4 font-medium">
                                        {row.module.name}
                                    </td>
                                    {(['can_view', 'can_create', 'can_edit', 'can_delete', 'can_admin'] as const).map(field => (
                                        <td key={field} className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleToggle(row.module.slug, field)}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                                                    row.perms[field] ? 'bg-[#FF6B00]' : 'bg-[#2E2E2E]'
                                                } ${(!row.perms.can_view && field !== 'can_view') ? 'opacity-30 cursor-not-allowed' : ''}`}
                                            >
                                                <span
                                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                        row.perms[field] ? 'translate-x-4.5' : 'translate-x-1'
                                                    }`}
                                                    style={{ transform: row.perms[field] ? 'translateX(18px)' : 'translateX(4px)' }}
                                                />
                                            </button>
                                        </td>
                                    ))}
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
