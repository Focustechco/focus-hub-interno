import React, { useState, useMemo, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { Goal, User, Sector, Role } from '../types';
import { BriefcaseIcon, PaletteIcon, CpuIcon, TrendingUpIcon, TrophyIcon, XIcon, ShieldIcon, TargetIcon, EditIcon, Trash2Icon, PlusIcon } from '../components/icons';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { AuthContext } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

declare function confetti(options?: any): void;

// === Icons que faltavam ===
const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
);
const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const ActivityIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
);
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);

interface GoalsScreenProps {
    goals: Goal[];
    users: User[];
    setGoals: (goals: Goal[] | ((prev: Goal[]) => Goal[])) => void;
}

// === Helpers ===
const getProgressBarColor = (progress: number) => {
    if (progress <= 25) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
    if (progress <= 60) return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
    if (progress <= 90) return 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
    if (progress < 100) return 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]';
    return 'bg-green-600 shadow-[0_0_15px_rgba(22,163,74,0.8)]'; // 100% ou mais
};

const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
};

const formatValue = (value: number, metric: string) => {
    switch (metric) {
        case 'BRL': return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        case '%': return `${value || 0}%`;
        case 'count': return (value || 0).toLocaleString('pt-BR');
        default: return value || 0;
    }
};

const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        const controls = animate(displayValue, value, {
            duration: 1.5,
            ease: "easeOut",
            onUpdate: (latest) => setDisplayValue(latest),
        });
        return () => controls.stop();
    }, [value, displayValue]);
    return <>{Math.round(displayValue)}</>;
};

