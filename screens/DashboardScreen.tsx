import React, { useState, useMemo } from 'react';
import { User, Task, CheckIn, Post, Sector, Role, Screen, DailyChecklistItem, GoogleCalendarEvent } from '../types';
import api from '../services/api';
import { ClipboardIcon, ClockIcon, NewspaperIcon, TrendingUpIcon, CalendarIcon, LogInIcon, CheckCircle2Icon, FileTextIcon, TrophyIcon, CheckSquareIcon2, Trash2Icon } from '../components/icons';
import { formatDate } from '../src/utils/formatters';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip as RechartsTooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { useToast } from '../components/Toast';


interface DashboardScreenProps {
    currentUser: User;
    tasks: Task[];
    checkIns: CheckIn[];
    posts: Post[];
    users: User[];
    setActiveScreen: (screen: Screen) => void;
    dailyChecklistItems: DailyChecklistItem[];
    setDailyChecklistItems: (items: DailyChecklistItem[] | ((prev: DailyChecklistItem[]) => DailyChecklistItem[])) => void;
    setTaskViewOverride: (view: 'board' | 'checklist' | 'calendar' | null) => void;
    setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ currentUser, tasks, checkIns, posts, users, setActiveScreen, dailyChecklistItems, setDailyChecklistItems, setTaskViewOverride, setTasks }) => {
    const toast = useToast();
    const [selectedSector, setSelectedSector] = useState<'Comercial' | 'RH' | 'Tech' | 'Administração' | 'Financeiro' | 'all'>('all');
    const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchAgenda = async () => {
            try {
                const start = new Date();
                const end = new Date();
                end.setDate(end.getDate() + 30);
                const res = await api.get(`/agenda/events?start=${start.toISOString()}&end=${end.toISOString()}`);
                setGoogleEvents(res.data);
            } catch(e) {
                console.error(e);
            }
        };

        const fetchAnnouncements = async () => {
            try {
                const res = await api.get("/communication/announcements");
                setAnnouncements(res.data);
            } catch (err) {
                console.error(err);
            }
        };

        fetchAgenda();
        fetchAnnouncements();
    }, []);

    // Helper function to parse date string properly
    // Parse dates manually to avoid UTC interpretation that causes timezone issues
    // Supports formats: YYYY-MM-DD, YYYY-MM-DDTHH:mm, YYYY-MM-DD HH:MM:SS
    const parseDateAsLocal = (dateString: string): Date => {
        let datePart: string;
        let timePart: string | undefined;

        // Check for T separator (ISO format)
        if (dateString.includes('T')) {
            const parts = dateString.split('T');
            datePart = parts[0] || '';
            timePart = parts[1];
        }
        // Check for space separator (PostgreSQL format)
        else if (dateString.includes(' ')) {
            const parts = dateString.split(' ');
            datePart = parts[0] || '';
            timePart = parts[1];
        }
        // Date only
        else {
            datePart = dateString.slice(0, 10);
            timePart = undefined;
        }

        const dateParts = datePart.split('-').map(Number);
        const year = dateParts[0] || 2025;
        const month = dateParts[1] || 1;
        const day = dateParts[2] || 1;

        if (timePart) {
            const timeParts = timePart.split(':').map(Number);
            const hours = timeParts[0] || 0;
            const minutes = timeParts[1] || 0;
            return new Date(year, month - 1, day, hours, minutes);
        }

        // Date only - default to 9:00 AM
        return new Date(year, month - 1, day, 9, 0);
    };

    // Upcoming Event Data - Admin sees all, regular users see only their tasks
    const upcomingTasks = tasks
        .filter(t =>
            (currentUser.role === Role.ADMIN || t.assigneeId === currentUser.id) &&
            t.status !== 'concluida' &&
            t.dueDate
        )
        .map(t => ({ ...t, dueDateObj: parseDateAsLocal(t.dueDate!) }))
        .filter(t => {
            if (!t.dueDate) return false;
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const taskDateStr = t.dueDate.includes('T')
                ? t.dueDate.split('T')[0]
                : t.dueDate.includes(' ')
                    ? t.dueDate.split(' ')[0]
                    : t.dueDate.slice(0, 10);

            // If the task date is in the future, include it
            if (taskDateStr > todayStr) return true;

            // If the task date is today, include it REGARDLESS of time (so "Agenda" shows everything for today)
            if (taskDateStr === todayStr) {
                return true;
            }

            // If the task date is in the past, exclude it
            return false;
        }) // Only future events OR today's events
        .sort((a, b) => {
            // Sort by dueDateObj which is already correctly parsed
            return a.dueDateObj.getTime() - b.dueDateObj.getTime();
        });

    const upcomingAgendaEvents = googleEvents
        .filter(e => new Date(e.start_time) >= new Date(new Date().setHours(0,0,0,0)))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 3);

    const formatEventDate = (dateString?: string): string => {
        if (!dateString) return '';
        const date = parseDateAsLocal(dateString);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
        const hasTime = dateString.includes('T');

        if (date.toDateString() === today.toDateString()) {
            return hasTime ? `Hoje, às ${date.toLocaleTimeString('pt-BR', timeOptions)}` : 'Hoje';
        }
        if (date.toDateString() === tomorrow.toDateString()) {
            return hasTime ? `Amanhã, às ${date.toLocaleTimeString('pt-BR', timeOptions)}` : 'Amanhã';
        }

        // Use standard formatter for other dates
        return formatDate(dateString, hasTime);
    };


    // Check-in data
    const myLastCheckIn = checkIns
        .filter(c => c.userId === currentUser.id)
        .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())[0];
    const isCheckedIn = myLastCheckIn && !myLastCheckIn.checkOutTime;

    // Mural data -> Aviso data
    const latestAnnouncement = announcements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const latestAnnouncementAuthor = users.find(u => u.id === latestAnnouncement?.author_id);

    // --- Daily Summary Data (Admin only) ---
    const isToday = (dateStr: string) => new Date(dateStr).toDateString() === new Date().toDateString();
    const checkInsToday = (checkIns || []).filter(c => isToday(c.checkInTime)).length;

    // Real metrics calculation
    const tasksCompletedToday = (tasks || []).filter(t =>
        t.status === 'concluida' && t.dueDate && isToday(t.dueDate)
    ).length;
    const totalTasks = (tasks || []).length;
    const completedTasks = (tasks || []).filter(t => t.status === 'concluida').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const lastReport = checkIns
        .filter(c => c.dailyReport && c.checkOutTime)
        .sort((a, b) => new Date(b.checkOutTime!).getTime() - new Date(a.checkOutTime!).getTime())[0];
    const reportAuthor = lastReport ? users.find(u => u.id === lastReport.userId) : null;


    // --- Chart Data ---

    // 1. Pie Chart: Tasks by Status (all tasks)
    const tasksByStatus = tasks.reduce((acc, task) => {
        if (task.status === 'pendente') acc.pendente++;
        else if (task.status === 'em_progresso') acc.emProgresso++;
        else if (task.status === 'concluida') acc.concluida++;
        return acc;
    }, { pendente: 0, emProgresso: 0, concluida: 0 });

    const pieData = [
        { name: 'Pendentes', value: tasksByStatus.pendente },
        { name: 'Em Progresso', value: tasksByStatus.emProgresso },
        { name: 'Concluídas', value: tasksByStatus.concluida },
    ];
    const PIE_COLORS: { [key: string]: string } = {
        'Pendentes': '#FFBB28',
        'Em Progresso': '#00ADEF',
        'Concluídas': '#00C49F'
    };

    // 2. Bar Chart: Productivity by Sector (completed tasks)
    const completedTasksBySector = useMemo(() => {
        // Start with taxs
        const acc = tasks.reduce((acc, task) => {
            if (task.status === 'concluida') {
                const assignee = users.find(u => u.id === task.assigneeId);
                if (assignee) {
                    if (!acc[assignee.sector]) {
                        acc[assignee.sector] = 0;
                    }
                    acc[assignee.sector]++;
                }
            }
            return acc;
        }, {} as Record<Sector, number>);

        // Add daily checklist items
        dailyChecklistItems.forEach(item => {
            if (item.completed) {
                const itemOwner = users.find(u => u.id === item.userId);
                if (itemOwner && itemOwner.sector) {
                    if (!acc[itemOwner.sector]) {
                        acc[itemOwner.sector] = 0;
                    }
                    acc[itemOwner.sector]++;
                }
            }
        });

        return acc;
    }, [tasks, users, dailyChecklistItems]);

    const barData = useMemo(() => {
        const allData = [
            { name: 'Comercial', tarefas: completedTasksBySector['Comercial'] || 0 },
            { name: 'RH', tarefas: completedTasksBySector['RH'] || 0 },
            { name: 'Tech', tarefas: completedTasksBySector['Tech'] || 0 },
            { name: 'Administração', tarefas: completedTasksBySector['Administração'] || 0 },
            { name: 'Financeiro', tarefas: completedTasksBySector['Financeiro'] || 0 },
        ];

        if (selectedSector === 'all') {
            return allData;
        }

        return allData.filter(d => d.name === selectedSector);
    }, [completedTasksBySector, selectedSector]);

    const SECTOR_COLORS: { [key: string]: string } = {
        Comercial: '#FF6B00',
        RH: '#7A00FF',
        Tech: '#00ADEF',
        Administração: '#00C49F',
        Financeiro: '#FFBB28',
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.1,
                duration: 0.5,
                ease: 'easeOut'
            }
        })
    };

    // --- Daily Checklist Data ---
    const _now = new Date();
    const localTodayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    const myDailyTasks = dailyChecklistItems.filter(item => item.userId === currentUser.id && item.date === localTodayStr);
    const myCompletedDailyTasks = myDailyTasks.filter(item => item.completed);
    const dailyProgress = (myDailyTasks || []).length > 0 ? (myCompletedDailyTasks.length / myDailyTasks.length) * 100 : 0;
    const incompleteDailyTasks = myDailyTasks.filter(item => !item.completed).slice(0, 5);

    const handleToggleDailyTask = async (taskId: string) => {
        // Find existing task state
        const task = dailyChecklistItems.find(t => t.id === taskId);
        if (!task) return;

        const newCompleted = !task.completed;

        // Optimistic update
        setDailyChecklistItems(prev =>
            prev.map(item =>
                item.id === taskId ? { ...item, completed: newCompleted } : item
            )
        );

        try {
            await api.put(`/daily-checklist/${taskId}`, { completed: newCompleted });
        } catch (error) {
            console.error("Failed to update daily checklist:", error);
            // Revert on failure
            setDailyChecklistItems(prev =>
                prev.map(item =>
                    item.id === taskId ? { ...item, completed: !newCompleted } : item
                )
            );
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;
        try {
            await api.delete(`/tasks/${taskId}`);
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (error) {
            console.error('Failed to delete task:', error);
            toast.error('Erro ao excluir tarefa.');
        }
    };

    // const debugInfo = null;

    return (
        <div>
            {/* {debugInfo} */}
            <h1 className="text-3xl font-bold mb-2">Bem-vindo(a) de volta, {currentUser.name.split(' ')[0]}!</h1>
            <p className="text-[#B3B3B3] mb-8">Aqui está um resumo das suas atividades e da sua equipe.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Agenda Summary */}
                <motion.div
                    custom={0}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="bg-[#1C1C1C] p-6 rounded-2xl shadow-lg shadow-[#FF6B00]/10 flex flex-col justify-between min-h-[170px]">
                    <div>
                        <div className="flex items-start">
                            <div className="bg-[#FF6B00]/20 p-3 rounded-full mr-4">
                                <CalendarIcon className="w-6 h-6 text-[#FF6B00]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Próximos Eventos</h3>
                                {upcomingAgendaEvents.length > 0 ? (
                                    <div className="mt-2 space-y-3">
                                        {upcomingAgendaEvents.map(event => (
                                            <div key={event.id} className="flex justify-between items-start group">
                                                <div className="flex-1 min-w-0 mr-2">
                                                    <p className="text-base font-bold text-white truncate" title={event.title}>
                                                        {event.title}
                                                    </p>
                                                    <p className="text-xs text-[#B3B3B3]">
                                                        {formatEventDate(event.start_time)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-lg text-[#B3B3B3] mt-4">
                                        Sua agenda está livre.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setActiveScreen('agenda');
                        }}
                        className="mt-4 text-center text-sm font-semibold text-[#FF6B00] hover:underline"
                    >
                        Ver Agenda Completa
                    </button>
                </motion.div>

                {/* Check-in Status */}
                <motion.div
                    custom={1}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="bg-[#1C1C1C] p-6 rounded-2xl shadow-lg shadow-[#FF6B00]/10 flex items-start min-h-[170px]">
                    <div className={`p-3 rounded-full mr-4 ${isCheckedIn ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        <ClockIcon className={`w-6 h-6 ${isCheckedIn ? 'text-green-400' : 'text-red-400'}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Status do Ponto</h3>
                        {isCheckedIn ? (
                            <>
                                <p className="text-3xl font-bold mt-1 text-green-400">Ativo</p>
                                <p className="text-sm text-[#B3B3B3] mt-1">
                                    Check-in às {new Date(myLastCheckIn.checkInTime).toLocaleTimeString()}
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-3xl font-bold mt-1 text-red-400">Inativo</p>
                                <p className="text-sm text-[#B3B3B3] mt-1">
                                    {myLastCheckIn && myLastCheckIn.checkOutTime ? `Último check-out às ${new Date(myLastCheckIn.checkOutTime).toLocaleTimeString()}` : "Nenhum registro hoje."}
                                </p>
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Latest Post / Announcement */}
                <motion.div
                    custom={2}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -5, scale: 1.02 }}
                    onClick={() => setActiveScreen('mural')}
                    className="bg-[#1C1C1C] p-6 rounded-2xl shadow-lg shadow-[#FF6B00]/10 flex items-start min-h-[170px] cursor-pointer">
                    <div className="bg-[#00ADEF]/20 p-3 rounded-full mr-4">
                        <NewspaperIcon className="w-6 h-6 text-[#00ADEF]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Último Aviso do Mural</h3>
                        {latestAnnouncement ? (
                            <>
                                <p className="text-sm text-[#B3B3B3] mt-2 line-clamp-3 font-bold">"{latestAnnouncement.title}"</p>
                                <p className="text-sm text-[#B3B3B3] mt-1 line-clamp-2">{latestAnnouncement.content}</p>
                                <p className="text-xs text-right text-gray-400 mt-2">- {latestAnnouncementAuthor?.name || 'Administração'}</p>
                            </>
                        ) : (
                            <p className="text-sm text-[#B3B3B3] mt-2">Nenhum aviso no mural ainda.</p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* NEW SECTION: Separated Tasks Cards */}
            <div className="flex flex-col gap-6 mt-8">
                {/* Daily Checklist Card */}
                <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="bg-[#1C1C1C] p-6 rounded-2xl shadow-lg shadow-[#FF6B00]/10 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold flex items-center"><CheckSquareIcon2 className="w-5 h-5 mr-2 text-white" /> Checklist Diário</h2>
                        <button onClick={() => setActiveScreen('tasks')} className="text-sm font-semibold text-[#FF6B00] hover:underline">
                            Ver todas
                        </button>
                    </div>
                    {(myDailyTasks || []).length > 0 ? (
                        <>
                            <div className="w-full bg-[#2E2E2E] rounded-full h-2.5 mb-4">
                                <motion.div
                                    className="bg-[#FF6B00] h-2.5 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${dailyProgress}%` }}
                                    transition={{ duration: 1, ease: "circOut" }}
                                />
                            </div>
                            <p className="text-sm text-center text-[#B3B3B3] mb-4">
                                Você concluiu {Math.round(dailyProgress)}% do seu checklist de hoje!
                            </p>
                            <ul className="space-y-3">
                                {incompleteDailyTasks.map(task => (
                                    <li key={task.id} className="flex items-center p-3 bg-[#2E2E2E] rounded-md transition-colors hover:bg-[#3a3a3a]">
                                        <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() => handleToggleDailyTask(task.id)}
                                            className="h-5 w-5 rounded bg-[#1C1C1C] border-gray-600 text-[#FF6B00] focus:ring-[#FF8C33] cursor-pointer"
                                        />
                                        <span className={`ml-3 font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>{task.text}</span>
                                    </li>
                                ))}
                                {(incompleteDailyTasks || []).length === 0 && (myDailyTasks || []).length > 0 && (
                                    <p className="text-center text-green-400 font-semibold p-4">🎉 Todas as tarefas do dia foram concluídas!</p>
                                )}
                            </ul>
                        </>
                    ) : (
                        <p className="text-center text-[#B3B3B3] py-4">Nenhuma tarefa adicionada ao seu checklist de hoje. Vá para a tela de Tarefas para adicionar.</p>
                    )}
                </motion.div>

                {/* Pending Tasks Card */}
                <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="bg-[#1C1C1C] p-6 rounded-2xl shadow-lg shadow-[#FF6B00]/10 flex flex-col">
                    <h2 className="text-xl font-bold mb-4">Minhas Tarefas Pendentes</h2>
                    {(tasks || []).filter(t => t.assigneeId === currentUser.id && t.status === 'pendente').length > 0 ? (
                        <ul className="space-y-3">
                            {tasks.filter(t => t.assigneeId === currentUser.id && t.status === 'pendente').slice(0, 5).map(task => (
                                <li key={task.id} className="flex justify-between items-center p-3 bg-[#2E2E2E] rounded-md">
                                    <span className="font-semibold">{task.title}</span>
                                    <span className={`px-2 py-1 text-xs rounded-full capitalize font-semibold ${task.priority === 'alta' ? 'bg-red-500/20 text-red-400' :
                                        task.priority === 'media' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-green-500/20 text-green-400'
                                        }`}>
                                        {task.priority}
                                    </span>
                                    {(currentUser.role === Role.ADMIN || task.assigneeId === currentUser.id) && (
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="ml-2 text-gray-500 hover:text-red-500 transition-colors"
                                            title="Excluir tarefa"
                                        >
                                            <Trash2Icon className="w-4 h-4" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-[#B3B3B3]">Você não tem tarefas pendentes. Bom trabalho!</p>
                    )}
                </motion.div>
            </div>

            {/* NEW SECTION: Daily Summary (Admin only) */}
            {currentUser.role === Role.ADMIN && (
                <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible" className="mt-8 bg-[#1C1C1C] p-6 rounded-2xl shadow-lg shadow-[#FF6B00]/10">
                    <h2 className="text-xl font-bold mb-4 flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-2 text-[#B3B3B3]" />
                        Resumo do Dia
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                        <div className="bg-[#0E0E0E] p-4 rounded-lg flex flex-col items-center justify-center">
                            <LogInIcon className="w-8 h-8 text-green-400 mb-2" />
                            <p className="text-3xl font-bold">{checkInsToday}</p>
                            <p className="text-sm text-[#B3B3B3] mt-1">Check-ins Hoje</p>
                        </div>
                        <div className="bg-[#0E0E0E] p-4 rounded-lg flex flex-col items-center justify-center">
                            <CheckCircle2Icon className="w-8 h-8 text-[#00ADEF] mb-2" />
                            <p className="text-3xl font-bold">{tasksCompletedToday}</p>
                            <p className="text-sm text-[#B3B3B3] mt-1">Tarefas Concluídas</p>
                        </div>
                        <div className="bg-[#0E0E0E] p-4 rounded-lg flex flex-col items-center justify-center min-h-[140px] w-full overflow-hidden">
                            <FileTextIcon className="w-8 h-8 text-[#7A00FF] mb-2 shrink-0" />
                            {lastReport && reportAuthor ? (
                                <div className="w-full flex flex-col items-center min-w-0">
                                    <p className="text-lg font-bold truncate w-full text-center px-1" title={reportAuthor.name}>{reportAuthor.name}</p>
                                    <a href="#" className="text-sm text-[#00ADEF] hover:underline mt-1" onClick={(e) => e.preventDefault()}>Último Relatório</a>
                                </div>
                            ) : (
                                <div className='flex flex-col items-center justify-center h-full w-full'>
                                    <p className="text-sm text-[#B3B3B3] text-center">Nenhum relatório</p>
                                </div>
                            )}
                        </div>
                        <div className="bg-[#0E0E0E] p-4 rounded-lg flex flex-col items-center justify-center min-h-[140px]">
                            <TrophyIcon className="w-8 h-8 text-yellow-400 mb-2" />
                            <p className="text-sm text-white italic leading-tight">"🚀 A cada entrega, um passo mais perto da meta!"</p>
                        </div>
                    </div>
                </motion.div>
            )}


            {/* SECTION: Indicators and Graphs */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                    <TrendingUpIcon className="w-6 h-6 mr-2 text-[#B3B3B3]" />
                    Visão Geral do Desempenho da Equipe
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Task Progress Chart */}
                    <motion.div custom={currentUser.role === Role.ADMIN ? 6 : 5} variants={cardVariants} initial="hidden" animate="visible" className="bg-[#1C1C1C] p-6 rounded-2xl shadow-lg shadow-[#FF6B00]/10">
                        <h3 className="text-lg font-semibold text-white mb-4">Progresso das Tarefas</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#2E2E2E', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#FFFFFF' }}
                                    />
                                    <Legend formatter={(value, entry) => <span className="text-white">{value}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Productivity by Sector Chart */}
                    <motion.div custom={currentUser.role === Role.ADMIN ? 7 : 6} variants={cardVariants} initial="hidden" animate="visible" className="bg-[#1C1C1C] p-6 rounded-2xl shadow-lg shadow-[#FF6B00]/10">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                            <h3 className="text-lg font-semibold text-white">Produtividade por Setor</h3>
                            <div className="flex items-center gap-1 bg-[#0E0E0E] p-1 rounded-md self-start sm:self-center">
                                {(['all', 'Comercial', 'RH', 'Tech', 'Administração', 'Financeiro'] as const).map(sector => (
                                    <button
                                        key={sector}
                                        onClick={() => setSelectedSector(sector)}
                                        className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${selectedSector === sector ? 'bg-[#FF6B00] text-white' : 'text-[#B3B3B3] hover:bg-[#2E2E2E]'
                                            }`}
                                    >
                                        {sector === 'all' ? 'Todos' : sector}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={barData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2E" />
                                    <XAxis dataKey="name" stroke="#B3B3B3" />
                                    <YAxis stroke="#B3B3B3" />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#2E2E2E', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#FFFFFF' }}
                                        cursor={{ fill: '#2E2E2E' }}
                                    />
                                    <Bar dataKey="tarefas" name="Tarefas Concluídas" fill="#8884d8">
                                        {barData.map((entry) => (
                                            <Cell key={`cell-${entry.name}`} fill={SECTOR_COLORS[entry.name]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default DashboardScreen;