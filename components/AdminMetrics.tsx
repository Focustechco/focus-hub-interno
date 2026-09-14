import React, { useMemo } from 'react';
import { Task, User, CheckIn, Goal } from '../types';
import { motion } from 'framer-motion';

interface AdminMetricsProps {
    tasks: Task[];
    users: User[];
    checkIns: CheckIn[];
    goals: Goal[];
}

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color }) => (
    <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E]"
    >
        <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{icon}</span>
            <h3 className="text-[#B3B3B3] text-sm font-medium">{title}</h3>
        </div>
        <p className={`text-3xl font-bold`} style={{ color }}>{value}</p>
        {subtitle && <p className="text-sm text-[#666] mt-1">{subtitle}</p>}
    </motion.div>
);

const AdminMetrics: React.FC<AdminMetricsProps> = ({ tasks, users, checkIns, goals }) => {
    const metrics = useMemo(() => {
        const now = new Date();
        const today = now.toDateString();
        const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Task metrics
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'concluida').length;
        const pendingTasks = tasks.filter(t => t.status === 'pendente').length;
        const inProgressTasks = tasks.filter(t => t.status === 'em_progresso').length;
        const overdueTasks = tasks.filter(t => {
            if (!t.dueDate || t.status === 'concluida') return false;
            return new Date(t.dueDate) < new Date();
        }).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // User metrics
        const totalUsers = users.length;
        const activeToday = new Set(
            checkIns
                .filter(c => new Date(c.checkInTime).toDateString() === today)
                .map(c => c.userId)
        ).size;

        // Check-in metrics
        const checkInsToday = checkIns.filter(c =>
            new Date(c.checkInTime).toDateString() === today
        ).length;
        const avgCheckInTime = (() => {
            const todayCheckIns = checkIns.filter(c =>
                new Date(c.checkInTime).toDateString() === today
            );
            if (todayCheckIns.length === 0) return '--:--';
            const avgMs = todayCheckIns.reduce((sum, c) => {
                const d = new Date(c.checkInTime);
                return sum + (d.getHours() * 60 + d.getMinutes());
            }, 0) / todayCheckIns.length;
            const hours = Math.floor(avgMs / 60);
            const mins = Math.round(avgMs % 60);
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        })();

        // Goal metrics
        const totalGoals = goals.length;
        const completedGoals = goals.filter(g => g.status === 'concluida').length;
        const avgGoalProgress = goals.length > 0
            ? Math.round(goals.reduce((sum, g) => sum + (g.currentValue / g.targetValue * 100), 0) / goals.length)
            : 0;

        return {
            totalTasks, completedTasks, pendingTasks, inProgressTasks, overdueTasks, completionRate,
            totalUsers, activeToday,
            checkInsToday, avgCheckInTime,
            totalGoals, completedGoals, avgGoalProgress,
        };
    }, [tasks, users, checkIns, goals]);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                📊 Métricas de Uso
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Total de Tarefas"
                    value={metrics.totalTasks}
                    icon="📋"
                    color="#FF6B00"
                />
                <MetricCard
                    title="Taxa de Conclusão"
                    value={`${metrics.completionRate}%`}
                    subtitle={`${metrics.completedTasks}/${metrics.totalTasks}`}
                    icon="✅"
                    color="#00C49F"
                />
                <MetricCard
                    title="Em Andamento"
                    value={metrics.inProgressTasks}
                    icon="🔄"
                    color="#00ADEF"
                />
                <MetricCard
                    title="Atrasadas"
                    value={metrics.overdueTasks}
                    icon="⚠️"
                    color={metrics.overdueTasks > 0 ? '#FF6B6B' : '#666'}
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Usuários Ativos Hoje"
                    value={metrics.activeToday}
                    subtitle={`de ${metrics.totalUsers} total`}
                    icon="👥"
                    color="#9B59B6"
                />
                <MetricCard
                    title="Check-ins Hoje"
                    value={metrics.checkInsToday}
                    icon="🕐"
                    color="#45B7D1"
                />
                <MetricCard
                    title="Horário Médio Entrada"
                    value={metrics.avgCheckInTime}
                    icon="⏰"
                    color="#96CEB4"
                />
                <MetricCard
                    title="Progresso das Metas"
                    value={`${metrics.avgGoalProgress}%`}
                    subtitle={`${metrics.completedGoals}/${metrics.totalGoals} concluídas`}
                    icon="🎯"
                    color="#FFEAA7"
                />
            </div>
        </div>
    );
};

export default AdminMetrics;
