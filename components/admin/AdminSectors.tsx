import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Plus, Edit2, Trash2, Users } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../Toast';
import { LoadingSpinner } from '../Loading';

interface Sector {
    id: string;
    name: string;
    color: string;
    description: string;
    manager_id: string | null;
    created_at: string;
}

export default function AdminSectors() {
    const { addToast } = useToast();
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ id: '', name: '', color: '#FF6B00', description: '', manager_id: '' });

    useEffect(() => {
        fetchSectors();
    }, []);

    const fetchSectors = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/admin/sectors');
            setSectors(response.data);
        } catch (error) {
            console.error('Error fetching sectors:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar setores' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/admin/sectors/${editingId}`, formData);
                addToast({ type: 'success', title: 'Sucesso', message: 'Setor atualizado' });
            } else {
                const newId = `sec_${Date.now()}`;
                await api.post('/admin/sectors', { ...formData, id: newId });
                addToast({ type: 'success', title: 'Sucesso', message: 'Setor criado' });
            }
            fetchSectors();
            setIsModalOpen(false);
        } catch (error) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao salvar setor' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza? Isso pode afetar usuários alocados neste setor.')) return;
        try {
            await api.delete(`/admin/sectors/${id}`);
            addToast({ type: 'success', title: 'Sucesso', message: 'Setor excluído' });
            fetchSectors();
        } catch (error) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao excluir setor' });
        }
    };

    const openModal = (sector?: Sector) => {
        if (sector) {
            setEditingId(sector.id);
            setFormData({
                id: sector.id,
                name: sector.name,
                color: sector.color || '#FF6B00',
                description: sector.description || '',
                manager_id: sector.manager_id || ''
            });
        } else {
            setEditingId(null);
            setFormData({ id: '', name: '', color: '#FF6B00', description: '', manager_id: '' });
        }
        setIsModalOpen(true);
    };

    if (isLoading) return <div className="flex justify-center p-10"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E]">
                <div className="flex items-center gap-3">
                    <div className="bg-[#FF6B00]/10 p-2 rounded-lg">
                        <Building2 className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Gestão de Setores</h2>
                        <p className="text-sm text-[#B3B3B3]">Gerencie os departamentos da empresa</p>
                    </div>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF8C33] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Novo Setor
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                    {sectors.map((sector, index) => (
                        <motion.div
                            key={sector.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] overflow-hidden group"
                        >
                            <div className="h-2 w-full" style={{ backgroundColor: sector.color }}></div>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-white">{sector.name}</h3>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openModal(sector)} className="p-1.5 hover:bg-[#2E2E2E] rounded-lg text-[#B3B3B3] hover:text-white transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(sector.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-[#B3B3B3] h-10 line-clamp-2 mb-4">
                                    {sector.description || 'Sem descrição'}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-[#B3B3B3]">
                                    <Users className="w-4 h-4" />
                                    <span>Líder ID: {sector.manager_id || 'Não definido'}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] p-6 w-full max-w-md"
                    >
                        <h3 className="text-xl font-bold text-white mb-4">{editingId ? 'Editar Setor' : 'Novo Setor'}</h3>
                        
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Nome do Setor</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-[#FF6B00] outline-none"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Cor</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({...formData, color: e.target.value})}
                                        className="h-10 w-10 rounded cursor-pointer bg-transparent border-0"
                                    />
                                    <span className="text-sm text-white uppercase">{formData.color}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3] mb-1">Descrição</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className="w-full bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg py-2 px-3 text-white focus:ring-1 focus:ring-[#FF6B00] outline-none min-h-[80px]"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm text-[#B3B3B3] hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 text-sm bg-[#FF6B00] hover:bg-[#FF8C33] text-white rounded-lg transition-colors"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
