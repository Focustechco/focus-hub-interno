import React, { useState, useMemo, useEffect } from 'react';
import { Task, User, Goal, Notification, NotificationPreferences, DailyChecklistItem, NotificationType, TaskStatus, TaskPriority, Role, OfflineAction, Subtask, Sector } from '../types';
import { PlusIcon, FilterIcon, EditIcon, Trash2Icon, XIcon, SearchIcon, CalendarIcon, ClipboardIcon, CheckSquareIcon, CloudOffIcon, ClockIcon, MapPinIcon, RepeatIcon } from '../components/icons';
import { formatDate } from '../src/utils/formatters';
import { downloadICS, taskToCalendarEvent } from '../src/utils/calendar';
import { generateCSV, openInGoogleSheets, taskColumns } from '../src/utils/sheets';
import { triggerDiscordWebhook } from '../src/utils/webhooks';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import CalendarView from './CalendarView';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '../components/Toast';
import TaskSidePanel from '../components/TaskSidePanel';


interface TasksScreenProps {
    currentUser: User;
    tasks: Task[];
    users: User[];
    goals: Goal[];
    setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
    setNotifications: (notifications: (prev: Notification[]) => Notification[]) => void;
    notificationPreferences: { [userId: string]: NotificationPreferences };
    dailyChecklistItems: DailyChecklistItem[];
    setDailyChecklistItems: (items: DailyChecklistItem[] | ((prev: DailyChecklistItem[]) => DailyChecklistItem[])) => void;
    taskViewOverride: 'board' | 'checklist' | 'calendar' | null;
    setTaskViewOverride: (view: 'board' | 'checklist' | 'calendar' | null) => void;
    isOnline: boolean;
    setOfflineActionQueue: React.Dispatch<React.SetStateAction<OfflineAction[]>>;
    mode?: 'tasks' | 'agenda';
}

const statusConfig: { [key in TaskStatus]: { label: string; color: string; border: string; } } = {
    pendente: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-400', border: 'border-yellow-500' },
    em_progresso: { label: 'Em Progresso', color: 'bg-blue-500/10 text-blue-400', border: 'border-blue-500' },
    concluida: { label: 'Concluída', color: 'bg-green-500/10 text-green-400', border: 'border-green-500' },
};

const priorityConfig: { [key in TaskPriority]: { label: string; color: string } } = {
    baixa: { label: 'Baixa', color: 'bg-green-500/20 text-green-400' },
    media: { label: 'Média', color: 'bg-yellow-500/20 text-yellow-400' },
    alta: { label: 'Alta', color: 'bg-red-500/20 text-red-400' },
};

const formatEstimatedTime = (minutes: number) => {
    if (!minutes || minutes <= 0) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    return parts.join(' ');
};