// === Componente GoalCard ===
const GoalCard: React.FC<{ goal: Goal; onEdit: () => void; users: User[]; onToggleSubgoal: (goal: Goal, subgoalId: string) => void }> = ({ goal, onEdit, users, onToggleSubgoal }) => {
    const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
    const daysLeft = getDaysRemaining(goal.end_date);
    const isDelayed = daysLeft !== null && daysLeft < 0 && progress < 100;
    const isNearDeadline = daysLeft !== null && daysLeft >= 0 && daysLeft <= 5 && progress < 100;
    const responsible = users.find(u => u.id === goal.responsible_id);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
            whileHover={{ y: -5, scale: 1.02 }}
            className={`relative p-6 rounded-2xl overflow-hidden backdrop-blur-md bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-200 dark:border-[#2E2E2E] shadow-2xl transition-all
                ${isDelayed ? 'ring-2 ring-red-500/50' : isNearDeadline ? 'ring-2 ring-orange-500/50' : 'hover:ring-1 hover:ring-gray-300'}`}
        >
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-[#FF6B00]/20 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <span className="inline-block px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-gray-100 dark:bg-[#2A2A2A] text-gray-900 dark:text-white mb-2">
                        {goal.sector || 'Geral'}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2">{goal.title}</h3>
                </div>
                <button onClick={onEdit} className="p-2 bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-100 hover:bg-gray-200 dark:bg-[#333] rounded-full transition-colors text-gray-900 dark:text-white/70 hover:text-gray-900 dark:text-white">
                    <EditIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="mt-6 relative z-10">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white/60 mb-1">Progresso</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-gray-900 dark:text-white">{formatValue(goal.current_value, goal.metric)}</span>
                            <span className="text-sm text-gray-900 dark:text-white/50 font-medium">de {formatValue(goal.target_value, goal.metric)}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            <AnimatedCounter value={progress > 100 && !goal.allow_overflow ? 100 : progress} />%
                        </span>
                        {progress > 100 && goal.allow_overflow && <span className="block text-xs text-green-400 font-bold">Meta superada!</span>}
                    </div>
                </div>

                <div className="w-full bg-gray-200 dark:bg-[#333] rounded-full h-3 mb-4 overflow-hidden border border-gray-200 dark:border-[#2E2E2E]">
                    <motion.div
                        className={`h-full rounded-full ${getProgressBarColor(progress)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, progress)}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </div>

                {goal.subgoals && goal.subgoals.length > 0 && (
                    <div className="mb-4 space-y-2">
                        {goal.subgoals.map(sub => (
                            <button 
                                key={sub.id} 
                                onClick={() => onToggleSubgoal(goal, sub.id)}
                                className="flex items-center gap-3 w-full text-left bg-gray-50 dark:bg-[#0E0E0E] hover:bg-gray-200 dark:bg-[#333] p-2 rounded-lg transition-colors border border-gray-200 dark:border-[#2E2E2E]"
                            >
                                <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border ${sub.completed ? 'bg-[#FF6B00] border-[#FF6B00]' : 'border-white/30'}`}>
                                    {sub.completed && <CheckIcon className="w-3 h-3 text-gray-900 dark:text-white" />}
                                </div>
                                <span className={`text-sm flex-1 ${sub.completed ? 'text-gray-900 dark:text-white/40 line-through' : 'text-gray-900 dark:text-white/80'}`}>
                                    {sub.text}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                        {daysLeft !== null ? (
                            isDelayed ? (
                                <span className="flex items-center text-red-400 font-bold"><AlertTriangleIcon className="w-4 h-4 mr-1"/> Atrasada {Math.abs(daysLeft)} dias</span>
                            ) : (
                                <span className={`flex items-center ${isNearDeadline ? 'text-orange-400 font-bold' : 'text-gray-900 dark:text-white/60'}`}>
                                    <ClockIcon className="w-4 h-4 mr-1"/> {daysLeft === 0 ? 'Termina hoje' : `${daysLeft} dias restantes`}
                                </span>
                            )
                        ) : (
                            <span className="text-gray-900 dark:text-white/40">Sem prazo</span>
                        )}
                    </div>
                    
                    {responsible && (
                        <div className="flex items-center gap-2" title={`Responsável: ${responsible.name}`}>
                            <span className="text-gray-900 dark:text-white/60 text-xs hidden sm:inline-block">{responsible.name.split(' ')[0]}</span>
                            <img src={responsible.avatarUrl} alt={responsible.name} className="w-6 h-6 rounded-full border border-gray-300 dark:border-[#3E3E3E]" />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};


// === Main Component ===
const GoalsScreen: React.FC<GoalsScreenProps> = ({ goals: allGoals, users, setGoals }) => {
    const { user: currentUser } = useContext(AuthContext);
    const toast = useToast();
    const [view, setView] = useState<'cards' | 'executive' | 'sectors'>('cards');
    const [filterPeriod, setFilterPeriod] = useState<'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_semester' | 'this_year'>('all');

    const goals = useMemo(() => {
        const now = new Date();
        return allGoals.filter(g => {
            if (filterPeriod === 'all') return true;
            if (!g.end_date) return true;
            
            const endDate = new Date(g.end_date);
            if (filterPeriod === 'this_month') {
                return endDate.getMonth() === now.getMonth() && endDate.getFullYear() === now.getFullYear();
            }
            if (filterPeriod === 'last_month') {
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                return endDate.getMonth() === lastMonth.getMonth() && endDate.getFullYear() === lastMonth.getFullYear();
            }
            if (filterPeriod === 'this_quarter') {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                const endQuarter = Math.floor(endDate.getMonth() / 3);
                return endQuarter === currentQuarter && endDate.getFullYear() === now.getFullYear();
            }
            if (filterPeriod === 'this_semester') {
                const currentSemester = Math.floor(now.getMonth() / 6);
                const endSemester = Math.floor(endDate.getMonth() / 6);
                return endSemester === currentSemester && endDate.getFullYear() === now.getFullYear();
            }
            if (filterPeriod === 'this_year') {
                return endDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }, [allGoals, filterPeriod]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    const handleOpenEditModal = (goal: Goal | null) => {
        setEditingGoal(goal);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setEditingGoal(null);
        setIsEditModalOpen(false);
    };

    const handleSaveGoal = async (updatedGoal: Goal) => {
        if (!currentUser) return toast.error("Não autorizado.");
        try {
            if (updatedGoal.id && updatedGoal.id.startsWith('g')) {
                // Update
                setGoals(prev => prev.map(g => (g.id === updatedGoal.id ? updatedGoal : g)));
                await api.put(`/goals/${updatedGoal.id}`, updatedGoal);
                toast.success("Meta atualizada com sucesso!");
            } else {
                // Create
                const res = await api.post('/goals', { ...updatedGoal, created_by: currentUser.id });
                setGoals(prev => [res.data, ...prev]);
                toast.success("Meta criada com sucesso!");
            }
            handleCloseEditModal();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao salvar meta');
        }
    };

    const handleToggleSubgoal = async (goal: Goal, subgoalId: string) => {
        if (!goal.subgoals) return;
        const updatedSubgoals = goal.subgoals.map(s => s.id === subgoalId ? { ...s, completed: !s.completed } : s);
        const completedCount = updatedSubgoals.filter(s => s.completed).length;
        const updatedGoal = { ...goal, subgoals: updatedSubgoals, current_value: completedCount, target_value: updatedSubgoals.length };
        
        try {
            await api.put(`/goals/${updatedGoal.id}`, updatedGoal);
            setGoals((prev: Goal[]) => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
        } catch (err) {
            toast.error('Erro ao atualizar submeta');
        }
    };

    const handleDeleteGoal = async (goalId: string) => {
        if (!window.confirm("Excluir esta meta permanentemente?")) return;
        try {
            setGoals(prev => prev.filter(g => g.id !== goalId));
            await api.delete(`/goals/${goalId}`);
            handleCloseEditModal();
            toast.success("Meta excluída.");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir.");
        }
    };

    // Confetti effect
    const completedGoalsRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        goals.forEach(goal => {
            const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
            if (progress >= 100 && !completedGoalsRef.current.has(goal.id)) {
                confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
                completedGoalsRef.current.add(goal.id);
            }
        });
    }, [goals]);

    // Dashboard Metrics
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => (g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0) >= 100).length;
    const delayedGoals = goals.filter(g => {
        const days = getDaysRemaining(g.end_date);
        const progress = g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0;
        return days !== null && days < 0 && progress < 100;
    }).length;
    const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    const sectorChartData = useMemo(() => {
        const sectors = ['Comercial', 'RH', 'Tech', 'Administração', 'Financeiro'];
        return sectors.map(sector => {
            const sGoals = goals.filter(g => g.sector === sector);
            let totalProgress = 0;
            sGoals.forEach(g => {
                const p = g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0;
                totalProgress += Math.min(100, p);
            });
            return {
                name: sector,
                Progresso: sGoals.length > 0 ? Math.round(totalProgress / sGoals.length) : 0,
                Metas: sGoals.length
            };
        }).filter(item => item.Metas > 0);
    }, [goals]);

    const statusChartData = useMemo(() => {
        return [
            { name: 'Concluídas', value: completedGoals, fill: '#4ade80' },
            { name: 'Em Andamento', value: totalGoals - completedGoals - delayedGoals, fill: '#60a5fa' },
            { name: 'Atrasadas', value: delayedGoals, fill: '#f87171' }
        ].filter(item => item.value > 0);
    }, [totalGoals, completedGoals, delayedGoals]);

    const goalsAtRisk = goals.filter(g => {
        const days = getDaysRemaining(g.end_date);
        const progress = g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0;
        return days !== null && days >= 0 && days <= 7 && progress < 50;
    }).length;

    let totalOverallProgress = 0;
    goals.forEach(g => {
        const p = g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0;
        totalOverallProgress += Math.min(100, p);
    });
    const avgProgress = totalGoals > 0 ? totalOverallProgress / totalGoals : 0;

    const activeSectorsCount = new Set(goals.map(g => g.sector).filter(Boolean)).size;
    const bestSector = sectorChartData.length > 0 ? sectorChartData.reduce((prev, current) => (prev.Progresso > current.Progresso) ? prev : current) : null;

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-[#0E0E0E] text-gray-900 dark:text-white">
            <header className="mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                            Centro de Performance
                        </h1>
                        <p className="text-gray-500 dark:text-[#888] mt-1 font-medium text-lg">Acompanhamento inteligente de OKRs e KPIs.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={filterPeriod}
                            onChange={(e) => setFilterPeriod(e.target.value as any)}
                            className="bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-[#2E2E2E] text-gray-500 dark:text-[#888] text-sm font-bold rounded-xl px-4 py-2.5 focus:ring-1 focus:ring-[#FF6B00] outline-none hover:text-gray-900 dark:text-white transition-colors cursor-pointer"
                        >
                            <option value="all">Todo o Período</option>
                            <option value="this_month">Este Mês</option>
                            <option value="last_month">Mês Passado</option>
                            <option value="this_quarter">Este Trimestre</option>
                            <option value="this_semester">Este Semestre</option>
                            <option value="this_year">Este Ano</option>
                        </select>
                        <div className="bg-white dark:bg-[#1C1C1C] p-1 rounded-xl flex border border-gray-200 dark:border-[#2E2E2E]">
                            <button onClick={() => setView('cards')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'cards' ? 'bg-[#FF6B00] text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2A2A2A]'}`}>Metas</button>
                            <button onClick={() => setView('sectors')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'sectors' ? 'bg-[#FF6B00] text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2A2A2A]'}`}>Setores</button>
                            <button onClick={() => setView('executive')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'executive' ? 'bg-[#FF6B00] text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2A2A2A]'}`}>Executivo</button>
                        </div>
                        {(currentUser?.role === Role.ADMIN || currentUser?.role === Role.MANAGER) && (
                            <button onClick={() => handleOpenEditModal(null)} className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C33] text-gray-900 dark:text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(255,107,0,0.4)] transition-all">
                                <PlusIcon className="w-5 h-5" /> Nova Meta
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                
                {/* VIEW: CARDS */}
                {view === 'cards' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
                        <AnimatePresence>
                            {goals.map(goal => (
                                <GoalCard key={goal.id} goal={goal} users={users} onEdit={() => handleOpenEditModal(goal)} onToggleSubgoal={handleToggleSubgoal} />
                            ))}
                            {goals.length === 0 && (
                                <div className="col-span-full py-20 text-center text-gray-900 dark:text-white/50">
                                    <TargetIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <h2 className="text-2xl font-bold mb-2">Nenhuma meta encontrada</h2>
                                    <p>Crie sua primeira meta inteligente para começar a medir os resultados.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* VIEW: EXECUTIVE */}
                {view === 'executive' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-200 dark:border-[#2E2E2E] p-6 rounded-2xl backdrop-blur-md">
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white/60 mb-2"><TargetIcon className="w-5 h-5"/> Total de Metas</div>
                                <div className="text-4xl font-black text-gray-900 dark:text-white">{totalGoals}</div>
                            </div>
                            <div className="bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-200 dark:border-[#2E2E2E] p-6 rounded-2xl backdrop-blur-md">
                                <div className="flex items-center gap-3 text-green-400 mb-2"><CheckCircleIcon className="w-5 h-5"/> Concluídas</div>
                                <div className="text-4xl font-black text-gray-900 dark:text-white">{completedGoals}</div>
                            </div>
                            <div className="bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-200 dark:border-[#2E2E2E] p-6 rounded-2xl backdrop-blur-md">
                                <div className="flex items-center gap-3 text-red-400 mb-2"><AlertTriangleIcon className="w-5 h-5"/> Atrasadas</div>
                                <div className="text-4xl font-black text-gray-900 dark:text-white">{delayedGoals}</div>
                            </div>
                            <div className="bg-gradient-to-br from-[#FF6B00]/20 to-transparent border border-[#FF6B00]/30 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden">
                                <ActivityIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-[#FF6B00]/10" />
                                <div className="flex items-center gap-3 text-[#FF6B00] mb-2 font-bold"><TrendingUpIcon className="w-5 h-5"/> Taxa de Sucesso</div>
                                <div className="text-4xl font-black text-gray-900 dark:text-white">{completionRate.toFixed(1)}%</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-200 dark:border-[#2E2E2E] p-6 rounded-2xl backdrop-blur-md">
                                <div className="flex items-center gap-3 text-blue-400 mb-2"><ActivityIcon className="w-5 h-5"/> Progresso Médio</div>
                                <div className="text-4xl font-black text-gray-900 dark:text-white">{avgProgress.toFixed(1)}%</div>
                            </div>
                            <div className="bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-200 dark:border-[#2E2E2E] p-6 rounded-2xl backdrop-blur-md">
                                <div className="flex items-center gap-3 text-yellow-400 mb-2"><ShieldIcon className="w-5 h-5"/> Em Risco (menos de 7 dias)</div>
                                <div className="text-4xl font-black text-gray-900 dark:text-white">{goalsAtRisk}</div>
                            </div>
                            <div className="bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-200 dark:border-[#2E2E2E] p-6 rounded-2xl backdrop-blur-md">
                                <div className="flex items-center gap-3 text-purple-400 mb-2"><BriefcaseIcon className="w-5 h-5"/> Setores Engajados</div>
                                <div className="text-4xl font-black text-gray-900 dark:text-white">{activeSectorsCount}</div>
                            </div>
                            <div className="bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-200 dark:border-[#2E2E2E] p-6 rounded-2xl backdrop-blur-md relative overflow-hidden">
                                <div className="flex items-center gap-3 text-yellow-500 mb-2 font-bold"><TrophyIcon className="w-5 h-5"/> Melhor Setor</div>
                                <div className="text-3xl font-black text-gray-900 dark:text-white truncate" title={bestSector?.name || '-'}>{bestSector?.name || '-'}</div>
                                {bestSector && <div className="text-sm text-gray-900 dark:text-white/50">{bestSector.Progresso}% concluído</div>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-200 dark:border-[#2E2E2E] p-6 rounded-2xl backdrop-blur-md min-h-[300px]">
                                <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Status das Metas</h3>
                                {statusChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                                {statusChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip 
                                                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '8px', color: '#111827' }} 
                                                itemStyle={{ color: '#111827' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-[250px] items-center justify-center text-gray-900 dark:text-white/40">Nenhuma meta para exibir</div>
                                )}
                            </div>

                            <div className="bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-200 dark:border-[#2E2E2E] p-6 rounded-2xl backdrop-blur-md min-h-[300px]">
                                <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Progresso por Setor (%)</h3>
                                {sectorChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={sectorChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <XAxis dataKey="name" stroke="#B3B3B3" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#B3B3B3" fontSize={12} tickLine={false} axisLine={false} />
                                            <RechartsTooltip 
                                                cursor={{ fill: '#2E2E2E', opacity: 0.4 }}
                                                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '8px', color: '#111827' }} 
                                            />
                                            <Bar dataKey="Progresso" radius={[4, 4, 0, 0]}>
                                                {sectorChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.Progresso >= 100 ? '#4ade80' : '#FF6B00'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-[250px] items-center justify-center text-gray-900 dark:text-white/40">Nenhum setor para exibir</div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* VIEW: SECTORS */}
                {view === 'sectors' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {['Comercial', 'RH', 'Tech', 'Administração', 'Financeiro'].map(sector => {
                            const sectorGoals = goals.filter(g => g.sector === sector);
                            if (sectorGoals.length === 0) return null;
                            const sTotal = sectorGoals.length;
                            const sCompleted = sectorGoals.filter(g => (g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0) >= 100).length;
                            const sRate = sTotal > 0 ? (sCompleted / sTotal) * 100 : 0;

                            return (
                                <motion.div key={sector} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-200 dark:border-[#2E2E2E] p-6 rounded-2xl backdrop-blur-md">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-2xl font-bold">{sector}</h3>
                                        <span className="px-3 py-1 bg-gray-100 dark:bg-[#2A2A2A] rounded-lg text-sm font-bold">{sTotal} Metas</span>
                                    </div>
                                    <div className="flex justify-between mb-2 text-sm text-gray-900 dark:text-white/60">
                                        <span>Progresso Geral do Setor</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{sRate.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-white dark:bg-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] rounded-full h-3 mb-6">
                                        <motion.div className={`h-full rounded-full ${getProgressBarColor(sRate)}`} initial={{ width: 0 }} animate={{ width: `${sRate}%` }} />
                                    </div>
                                    <div className="space-y-3">
                                        {sectorGoals.map(g => (
                                            <div key={g.id} className="flex justify-between items-center bg-gray-50 dark:bg-[#0E0E0E] p-3 rounded-lg border border-gray-200 dark:border-[#2E2E2E]">
                                                <span className="truncate max-w-[60%] font-medium text-sm">{g.title}</span>
                                                <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-[#2A2A2A] rounded-md">
                                                    {Math.min(100, g.target_value > 0 ? Math.round((g.current_value / g.target_value) * 100) : 0)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            <GoalEditModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} onSave={handleSaveGoal} onDelete={handleDeleteGoal} goal={editingGoal} users={users} />
        </div>
    );
};


// === Edit Modal ===
interface GoalEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (goal: Goal) => void;
    onDelete: (goalId: string) => void;
    goal: Goal | null;
    users: User[];
}

const GoalEditModal: React.FC<GoalEditModalProps> = ({ isOpen, onClose, onSave, onDelete, goal, users }) => {
    const [formData, setFormData] = useState<Partial<Goal>>({});
    const [newSubgoalText, setNewSubgoalText] = useState('');

    useEffect(() => {
        if (goal) {
            setFormData(goal);
        } else {
            setFormData({
                title: '', description: '', current_value: 0, target_value: 100, metric: 'count',
                category: 'quantity', scope: 'individual', sector: 'Comercial', priority: 'medium',
                status: 'active', color: '#FF6B00', weight: 1, allow_overflow: false,
                start_date: new Date().toISOString().split('T')[0],
                subgoals: []
            });
        }
    }, [goal]);

    const handleAddSubgoal = () => {
        if (!newSubgoalText.trim()) return;
        const sub = { id: 'sub_' + Date.now(), text: newSubgoalText, completed: false };
        setFormData(prev => {
            const newSubgoals = [...(prev.subgoals || []), sub];
            return {
                ...prev,
                subgoals: newSubgoals,
                target_value: newSubgoals.length,
                current_value: newSubgoals.filter(s => s.completed).length,
                metric: 'count'
            };
        });
        setNewSubgoalText('');
    };

    const handleRemoveSubgoal = (id: string) => {
        setFormData(prev => {
            const newSubgoals = (prev.subgoals || []).filter(s => s.id !== id);
            return {
                ...prev,
                subgoals: newSubgoals,
                target_value: newSubgoals.length > 0 ? newSubgoals.length : prev.target_value,
                current_value: newSubgoals.length > 0 ? newSubgoals.filter(s => s.completed).length : prev.current_value
            };
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-[#2E2E2E] rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-[#888] hover:text-gray-900 dark:text-white p-2 bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-100 rounded-full"><XIcon className="w-5 h-5" /></button>
                    <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{goal ? 'Editar Meta' : 'Nova Meta'}</h2>
                    <p className="text-sm text-gray-500 dark:text-[#888] mb-6">Defina os parâmetros para acompanhamento de performance.</p>

                    <form onSubmit={e => { e.preventDefault(); onSave(formData as Goal); }} className="space-y-5 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Título da Meta</label>
                            <input type="text" name="title" value={formData.title || ''} onChange={handleChange} required className="w-full p-3 bg-white dark:bg-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] border border-gray-200 dark:border-[#2E2E2E] rounded-xl focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition-all text-gray-900 dark:text-white placeholder-[#B3B3B3]" placeholder="Ex: Fechar 40 propostas comerciais" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Descrição / Observações</label>
                            <textarea name="description" rows={2} value={formData.description || ''} onChange={handleChange} className="w-full p-3 bg-white dark:bg-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] border border-gray-200 dark:border-[#2E2E2E] rounded-xl focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition-all text-gray-900 dark:text-white resize-none placeholder-[#B3B3B3]" placeholder="Detalhes adicionais sobre o objetivo..." />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Setor</label>
                                <select name="sector" value={formData.sector || ''} onChange={handleChange} className="w-full p-3 bg-white dark:bg-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] border border-gray-200 dark:border-[#2E2E2E] rounded-xl text-gray-900 dark:text-white">
                                    <option value="Comercial">Comercial</option>
                                    <option value="RH">RH</option>
                                    <option value="Tech">Tech</option>
                                    <option value="Administração">Administração</option>
                                    <option value="Financeiro">Financeiro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Responsável</label>
                                <select name="responsible_id" value={formData.responsible_id || ''} onChange={handleChange} className="w-full p-3 bg-white dark:bg-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] border border-gray-200 dark:border-[#2E2E2E] rounded-xl text-gray-900 dark:text-white">
                                    <option value="">Sem responsável</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Métrica</label>
                                <select name="metric" value={formData.metric || ''} onChange={handleChange} className="w-full p-3 bg-white dark:bg-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] border border-gray-200 dark:border-[#2E2E2E] rounded-xl text-gray-900 dark:text-white">
                                    <option value="count">Quantidade (Unidades)</option>
                                    <option value="BRL">Financeiro (R$)</option>
                                    <option value="%">Porcentagem (%)</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-100 p-4 rounded-xl border border-gray-200 dark:border-[#2E2E2E] space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Submetas (Checklist Semanal/Mensal)</h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newSubgoalText} 
                                    onChange={e => setNewSubgoalText(e.target.value)} 
                                    placeholder="Adicionar submeta..." 
                                    className="flex-1 p-2 bg-white dark:bg-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-sm text-gray-900 dark:text-white focus:border-[#FF6B00] outline-none" 
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubgoal())}
                                />
                                <button type="button" onClick={handleAddSubgoal} className="px-4 py-2 bg-[#FF6B00] hover:bg-[#FF8C33] text-white font-bold rounded-lg text-sm">Adicionar</button>
                            </div>
                            {formData.subgoals && formData.subgoals.length > 0 && (
                                <div className="space-y-2 mt-4 max-h-40 overflow-y-auto custom-scrollbar">
                                    {formData.subgoals.map(sub => (
                                        <div key={sub.id} className="flex justify-between items-center bg-gray-100 dark:bg-[#2A2A2A] p-2 rounded-lg border border-gray-200 dark:border-[#2E2E2E]">
                                            <span className="text-sm text-gray-900 dark:text-white/80 line-clamp-1 flex-1 mr-2">{sub.text}</span>
                                            <button type="button" onClick={() => handleRemoveSubgoal(sub.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2Icon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {formData.subgoals && formData.subgoals.length > 0 && (
                                <p className="text-xs text-[#FF6B00]">O progresso desta meta agora é calculado automaticamente pelas submetas.</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className={`bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-100 p-4 rounded-xl border border-gray-200 dark:border-[#2E2E2E] transition-opacity ${formData.subgoals && formData.subgoals.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Progresso Atual</label>
                                <input type="number" step="any" name="current_value" value={formData.current_value || 0} onChange={handleChange} className="w-full p-3 bg-white dark:bg-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] border border-gray-200 dark:border-[#2E2E2E] rounded-xl text-gray-900 dark:text-white text-xl font-bold" />
                            </div>
                            <div className={`bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-100 p-4 rounded-xl border border-gray-200 dark:border-[#2E2E2E] transition-opacity ${formData.subgoals && formData.subgoals.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                                <label className="block text-sm font-semibold text-[#FF6B00] mb-1">Objetivo (Alvo)</label>
                                <input type="number" step="any" name="target_value" value={formData.target_value || 0} onChange={handleChange} className="w-full p-3 bg-white dark:bg-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] border border-[#FF6B00]/30 rounded-xl text-gray-900 dark:text-white text-xl font-bold" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Data de Início</label>
                                <input type="date" name="start_date" value={formData.start_date ? formData.start_date.split('T')[0] : ''} onChange={handleChange} className="w-full p-3 bg-white dark:bg-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] border border-gray-200 dark:border-[#2E2E2E] rounded-xl text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white/70 mb-1">Data Fim (Prazo)</label>
                                <input type="date" name="end_date" value={formData.end_date ? formData.end_date.split('T')[0] : ''} onChange={handleChange} className="w-full p-3 bg-white dark:bg-[#1C1C1C] border border-gray-300 dark:border-[#3E3E3E] border border-gray-200 dark:border-[#2E2E2E] rounded-xl text-gray-900 dark:text-white" />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-100 rounded-xl border border-gray-200 dark:border-[#2E2E2E]">
                            <input type="checkbox" id="allow_overflow" name="allow_overflow" checked={!!formData.allow_overflow} onChange={handleChange} className="w-5 h-5 rounded bg-black border-gray-300 dark:border-[#3E3E3E] text-[#FF6B00] focus:ring-[#FF6B00]" />
                            <label htmlFor="allow_overflow" className="text-sm font-medium cursor-pointer">Permitir ultrapassar 100% da meta (exibir desempenho excedente)</label>
                        </div>

                        <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-[#2E2E2E]">
                            {goal ? (
                                <button type="button" onClick={() => onDelete(goal.id)} className="px-5 py-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 font-bold flex items-center transition-colors">
                                    <Trash2Icon className="w-4 h-4 mr-2" /> Excluir Meta
                                </button>
                            ) : <div></div>}
                            <div className="flex gap-3">
                                <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white dark:bg-[#1C1C1C] shadow-sm border border-gray-100 rounded-xl hover:bg-gray-100 dark:bg-[#2A2A2A] font-bold transition-colors">Cancelar</button>
                                <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-[#FF6B00] to-[#FF8C33] rounded-xl text-gray-900 dark:text-white font-bold hover:shadow-[0_0_15px_rgba(255,107,0,0.5)] transition-all">Salvar Meta</button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default GoalsScreen;
