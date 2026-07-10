import React, { useState, useMemo, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { Goal, User, GoalPeriod, Sector } from '../types';
// Fix: Import ShieldIcon for the 'Administração' sector.
import { BriefcaseIcon, PaletteIcon, CpuIcon, TrendingUpIcon, TrophyIcon, XIcon, CheckSquareIcon, ShieldIcon, TargetIcon, EditIcon, Trash2Icon, PlusIcon } from '../components/icons';
import api from '../services/api';
import { useToast } from '../components/Toast';

// Since this is a browser environment, we need to declare the confetti function
declare function confetti(options?: any): void;

import { AuthContext } from '../contexts/AuthContext';

interface GoalsScreenProps {
    goals: Goal[];
    users: User[];
    setGoals: (goals: Goal[] | ((prev: Goal[]) => Goal[])) => void;
}

const formatValue = (value: number, metric: 'BRL' | '%' | 'count') => {
    switch (metric) {
        case 'BRL':
            return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        case '%':
            return `${value}%`;
        case 'count':
            return value.toLocaleString('pt-BR');
        default:
            return value;
    }
};

const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const controls = animate(displayValue, value, {
            duration: 1,
            onUpdate: (latest) => setDisplayValue(latest),
        });
        return () => controls.stop();
    }, [value, displayValue]);

    return <>{Math.round(displayValue)}</>;
};