const TasksScreen: React.FC<TasksScreenProps> = ({ currentUser, tasks, users, goals, setTasks, setNotifications, notificationPreferences, dailyChecklistItems, setDailyChecklistItems, taskViewOverride, setTaskViewOverride, isOnline, setOfflineActionQueue, mode = 'tasks' }) => {
    const toast = useToast();
    const [view, setView] = useState<'board' | 'checklist' | 'calendar'>(mode === 'agenda' ? 'calendar' : 'board');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [selectedTaskToView, setSelectedTaskToView] = useState<Task | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAssignee, setFilterAssignee] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');

    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [selectedUserIdForChecklist, setSelectedUserIdForChecklist] = useState<string>(currentUser.id);

    useEffect(() => {
        setView(mode === 'agenda' ? 'calendar' : 'board');
    }, [mode]);

    useEffect(() => {
        if (taskViewOverride) {
            setView(taskViewOverride);
            setTaskViewOverride(null); // Consume the override
        }
    }, [taskViewOverride, setTaskViewOverride]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAssignee = filterAssignee === 'all' || task.assigneeId === filterAssignee;
            const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
            return matchesSearch && matchesAssignee && matchesPriority;
        });
    }, [tasks, searchTerm, filterAssignee, filterPriority]);

    const columns: { id: TaskStatus; title: string; tasks: Task[] }[] = [
        { id: 'pendente', title: 'Pendente', tasks: filteredTasks.filter(t => t.status === 'pendente') },
        { id: 'em_progresso', title: 'Em Progresso', tasks: filteredTasks.filter(t => t.status === 'em_progresso') },
        { id: 'concluida', title: 'Concluída', tasks: filteredTasks.filter(t => t.status === 'concluida') },
    ];

    const date = new Date();
    const todayStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // Normalize date comparison - backend may return 'YYYY-MM-DDTHH:mm' or 'YYYY-MM-DD HH:MM:SS' format
    const normalizeDate = (d: string) => {
        if (!d) return '';
        if (d.includes('T')) return d.split('T')[0];
        if (d.includes(' ')) return d.split(' ')[0];
        return d.slice(0, 10);
    };
    // Use selectedUserIdForChecklist for admins, otherwise current user
    const activeChecklistUserId = currentUser.role === Role.ADMIN ? selectedUserIdForChecklist : currentUser.id;
    const myDailyTasks = dailyChecklistItems.filter(item => item.userId === activeChecklistUserId && normalizeDate(item.date) === todayStr);

    const teamChecklistProgress = useMemo(() => {
        if (currentUser.role !== Role.ADMIN) return [];

        const todayItems = dailyChecklistItems.filter(item => normalizeDate(item.date) === todayStr);

        const itemsByUser = todayItems.reduce((acc, item) => {
            if (!acc[item.userId]) {
                acc[item.userId] = [];
            }
            acc[item.userId].push(item);
            return acc;
        }, {} as Record<string, DailyChecklistItem[]>);

        return users
            .map(user => {
                const userItems = itemsByUser[user.id] || [];
                if ((userItems || []).length === 0) return null;

                const completed = (userItems || []).filter(i => i.completed).length;
                const total = (userItems || []).length;
                const progress = total > 0 ? (completed / total) * 100 : 0;

                return {
                    user,
                    completed,
                    total,
                    progress,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => (a.user.id === currentUser.id ? -1 : b.user.id === currentUser.id ? 1 : a.user.name.localeCompare(b.user.name)));
    }, [dailyChecklistItems, users, currentUser, todayStr]);

    const handleOpenModal = (task: Task | null) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => {
        // Keep dueDate in local format (YYYY-MM-DD or YYYY-MM-DDTHH:mm) to avoid timezone issues
        const payload = { ...taskData };
        // No conversion needed - keep the local datetime string as-is

        if (!isOnline) {
            // ... (Offline logic remains the same for now, using payload)
            console.log("[Offline] Salvando tarefa offline.");
            if (payload.assigneeId === 'ALL_USERS' && currentUser.role === Role.ADMIN) {
                // ... (Offline bulk assign logic omitted for brevity, logic should use payload)
            } else {
                setOfflineActionQueue(prev => [...prev, { type: editingTask ? 'UPDATE_TASK' : 'CREATE_TASK', payload: { ...payload, id: editingTask?.id || `temp-${Date.now()}` } as any, timestamp: Date.now() }]);
                // Optimistic update
                const savedTask = { ...payload, id: editingTask?.id || `temp-${Date.now()}`, createdAt: new Date().toISOString() } as Task;
                setTasks(prev => editingTask ? prev.map(t => t.id === savedTask.id ? savedTask : t) : [savedTask, ...prev]);
                handleCloseModal();
                return;
            }
        } else {
            // ONLINE LOGIC
            try {
                if (payload.assigneeId === 'ALL_USERS' && currentUser.role === Role.ADMIN) {
                    // Bulk Create
                    const promises = users
                        .filter(u => u.role !== Role.ADMIN)
                        .map(user => {
                            const newTask = { ...payload, assigneeId: user.id, id: `t-${Date.now()}-${user.id}` }; // ID will be ignored by DB
                            return api.post('/tasks', newTask);
                        });

                    const responses = await Promise.all(promises);
                    const newTasks = responses.map(r => r.data);
                    setTasks(prev => [...newTasks, ...prev]);

                } else {
                    // Treat as editing only if it has an ID and it's not a temporary one from Calendar creation
                    const isEditing = !!editingTask && !!editingTask.id && !editingTask.id.toString().startsWith('new-');
                    let savedTask: Task;

                    if (isEditing) {
                        const response = await api.put(`/tasks/${editingTask.id}`, payload);
                        savedTask = (response.data?.task || response.data || { ...editingTask, ...payload }) as Task;
                        setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t));

                        // Re-fetch after update to ensure UI reflects persisted DB state
                        const tasksResponse = await api.get('/tasks');
                        if (Array.isArray(tasksResponse.data)) {
                            setTasks(tasksResponse.data);
                        }
                    } else {
                        const response = await api.post('/tasks', payload);
                        // Use response.data to get the real task from backend
                        savedTask = (response.data || { ...payload, id: `t${Date.now()}`, createdAt: new Date().toISOString() }) as Task;
                        setTasks(prev => [savedTask, ...prev]);

                        // Trigger Discord webhook for new task
                        const assignee = users.find(u => u.id === savedTask.assigneeId);
                        triggerDiscordWebhook('task.created', {
                            Tarefa: savedTask.title,
                            Responsável: assignee?.name || 'Não atribuída',
                            Prioridade: savedTask.priority,
                            Prazo: savedTask.dueDate ? formatDate(savedTask.dueDate, true) : 'Sem prazo'
                        });

                        // Re-fetch to guarantee sync
                        api.get('/tasks').then(res => setTasks(res.data));
                    }
                }
            } catch (error) {
                console.error("Failed to save task:", error);
                toast.error("Erro ao salvar tarefa.");
            }
        }

        handleCloseModal();
    };

    const handleDeleteTask = async (taskId: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
            if (isOnline) {
                try {
                    await api.delete(`/tasks/${taskId}`);
                    setTasks(prev => prev.filter(t => t.id !== taskId));
                } catch (error) {
                    console.error('Failed to delete task:', error);
                    toast.error('Erro ao excluir tarefa.');
                }
            } else {
                console.log("[Offline] Excluindo tarefa offline.");
                setTasks(prev => prev.filter(t => t.id !== taskId));
                setOfflineActionQueue(prev => [...prev, { type: 'DELETE_TASK', payload: taskId, timestamp: Date.now() }]);
            }
        }
    };

    const handleAddChecklistItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChecklistItem.trim()) return;

        try {
            const res = await api.post('/daily-checklist', {
                userId: activeChecklistUserId,
                text: newChecklistItem.trim(),
                date: todayStr
            });
            setDailyChecklistItems(prev => [...prev, res.data]);
            setNewChecklistItem('');
        } catch (error: any) {
            console.error("Failed to add checklist item:", error);
            toast.error("Erro ao adicionar item ao checklist.");
        }
    };

    const handleToggleChecklistItem = async (itemId: string) => {
        // Find current state
        const item = dailyChecklistItems.find(i => i.id === itemId);
        if (!item) return;

        const newCompleted = !item.completed;

        // Optimistic update
        setDailyChecklistItems(prev => prev.map(item => item.id === itemId ? { ...item, completed: newCompleted } : item));

        try {
            await api.put(`/daily-checklist/${itemId}`, { completed: newCompleted });
        } catch (error) {
            console.error("Failed to toggle checklist item:", error);
            // Revert
            setDailyChecklistItems(prev => prev.map(item => item.id === itemId ? { ...item, completed: !newCompleted } : item));
        }
    };

    const handleDeleteChecklistItem = async (itemId: string) => {
        if (!window.confirm("Excluir este item?")) return;

        // Optimistic update
        const previousItems = dailyChecklistItems;
        setDailyChecklistItems(prev => prev.filter(item => item.id !== itemId));

        try {
            await api.delete(`/daily-checklist/${itemId}`);
        } catch (error) {
            console.error("Failed to delete checklist item:", error);
            // Revert
            setDailyChecklistItems(previousItems);
        }
    };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        const activeTask = tasks.find(t => t.id === activeId);

        if (activeTask && activeTask.status !== overId) {
            const newStatus = overId as TaskStatus;
            if (Object.keys(statusConfig).includes(newStatus)) {
                const updatedTask = { ...activeTask, status: newStatus };

                if (!isOnline) {
                    updatedTask.isOffline = true;
                    setOfflineActionQueue(prev => [...prev, { type: 'UPDATE_TASK', payload: updatedTask, timestamp: Date.now() }]);
                }

                setTasks(prev => prev.map(t => t.id === activeId ? updatedTask : t));
            }
        }
    };

    const handleSyncGoogle = async (task: Task) => {
        try {
            if (!task.dueDate) {
                toast.error("Defina uma data para a tarefa antes de sincronizar.");
                return;
            }

            toast.info("Sincronizando com Google Calendar...");

            // Send the dueDate as-is (local format) - server should handle timezone
            const taskPayload = {
                ...task,
                dueDate: task.dueDate // Keep local format, don't convert to UTC
            };

            const { data } = await api.post('/google/sync', { task: taskPayload });

            toast.success("Evento criado no Google Calendar!");
            if (data.link) {
                window.open(data.link, '_blank');
            }
        } catch (error: any) {
            console.error('Google Sync Error:', error);
            if (error.response?.status === 401) {
                toast.error("Google Calendar não conectado. Vá em Integrações.");
            } else {
                const errorMessage = error.response?.data?.error || error.message || 'Falha na sincronização';
                toast.error(`Erro: ${errorMessage}`);
            }
        }
    };

    return (
        <div className="h-full flex flex-col">
            <header className="mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">{mode === 'agenda' ? 'Agenda' : 'Gerenciador de Tarefas'}</h1>
                        <p className="text-[#B3B3B3]">{mode === 'agenda' ? 'Visualize suas tarefas no calendário.' : 'Organize, delegue e acompanhe o progresso da sua equipe.'}</p>
                    </div>
                    {mode === 'tasks' && (
                        <div className="flex items-center gap-2 bg-[#1C1C1C] p-1 rounded-lg">
                            <button onClick={() => setView('checklist')} className={`px-3 py-2 rounded-md flex items-center gap-2 text-sm font-semibold ${view === 'checklist' ? 'bg-[#FF6B00] text-white' : 'text-[#B3B3B3] hover:bg-[#2E2E2E]'}`}>
                                <CheckSquareIcon className="w-5 h-5" /> Checklist
                            </button>
                            <button onClick={() => setView('board')} className={`px-3 py-2 rounded-md flex items-center gap-2 text-sm font-semibold ${view === 'board' ? 'bg-[#FF6B00] text-white' : 'text-[#B3B3B3] hover:bg-[#2E2E2E]'}`}>
                                <ClipboardIcon className="w-5 h-5" /> Quadro
                            </button>
                        </div>
                    )}
                </div>

                {view !== 'checklist' && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="relative w-full sm:max-w-xs">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B3B3B3]" />
                            <input type="text" placeholder="Buscar tarefa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#1C1C1C] text-white rounded-lg py-2 pl-10 pr-4 focus:ring-1 focus:ring-[#FF6B00]" />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <button onClick={() => {
                                const events = tasks.map(t => taskToCalendarEvent(t));
                                downloadICS(events);
                                toast.success("Agenda exportada!");
                            }} className="p-2 text-[#B3B3B3] hover:text-[#FF6B00] transition-colors" title="Exportar para Google Calendar (.ics)">
                                <CalendarIcon className="w-6 h-6" />
                            </button>
                            <button onClick={() => {
                                const dataWithAssignee = filteredTasks.map(t => ({
                                    ...t,
                                    assigneeName: users.find(u => u.id === t.assigneeId)?.name || 'N/A'
                                }));
                                const csv = generateCSV(dataWithAssignee, taskColumns);
                                openInGoogleSheets(csv, 'Focus Hub - Tarefas');
                                toast.success("Dados copiados! Cole no Google Sheets (Ctrl+V).");
                            }} className="p-2 text-[#B3B3B3] hover:text-[#34A853] transition-colors" title="Exportar para Google Sheets">
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
                                    <path d="M7 7h4v2H7zm0 4h4v2H7zm0 4h4v2H7zm6-8h4v2h-4zm0 4h4v2h-4zm0 4h4v2h-4z" />
                                </svg>
                            </button>
                            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="flex-1 min-w-[100px] bg-[#1C1C1C] text-white rounded-lg py-2 px-3 focus:ring-1 focus:ring-[#FF6B00]">
                                <option value="all">Todos</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | 'all')} className="flex-1 min-w-[100px] bg-[#1C1C1C] text-white rounded-lg py-2 px-3 focus:ring-1 focus:ring-[#FF6B00]">
                                <option value="all">Prioridade</option>
                                <option value="alta">Alta</option>
                                <option value="media">Média</option>
                                <option value="baixa">Baixa</option>
                            </select>
                            <button onClick={() => handleOpenModal(null)} className="w-full sm:w-auto flex items-center justify-center bg-[#FF6B00] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#FF8C33] active:bg-[#CC5500] transition-colors mt-2 sm:mt-0">
                                <PlusIcon className="w-5 h-5 mr-2" /> Nova Tarefa
                            </button>
                        </div>
                    </div>
                )}
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                {view === 'checklist' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-[#1C1C1C] p-6 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold flex items-center"><CheckSquareIcon className="w-5 h-5 mr-2" /> {currentUser.role === Role.ADMIN && selectedUserIdForChecklist !== currentUser.id ? `Checklist de ${users.find(u => u.id === selectedUserIdForChecklist)?.name || 'Usuário'}` : 'Meu Checklist Diário'}</h2>
                                {currentUser.role === Role.ADMIN && (
                                    <select
                                        value={selectedUserIdForChecklist}
                                        onChange={e => setSelectedUserIdForChecklist(e.target.value)}
                                        className="bg-[#2E2E2E] text-white rounded-lg py-2 px-3 focus:ring-1 focus:ring-[#FF6B00] border border-[#2E2E2E] text-sm"
                                    >
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                )}
                            </div>
                            <form onSubmit={handleAddChecklistItem} className="flex gap-2 mb-4">
                                <input type="text" value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} placeholder="Adicionar item rápido..." className="flex-grow bg-[#2E2E2E] p-2 rounded-md focus:ring-1 focus:ring-[#FF6B00]" />
                                <button type="submit" className="bg-[#FF6B00] text-white px-4 rounded-md font-semibold hover:bg-[#FF8C33] disabled:opacity-50" disabled={!newChecklistItem.trim()}>Adicionar</button>
                            </form>
                            <ul className="space-y-2">
                                {myDailyTasks.map(item => (
                                    <li key={item.id} className="flex items-center p-2 bg-[#2E2E2E] rounded-md group">
                                        <input type="checkbox" checked={item.completed} onChange={() => handleToggleChecklistItem(item.id)} className="h-5 w-5 rounded bg-[#1C1C1C] border-gray-600 text-[#FF6B00] focus:ring-[#FF8C33] cursor-pointer" />
                                        <span className={`ml-3 flex-grow ${item.completed ? 'line-through text-gray-500' : ''}`}>{item.text}</span>
                                        <button onClick={() => handleDeleteChecklistItem(item.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2Icon className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                                {(myDailyTasks || []).length === 0 && <p className="text-center text-sm text-[#B3B3B3] pt-4">Checklist vazio para hoje.</p>}
                            </ul>
                        </div>
                        {currentUser.role === Role.ADMIN && (
                            <div className="mt-8 bg-[#1C1C1C] p-6 rounded-lg">
                                <h3 className="text-xl font-bold mb-4">Acompanhamento da Equipe (Hoje)</h3>
                                <div className="space-y-4">
                                    {teamChecklistProgress && teamChecklistProgress.length > 0 ? teamChecklistProgress.map(({ user, completed, total, progress }) => (
                                        <button
                                            key={user.id}
                                            onClick={() => setSelectedUserIdForChecklist(user.id)}
                                            className={`w-full text-left bg-[#2E2E2E] p-4 rounded-lg transition-all hover:ring-2 hover:ring-[#FF6B00] ${selectedUserIdForChecklist === user.id ? 'ring-2 ring-[#FF6B00]' : ''}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center">
                                                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                                                    <span className="font-semibold">{user.name}</span>
                                                </div>
                                                <span className="text-sm text-[#B3B3B3]">{completed}/{total} concluídas</span>
                                            </div>
                                            <div className="w-full bg-[#1C1C1C] rounded-full h-2.5">
                                                <div
                                                    className="bg-[#FF6B00] h-2.5 rounded-full"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </button>
                                    )) : <p className="text-center text-sm text-[#B3B3B3] pt-4">Nenhum checklist iniciado pela equipe hoje.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {view === 'board' && (
                    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                            {columns.map(column => (
                                <DroppableColumn key={column.id} column={column} users={users} currentUser={currentUser} onEdit={handleOpenModal} onDelete={handleDeleteTask} onSync={handleSyncGoogle} setTasks={setTasks} onView={setSelectedTaskToView} />
                            ))}
                        </div>
                    </DndContext>
                )}
                {view === 'calendar' && (
                    <CalendarView tasks={filteredTasks} users={users} onTaskClick={handleOpenModal} setTasks={setTasks} />
                )}
            </div>

            {isModalOpen && <TaskModal currentUser={currentUser} task={editingTask} users={users} goals={goals} onSave={handleSaveTask} onDelete={handleDeleteTask} onSync={handleSyncGoogle} onClose={handleCloseModal} />}
            
            {selectedTaskToView && (
                <TaskSidePanel 
                    event={selectedTaskToView} 
                    onClose={() => setSelectedTaskToView(null)} 
                    onEdit={() => { 
                        setSelectedTaskToView(null); 
                        handleOpenModal(selectedTaskToView); 
                    }} 
                    users={users} 
                />
            )}
        </div>
    );
};

const DroppableColumn: React.FC<{ column: { id: TaskStatus; title: string; tasks: Task[] }; users: User[]; currentUser: User; onEdit: (task: Task) => void; onDelete: (taskId: string) => void; onSync: (task: Task) => void; setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void; onView: (task: Task) => void }> = ({ column, users, currentUser, onEdit, onDelete, onSync, setTasks, onView }) => {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });

    return (
        <div
            ref={setNodeRef}
            className={`p-4 rounded-lg bg-[#0E0E0E] min-h-[200px] transition-all duration-300 border-2 ${isOver ? 'bg-[#2E2E2E] border-dashed border-[#FF6B00]' : 'border-transparent'}`}
        >
            <h3 className={`font-bold text-lg mb-4 flex items-center justify-between p-2 rounded-md ${statusConfig[column.id].color}`}>
                {column.title}
                <span className="text-sm font-normal">{(column.tasks || []).length}</span>
            </h3>
            <div className="space-y-4">
                {column.tasks.map(task => (
                    <DraggableTaskCard key={task.id} task={task} users={users} currentUser={currentUser} onEdit={onEdit} onDelete={onDelete} onSync={onSync} setTasks={setTasks} onView={onView} />
                ))}
                {(column.tasks || []).length === 0 && <p className="text-center text-sm text-[#B3B3B3] pt-8">Nenhuma tarefa aqui.</p>}
            </div>
        </div>
    );
};

const DraggableTaskCard: React.FC<{ task: Task; users: User[]; currentUser: User; onEdit: (task: Task) => void; onDelete: (taskId: string) => void; onSync: (task: Task) => void; setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void; onView: (task: Task) => void }> = (props) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: props.task.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 'auto'
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <TaskCard {...props} />
        </div>
    );
};

const TaskCard: React.FC<{ task: Task; users: User[]; currentUser: User; onEdit: (task: Task) => void; onDelete: (taskId: string) => void; onSync: (task: Task) => void; setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void; onView: (task: Task) => void }> = ({ task, users, currentUser, onEdit, onDelete, onSync, setTasks, onView }) => {
    const assignee = users.find(u => u.id === task.assigneeId);
    const [isExpanded, setIsExpanded] = useState(false);
    const [newSubtaskText, setNewSubtaskText] = useState('');

    const completedSubtasks = useMemo(() => task.subtasks?.filter(st => st.completed).length || 0, [task.subtasks]);
    const totalSubtasks = useMemo(() => task.subtasks?.length || 0, [task.subtasks]);
    const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskText.trim()) return;

        const newSubtask: Subtask = {
            id: `st-${Date.now()}`,
            text: newSubtaskText.trim(),
            completed: false,
        };

        setTasks(prev => prev.map(t =>
            t.id === task.id
                ? { ...t, subtasks: [...(t.subtasks || []), newSubtask] }
                : t
        ));
        setNewSubtaskText('');
    };

    const handleToggleSubtask = (subtaskId: string) => {
        setTasks(prev => prev.map(t =>
            t.id === task.id
                ? {
                    ...t,
                    subtasks: t.subtasks?.map(st =>
                        st.id === subtaskId ? { ...st, completed: !st.completed } : st
                    )
                }
                : t
        ));
    };

    const handleDeleteSubtask = (subtaskId: string) => {
        setTasks(prev => prev.map(t =>
            t.id === task.id
                ? { ...t, subtasks: t.subtasks?.filter(st => st.id !== subtaskId) }
                : t
        ));
    };

    const formattedDueDate = useMemo(() => {
        return formatDate(task.dueDate, task.dueDate?.includes('T'));
    }, [task.dueDate]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.03, boxShadow: "0px 8px 25px rgba(0,0,0,0.5)" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            onClick={() => onView(task)}
            className="bg-[#1C1C1C] p-4 rounded-lg shadow-md border-l-4 cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-[#FF6B00]"
            style={{ borderColor: statusConfig[task.status].border.replace('border-', '#') }}>
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-white pr-2 flex items-center gap-2">
                    {task.isOffline && (
                        <span className="flex-shrink-0" title="Salvo localmente">
                            <CloudOffIcon className="w-4 h-4 text-yellow-400" />
                        </span>
                    )}
                    {task.title}
                </h4>
                <div className="flex-shrink-0 flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onSync(task); }} className="p-1 text-gray-400 hover:text-[#4285F4]" title="Sincronizar com Google Calendar"><CalendarIcon className="w-4 h-4" /></button>
                    <button onClick={() => onEdit(task)} className="p-1 text-gray-400 hover:text-white"><EditIcon className="w-4 h-4" /></button>
                    {(currentUser.role === Role.ADMIN || task.assigneeId === currentUser.id) && (
                        <button onClick={() => onDelete(task.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2Icon className="w-4 h-4" /></button>
                    )}
                </div>
            </div>
            <p className="text-sm text-[#B3B3B3] mt-1 mb-3 line-clamp-2">{task.description}</p>

            {totalSubtasks > 0 && (
                <div className="my-3">
                    <div className="flex justify-between items-center text-xs text-[#B3B3B3] mb-1">
                        <span className="font-semibold flex items-center gap-1"><CheckSquareIcon className="w-4 h-4" /> Subtarefas</span>
                        <span>{completedSubtasks} de {totalSubtasks}</span>
                    </div>
                    <div className="w-full bg-[#2E2E2E] rounded-full h-1.5">
                        <motion.div className="bg-[#FF6B00] h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${subtaskProgress}%` }} transition={{ duration: 0.5 }} />
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-[#2E2E2E]/50">
                <span className={`px-2 py-1 text-xs rounded-full font-semibold ${priorityConfig[task.priority].color}`}>{priorityConfig[task.priority].label}</span>
                <div className="flex items-center gap-3">
                    {task.estimatedTime > 0 && (
                        <span className="flex items-center text-xs text-gray-400" title={`Tempo estimado: ${formatEstimatedTime(task.estimatedTime)}`}>
                            <ClockIcon className="w-4 h-4 mr-1" />
                            {formatEstimatedTime(task.estimatedTime)}
                        </span>
                    )}
                    {task.dueDate && (
                        <span className="flex items-center text-xs text-gray-400" title={`Vence em: ${formattedDueDate}`}>
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            {formattedDueDate}
                        </span>
                    )}
                    {assignee && <img src={assignee.avatarUrl} alt={assignee.name} title={assignee.name} className="w-6 h-6 rounded-full" />}
                </div>
            </div>

            {(task.subtasks || []).length > 0 && (
                <button onClick={() => setIsExpanded(!isExpanded)} className="text-xs w-full text-center mt-3 text-[#FF6B00] font-semibold hover:underline">
                    {isExpanded ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                </button>
            )}

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: '12px' }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 border-t border-[#2E2E2E]/50">
                            <ul className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2 mb-2">
                                {task.subtasks?.map(subtask => (
                                    <li key={subtask.id} className="flex items-center group text-sm">
                                        <input
                                            type="checkbox"
                                            checked={subtask.completed}
                                            onChange={() => handleToggleSubtask(subtask.id)}
                                            className="h-4 w-4 rounded bg-[#1C1C1C] border-gray-600 text-[#FF6B00] focus:ring-[#FF8C33] cursor-pointer"
                                        />
                                        <span className={`ml-2 flex-grow ${subtask.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                                            {subtask.text}
                                        </span>
                                        {(currentUser.role === Role.ADMIN || task.assigneeId === currentUser.id) && (
                                            <button onClick={() => handleDeleteSubtask(subtask.id)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity ml-2">
                                                <Trash2Icon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <form onSubmit={handleAddSubtask} className="flex gap-2 mt-3">
                                <input
                                    type="text"
                                    value={newSubtaskText}
                                    onChange={e => setNewSubtaskText(e.target.value)}
                                    placeholder="Adicionar subtarefa..."
                                    className="flex-grow bg-[#2E2E2E] p-1.5 rounded-md text-sm border border-transparent focus:border-[#FF6B00] focus:ring-0"
                                />
                                <button type="submit" className="p-1.5 bg-[#FF6B00] text-white rounded-md hover:bg-[#FF8C33] disabled:opacity-50" disabled={!newSubtaskText.trim()}>
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const TaskModal: React.FC<{ currentUser: User; task: Task | null; users: User[]; goals: Goal[]; onSave: (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string }) => void; onDelete: (taskId: string) => void; onSync?: (task: Task) => void; onClose: () => void }> = ({ currentUser, task, users, goals, onSave, onDelete, onSync, onClose }) => {
    const [formData, setFormData] = useState<Omit<Task, 'id' | 'createdAt'>>({
        title: task?.title || '',
        description: task?.description || '',
        status: task?.status || 'pendente',
        priority: task?.priority || 'media',
        assigneeId: task?.assigneeId || '',
        estimatedTime: task?.estimatedTime || 60,
        dueDate: task?.dueDate || '',
        goalId: task?.goalId || '',
        subtasks: task?.subtasks || [],
        startTime: task?.startTime || '',
        endTime: task?.endTime || '',
        sector: task?.sector || undefined,
        location: task?.location || '',
        repetition: task?.repetition || 'none',
    });
    const [newSubtaskText, setNewSubtaskText] = useState('');

    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskText.trim()) return;
        const newSubtask: Subtask = {
            id: `st-modal-${Date.now()}`,
            text: newSubtaskText.trim(),
            completed: false,
        };
        setFormData(prev => ({
            ...prev,
            subtasks: [...(prev.subtasks || []), newSubtask]
        }));
        setNewSubtaskText('');
    };

    const handleToggleSubtask = (subtaskId: string) => {
        setFormData(prev => ({
            ...prev,
            subtasks: prev.subtasks?.map(st =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
            )
        }));
    };

    const handleDeleteSubtask = (subtaskId: string) => {
        setFormData(prev => ({
            ...prev,
            subtasks: prev.subtasks?.filter(st => st.id !== subtaskId)
        }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDatePart = e.target.value;
        if (!newDatePart) {
            setFormData({ ...formData, dueDate: '' });
            return;
        }
        // Extract time part if exists (supports both ISO 'T' and PostgreSQL ' ' separators)
        let timePart = '';
        if (formData.dueDate) {
            if (formData.dueDate.includes('T')) {
                timePart = formData.dueDate.split('T')[1] || '';
            } else if (formData.dueDate.includes(' ')) {
                timePart = formData.dueDate.split(' ')[1] || '';
            }
        }
        setFormData({ ...formData, dueDate: timePart ? `${newDatePart}T${timePart.slice(0, 5)}` : newDatePart });
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTimePart = e.target.value;
        // Extract date part (supports both ISO 'T' and PostgreSQL ' ' separators)
        let datePart = '';
        if (formData.dueDate) {
            if (formData.dueDate.includes('T')) {
                datePart = formData.dueDate.split('T')[0];
            } else if (formData.dueDate.includes(' ')) {
                datePart = formData.dueDate.split(' ')[0];
            } else {
                datePart = formData.dueDate.slice(0, 10);
            }
        }
        if (datePart) {
            if (newTimePart) {
                setFormData({ ...formData, dueDate: `${datePart}T${newTimePart}` });
            } else {
                setFormData({ ...formData, dueDate: datePart });
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#1C1C1C] rounded-lg shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <button onClick={onClose} className="absolute top-4 right-4 text-[#B3B3B3] hover:text-white"><XIcon className="w-6 h-6" /></button>
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                        {task ? 'Editar Tarefa' : 'Nova Tarefa'}
                        {task && onSync && (
                            <button
                                type="button"
                                onClick={() => onSync(task)}
                                className="ml-3 px-3 py-1 text-xs font-semibold bg-[#4285F4] text-white rounded-md hover:bg-[#3367D6] flex items-center gap-1 transition-colors shadow-sm"
                                title="Sincronizar com Google Calendar"
                            >
                                <CalendarIcon className="w-3 h-3" /> Google Calendar
                            </button>
                        )}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                        <input type="text" placeholder="Título da Tarefa" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full p-2 bg-[#2E2E2E] rounded-md" required />
                        <textarea placeholder="Descrição" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full p-2 bg-[#2E2E2E] rounded-md" required />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-[#B3B3B3] mb-1">Status</label>
                                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as TaskStatus })} className="w-full p-2 bg-[#2E2E2E] rounded-md">
                                    {Object.entries(statusConfig).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#B3B3B3] mb-1">Prioridade</label>
                                <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as TaskPriority })} className="w-full p-2 bg-[#2E2E2E] rounded-md">
                                    {Object.entries(priorityConfig).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[#B3B3B3] mb-1">Atribuído a</label>
                            <select value={formData.assigneeId} onChange={e => setFormData({ ...formData, assigneeId: e.target.value })} className="w-full p-2 bg-[#2E2E2E] rounded-md" required>
                                <option value="" disabled>Atribuir a...</option>
                                {currentUser.role === Role.ADMIN && (
                                    <option value="ALL_USERS">Atribuir a Todos os Usuários</option>
                                )}
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-[#B3B3B3] mb-1">Vencimento</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={formData.dueDate
                                            ? (formData.dueDate.includes('T')
                                                ? formData.dueDate.split('T')[0]
                                                : formData.dueDate.includes(' ')
                                                    ? formData.dueDate.split(' ')[0]
                                                    : formData.dueDate.slice(0, 10))
                                            : ''}
                                        onChange={handleDateChange}
                                        className="w-full p-2 bg-[#2E2E2E] rounded-md"
                                    />
                                    <input
                                        type="time"
                                        value={formData.dueDate
                                            ? (formData.dueDate.includes('T')
                                                ? formData.dueDate.split('T')[1]?.slice(0, 5) || ''
                                                : formData.dueDate.includes(' ')
                                                    ? formData.dueDate.split(' ')[1]?.slice(0, 5) || ''
                                                    : '')
                                            : ''}
                                        onChange={handleTimeChange}
                                        disabled={!formData.dueDate || formData.dueDate.length < 10}
                                        className="w-full p-2 bg-[#2E2E2E] rounded-md disabled:opacity-50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#B3B3B3] mb-1">Tempo Estimado (minutos)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="15"
                                    placeholder="Ex: 60"
                                    value={formData.estimatedTime}
                                    onChange={e => setFormData({ ...formData, estimatedTime: parseInt(e.target.value) || 0 })}
                                    className="w-full p-2 bg-[#2E2E2E] rounded-md"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[#B3B3B3] mb-1">Vincular a uma Meta</label>
                            <select value={formData.goalId} onChange={e => setFormData({ ...formData, goalId: e.target.value })} className="w-full p-2 bg-[#2E2E2E] rounded-md">
                                <option value="">Nenhuma meta vinculada</option>
                                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                            </select>
                        </div>

                        {/* Campos da Agenda */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#3a3a3a]">
                            <div className="col-span-2">
                                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-[#FF6B00]" /> Configurações de Agenda (Opcional)</h3>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-[#B3B3B3] mb-1">Hora Início</label>
                                <input type="time" value={formData.startTime || ''} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full p-2 bg-[#2E2E2E] rounded-md" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#B3B3B3] mb-1">Hora Fim</label>
                                <input type="time" value={formData.endTime || ''} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full p-2 bg-[#2E2E2E] rounded-md" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#B3B3B3] mb-1">Setor</label>
                                <select value={formData.sector || ''} onChange={e => setFormData({ ...formData, sector: (e.target.value as Sector) || undefined })} className="w-full p-2 bg-[#2E2E2E] rounded-md">
                                    <option value="">Nenhum Setor</option>
                                    <option value="Administração">Administração</option>
                                    <option value="Tech">Tech</option>
                                    <option value="RH">RH</option>
                                    <option value="Comercial">Comercial</option>
                                    <option value="Financeiro">Financeiro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#B3B3B3] mb-1 flex items-center gap-1"><RepeatIcon className="w-3 h-3"/> Repetição</label>
                                <select value={formData.repetition || 'none'} onChange={e => setFormData({ ...formData, repetition: e.target.value as any })} className="w-full p-2 bg-[#2E2E2E] rounded-md">
                                    <option value="none">Não repetir</option>
                                    <option value="daily">Diariamente</option>
                                    <option value="weekly">Semanalmente</option>
                                    <option value="monthly">Mensalmente</option>
                                </select>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-[#B3B3B3] mb-1 flex items-center gap-1"><MapPinIcon className="w-3 h-3"/> Localização (Link ou Endereço)</label>
                                <input type="text" placeholder="Ex: Link do Meet, Sala de Reunião..." value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full p-2 bg-[#2E2E2E] rounded-md" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[#B3B3B3] mb-1">Subtarefas</label>
                            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar bg-[#0E0E0E] p-2 rounded-md">
                                {(formData.subtasks || []).map(subtask => (
                                    <div key={subtask.id} className="flex items-center group bg-[#1C1C1C] p-2 rounded">
                                        <input
                                            type="checkbox"
                                            checked={subtask.completed}
                                            onChange={() => handleToggleSubtask(subtask.id)}
                                            className="h-4 w-4 rounded bg-[#2E2E2E] border-gray-600 text-[#FF6B00] focus:ring-[#FF8C33] cursor-pointer"
                                        />
                                        <span className={`ml-2 flex-grow text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                                            {subtask.text}
                                        </span>
                                        {(currentUser.role === Role.ADMIN || (task && task.assigneeId === currentUser.id)) && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSubtask(subtask.id)}
                                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity ml-2"
                                            >
                                                <Trash2Icon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {(!formData.subtasks || formData.subtasks.length === 0) && (
                                    <p className="text-xs text-center text-gray-500 py-2">Nenhuma subtarefa adicionada.</p>
                                )}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <input
                                    type="text"
                                    value={newSubtaskText}
                                    onChange={e => setNewSubtaskText(e.target.value)}
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddSubtask(e as unknown as React.FormEvent);
                                        }
                                    }}
                                    placeholder="Adicionar nova subtarefa..."
                                    className="flex-grow bg-[#2E2E2E] p-1.5 rounded-md text-sm border border-transparent focus:border-[#FF6B00] focus:ring-0"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSubtask}
                                    className="p-1.5 bg-[#FF6B00] text-white rounded-md hover:bg-[#FF8C33] disabled:opacity-50"
                                    disabled={!newSubtaskText.trim()}
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between pt-2 mt-auto">
                            <div>
                                {task && (currentUser.role === Role.ADMIN || task.assigneeId === currentUser.id) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (task.id) {
                                                onDelete(task.id);
                                                onClose();
                                            }
                                        }}
                                        className="px-4 py-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 font-semibold flex items-center"
                                    >
                                        <Trash2Icon className="w-4 h-4 mr-2" /> Excluir
                                    </button>
                                )}
                            </div>
                            <div className="flex">
                                <button type="button" onClick={onClose} className="px-4 py-2 mr-2 bg-[#2E2E2E] rounded-md hover:bg-[#3a3a3a]">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-[#FF6B00] rounded-md text-white font-semibold hover:bg-[#FF8C33]">Salvar</button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TasksScreen;