const GoalsScreen: React.FC<GoalsScreenProps> = ({ goals, users, setGoals }) => {
    const { user: currentUser } = useContext(AuthContext);
    const toast = useToast();
    const [period, setPeriod] = useState<GoalPeriod>('monthly');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    const periodGoals = useMemo(() => goals.filter(g => g.period === period), [goals, period]);

    const weeklyGoal = periodGoals.find(g => g.id === 'g-company-csat');
    const oldHighlightId = 'g-highlight';

    const companyGoals = periodGoals.filter(g => g.type === 'company' && g.id !== weeklyGoal?.id && g.id !== oldHighlightId);
    const sectorGoals = periodGoals.filter(g => g.type === 'sector');
    const teamGoals = periodGoals.filter(g => g.type === 'team');

    const handleOpenEditModal = (goal: Goal) => {
        setEditingGoal(goal);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditingGoal(null);
        setIsEditModalOpen(false);
    };

    const handleSaveGoal = async (updatedGoal: Goal) => {
        if (!currentUser) {
            toast.error("Você precisa estar logado para salvar metas.");
            return;
        }

        try {
            // Optimistic update
            setGoals(prevGoals =>
                prevGoals.map(g => (g.id === updatedGoal.id ? updatedGoal : g))
            );
            handleCloseEditModal();

            // API Call
            if (updatedGoal.id) {
                await api.put(`/goals/${updatedGoal.id}`, updatedGoal);
            } else {
                const res = await api.post('/goals', {
                    ...updatedGoal,
                    userId: currentUser.id
                });
                setGoals(prev => [res.data, ...prev]);
            }
        } catch (error) {
            console.error("Failed to save goal:", error);
            toast.error("Erro ao salvar meta. Verifique sua conexão.");
            // Revert changes if needed (not implemented here for brevity but recommended)
        }
    };


    const handleDeleteGoal = async (goalId: string) => {
        if (!window.confirm("Tem certeza que deseja excluir esta meta?")) return;

        try {
            // Optimistic update
            setGoals(prevGoals => prevGoals.filter(g => g.id !== goalId));
            handleCloseEditModal();

            // API Call
            await api.delete(`/goals/${goalId}`);
        } catch (error) {
            console.error("Failed to delete goal:", error);
            toast.error("Erro ao excluir meta.");
        }
    };

    // Confetti effect for completed goals
    const goalsCompletedRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        goals.forEach(goal => {
            const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
            if (progress >= 100 && !goalsCompletedRef.current.has(goal.id)) {
                confetti({
                    particleCount: 150,
                    spread: 90,
                    origin: { y: 0.6 }
                });
                goalsCompletedRef.current.add(goal.id);
            } else if (progress < 100 && goalsCompletedRef.current.has(goal.id)) {
                goalsCompletedRef.current.delete(goal.id);
            }
        });
    }, [goals]);

    const ProgressBar: React.FC<{ goal: Goal }> = ({ goal }) => {
        const progress = Math.min(100, goal.target > 0 ? (goal.current / goal.target) * 100 : 0);
        return (
            <div className="w-full bg-[#2E2E2E] rounded-full h-2.5 mt-2">
                <motion.div
                    className="bg-[#FF6B00] h-2.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "circOut" }}
                />
            </div>
        );
    };

    // Fix: Added missing 'Administração' and 'Financeiro' sectors to fix TypeScript error.
    const sectorConfig: { [key in Sector]: { icon: React.FC<any>, color: string } } = {
        Comercial: { icon: BriefcaseIcon, color: "text-[#FF6B00]" },
        RH: { icon: PaletteIcon, color: "text-[#7A00FF]" },
        Tech: { icon: CpuIcon, color: "text-[#00ADEF]" },
        Administração: { icon: ShieldIcon, color: "text-green-400" },
        Financeiro: { icon: TrendingUpIcon, color: "text-yellow-400" },
    };

    const getPerformanceIndicator = (progress: number) => {
        if (progress >= 90) return '🔥';
        if (progress >= 60) return '⚡';
        return '💤';
    };

    return (
        <div className="h-full flex flex-col">
            <header className="mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Painel de Metas</h1>
                        <p className="text-[#B3B3B3]">Acompanhe o desempenho e o progresso da Focus.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                setEditingGoal(null);
                                setIsEditModalOpen(true);
                            }}
                            className="bg-[#FF6B00] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#FF8C33] transition-colors"
                        >
                            <PlusIcon className="w-5 h-5" /> Nova Meta
                        </button>
                        <div className="bg-[#1C1C1C] p-1 rounded-lg flex space-x-1">
                            {(['monthly', 'quarterly', 'annually'] as GoalPeriod[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${period === p ? 'bg-[#FF6B00] text-white' : 'text-[#B3B3B3] hover:bg-[#2E2E2E]'}`}
                                >
                                    {p === 'monthly' ? 'Mês' : p === 'quarterly' ? 'Trimestre' : 'Ano'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                {/* Weekly Goal */}
                {weeklyGoal && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-white">Meta Semanal</h2>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-[#1C1C1C] p-6 rounded-2xl shadow-lg border border-[#2E2E2E] relative"
                        >
                            <button onClick={() => handleOpenEditModal(weeklyGoal)} className="absolute top-4 right-12 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#2E2E2E] transition-colors z-10">
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <div className="absolute top-4 right-4 text-[#FF6B00]">
                                <TargetIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white pr-8">{weeklyGoal.title}</h3>
                            <div className="flex items-baseline gap-4 mt-4">
                                <span className="text-5xl font-bold text-[#FF6B00]">
                                    <AnimatedCounter value={Math.round((weeklyGoal.current / weeklyGoal.target) * 100)} />%
                                </span>
                                <p className="text-[#B3B3B3]">
                                    Falta {formatValue(weeklyGoal.target - weeklyGoal.current, weeklyGoal.metric)} para a Meta Global
                                </p>
                            </div>
                            <ProgressBar goal={weeklyGoal} />
                        </motion.div>
                    </div>
                )}


                {/* Company Goals */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {companyGoals.map(goal => {
                        const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                        return (
                            <div key={goal.id} className="bg-[#1C1C1C] p-5 rounded-lg relative">
                                <button onClick={() => handleOpenEditModal(goal)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#2E2E2E] transition-colors z-10">
                                    <EditIcon className="w-4 h-4" />
                                </button>
                                <div className="flex items-center text-white">
                                    <TrendingUpIcon className="w-6 h-6 mr-3 text-[#FF6B00]" />
                                    <h3 className="font-semibold pr-8">{goal.title}</h3>
                                </div>
                                <div className="mt-4 flex justify-between items-baseline">
                                    <span className="text-3xl font-bold text-white">{formatValue(goal.current, goal.metric)}</span>
                                    <span className="text-lg text-[#B3B3B3] font-semibold">
                                        <AnimatedCounter value={progress} />%
                                    </span>
                                </div>
                                <ProgressBar goal={goal} />
                            </div>
                        );
                    })}
                </div>

                {/* Sector Goals */}
                <h3 className="text-2xl font-bold mb-4">Metas por Setor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {sectorGoals.map(goal => {
                        const config = sectorConfig[goal.sector!];
                        const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                        const Icon = config.icon;
                        return (
                            <div key={goal.id} className="bg-[#1C1C1C] p-5 rounded-lg flex flex-col relative">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center mb-1">
                                            <Icon className={`w-5 h-5 mr-2 ${config.color}`} />
                                            <h4 className="font-bold text-white">{goal.sector}</h4>
                                        </div>
                                        <p className="text-sm text-[#B3B3B3] pr-8">{goal.title}</p>
                                    </div>
                                    <div className="flex items-center">
                                        <button onClick={() => handleOpenEditModal(goal)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#2E2E2E] transition-colors z-10 mr-2">
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <span className="text-3xl">{getPerformanceIndicator(progress)}</span>
                                    </div>
                                </div>
                                <div className="mt-4 flex-grow">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-xl font-bold text-white">{formatValue(goal.current, goal.metric)} / {formatValue(goal.target, goal.metric)}</span>
                                        <span className="text-lg font-semibold text-[#B3B3B3]"><AnimatedCounter value={progress} />%</span>
                                    </div>
                                    <ProgressBar goal={goal} />
                                </div>
                                {goal.subGoals && (
                                    <button onClick={() => { /* Mocking details modal for now */ }} className="mt-4 text-center text-sm font-semibold text-[#FF6B00] hover:underline">Ver detalhes</button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Team Goals */}
                <h3 className="text-2xl font-bold mb-4">Metas da Equipe</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {teamGoals.map(goal => {
                        const user = users.find(u => u.id === goal.userId);
                        if (!user) return null;
                        const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                        const achieved = progress >= 100;

                        return (
                            <div key={goal.id} className="bg-[#1C1C1C] p-4 rounded-lg text-center relative overflow-hidden">
                                <div className="absolute top-2 right-2 flex items-center">
                                    <button onClick={() => handleOpenEditModal(goal)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#2E2E2E] transition-colors z-10">
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                    {achieved && <div className="text-yellow-400 ml-1"><TrophyIcon className="w-6 h-6" /></div>}
                                </div>
                                <img src={user.avatarUrl} alt={user.name} className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-[#2E2E2E]" />
                                <h4 className="font-semibold text-white">{user.name}</h4>
                                <p className="text-xs text-[#B3B3B3] mb-3">{goal.title}</p>
                                <div className={`text-2xl font-bold ${achieved ? 'text-green-400' : 'text-white'}`}>{formatValue(goal.current, goal.metric)}</div>
                                <div className="text-sm text-[#B3B3B3] mb-2">Meta: {formatValue(goal.target, goal.metric)}</div>
                                <ProgressBar goal={goal} />
                            </div>
                        );
                    })}
                </div>
            </main>

            <GoalEditModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                onSave={handleSaveGoal}
                onDelete={handleDeleteGoal}
                goal={editingGoal}
            />

        </div>
    );
};

interface GoalEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (goal: Goal) => void;
    onDelete: (goalId: string) => void;
    goal: Goal | null;
}

const GoalEditModal: React.FC<GoalEditModalProps> = ({ isOpen, onClose, onSave, onDelete, goal }) => {
    const [formData, setFormData] = useState<Partial<Goal>>({});

    useEffect(() => {
        if (goal) {
            setFormData(goal);
        } else {
            // Initialize with valid defaults for new goals
            setFormData({
                title: '',
                description: '',
                current: 0,
                target: 100,
                metric: 'BRL',
                type: 'company', // Default type
                period: 'monthly',
                status: 'active',
                sector: 'Comercial'
            });
        }
    }, [goal]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Goal);
    };

    // Removed if (!goal) return null; as we need to render for new goals

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-[#1C1C1C] rounded-lg shadow-xl w-full max-w-lg p-6 relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 text-[#B3B3B3] hover:text-white"><XIcon className="w-6 h-6" /></button>
                        <h2 className="text-2xl font-bold mb-2">{goal ? 'Editar Meta' : 'Nova Meta'}</h2>
                        <p className="text-sm text-[#B3B3B3] mb-4">{goal ? 'Ajuste os detalhes da meta selecionada.' : 'Preencha os dados para criar uma nova meta.'}</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3]">Título</label>
                                <input type="text" name="title" value={formData.title || ''} onChange={handleChange} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md border border-transparent focus:border-[#FF6B00] focus:ring-0" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#B3B3B3]">Descrição</label>
                                <textarea name="description" rows={3} value={formData.description || ''} onChange={handleChange} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md border border-transparent focus:border-[#FF6B00] focus:ring-0 resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#B3B3B3]">Valor Atual ({goal?.metric})</label>
                                    <input type="number" name="current" value={formData.current || 0} onChange={handleChange} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md border border-transparent focus:border-[#FF6B00] focus:ring-0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#B3B3B3]">Meta Final ({goal?.metric})</label>
                                    <input type="number" name="target" value={formData.target || 0} onChange={handleChange} className="w-full mt-1 p-2 bg-[#2E2E2E] rounded-md border border-transparent focus:border-[#FF6B00] focus:ring-0" />
                                </div>
                            </div>
                            <div className="flex justify-between pt-4">
                                <button type="button" onClick={() => { if (goal) onDelete(goal.id); }} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 font-semibold flex items-center">
                                    <Trash2Icon className="w-4 h-4 mr-2" /> Excluir
                                </button>
                                <div className="flex">
                                    <button type="button" onClick={onClose} className="px-4 py-2 mr-2 bg-[#2E2E2E] rounded-md hover:bg-[#3a3a3a]">Cancelar</button>
                                    <button type="submit" className="px-6 py-2 bg-[#FF6B00] rounded-md text-white font-semibold hover:bg-[#FF8C33]">Salvar</button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


export default GoalsScreen;
