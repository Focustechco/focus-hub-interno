import React, { useState, useEffect, useMemo } from 'react';
import { User, GoogleCalendarEvent, AgendaDashboard, Role, Task } from '../types';
import CalendarWeekView from './CalendarWeekView';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarIcon, ClockIcon, SearchIcon, VideoIcon, MapPinIcon, UsersIcon, AlertCircleIcon, PlusIcon, XIcon } from '../components/icons';
import { CheckCircle2 } from 'lucide-react';
import { LoadingSpinner } from '../components/Loading';
import { GoogleCalendarAdmin } from '../components/GoogleCalendarAdmin';

interface Props {
    currentUser: User;
    users?: User[];
}

type ViewMode = 'day' | 'week' | 'month' | 'list';

export default function AgendaCorporativaScreen({ currentUser, users }: Props) {
    const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
    const [dashboard, setDashboard] = useState<AgendaDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<GoogleCalendarEvent | null>(null);

    // Create meeting state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
    const [newMeeting, setNewMeeting] = useState({
        title: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endDate: new Date().toISOString().split('T')[0],
        endTime: '10:00',
        attendees: [] as string[]
    });

    const handleTaskClick = (task: Task) => {
        const event = events.find(e => e.id === task.id);
        if (event) setSelectedEvent(event);
    };

    const updateEventColor = async (colorHex: string) => {
        if (!selectedEvent) return;
        
        // Optimistic update
        const updatedEvents = events.map(e => e.id === selectedEvent.id ? { ...e, color_hex: colorHex } : e);
        setEvents(updatedEvents);
        setSelectedEvent({ ...selectedEvent, color_hex: colorHex });

        try {
            await api.put(`/agenda/events/${selectedEvent.id}/color`, { color_hex: colorHex });
        } catch (err) {
            console.error('Error updating color', err);
        }
    };

    useEffect(() => {
        fetchAgendaData();
    }, [currentDate]);

    const fetchAgendaData = async () => {
        setLoading(true);
        try {
            // Calculate start/end based on current view/date. Simplified to fetch month range.
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString();
            
            const [eventsRes, dashRes] = await Promise.all([
                api.get(`/agenda/events?start=${start}&end=${end}`),
                api.get('/agenda/dashboard')
            ]);
            
            setEvents(eventsRes.data);
            setDashboard(dashRes.data);
            setError(null);
        } catch (err) {
            setError('Agenda corporativa não está sincronizada ou houve um erro.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMeeting.title || !newMeeting.startDate || !newMeeting.startTime || !newMeeting.endDate || !newMeeting.endTime) {
            alert('Preencha os campos obrigatórios (Título, Data e Hora)');
            return;
        }

        setIsCreatingMeeting(true);
        try {
            const startDateTime = `${newMeeting.startDate}T${newMeeting.startTime}:00`;
            const endDateTime = `${newMeeting.endDate}T${newMeeting.endTime}:00`;

            await api.post('/google/events', {
                title: newMeeting.title,
                description: newMeeting.description,
                startTime: startDateTime,
                endTime: endDateTime,
                attendees: newMeeting.attendees
            });

            // Close modal and refresh
            setIsCreateModalOpen(false);
            setNewMeeting({
                title: '',
                description: '',
                startDate: new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endDate: new Date().toISOString().split('T')[0],
                endTime: '10:00',
                attendees: []
            });
            await fetchAgendaData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Erro ao marcar reunião');
        } finally {
            setIsCreatingMeeting(false);
        }
    };

    const filteredEvents = useMemo(() => {
        const now = new Date().getTime();
        
        let result = events.filter(e => {
            // Remover reuniões que já terminaram
            const endTime = new Date(e.end_time || e.start_time).getTime();
            return endTime >= now;
        });

        if (searchTerm) {
            result = result.filter(e => 
                e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.organizer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.location?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Ordenar do mais próximo de acontecer (futuro) para o mais distante
        return result.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }, [events, searchTerm]);

    const changeDate = (offset: number) => {
        const newDate = new Date(currentDate);
        if (viewMode === 'day') newDate.setDate(newDate.getDate() + offset);
        if (viewMode === 'week') newDate.setDate(newDate.getDate() + (offset * 7));
        if (viewMode === 'month' || viewMode === 'list') newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const mappedTasks: Task[] = useMemo(() => {
        return filteredEvents.map(e => {
            const start = new Date(e.start_time);
            const end = new Date(e.end_time);
            const estMins = Math.round((end.getTime() - start.getTime()) / 60000);

            return {
                id: e.id,
                title: e.title,
                description: e.description || '',
                status: 'pendente',
                priority: 'media',
                assigneeId: '',
                estimatedTime: estMins,
                createdAt: start.toISOString(),
                dueDate: start.toISOString(), 
                startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
                endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
                isGoogleEvent: true,
                googleEventLink: e.html_link || e.google_meet_link || '',
                sector: undefined,
                color: e.color_hex || '#4285F4'
            };
        });
    }, [filteredEvents]);

    const tasksByDate = useMemo(() => {
        const map = new Map<string, Task[]>();
        mappedTasks.forEach(task => {
            if (task.dueDate) {
                const dateKey = task.dueDate.slice(0, 10);
                if (!map.has(dateKey)) map.set(dateKey, []);
                map.get(dateKey)!.push(task);
            }
        });
        return map;
    }, [mappedTasks]);

    const monthDays = useMemo(() => {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const startDate = new Date(startOfMonth);
        const startDayOfWeek = startOfMonth.getDay(); 
        const daysToSubtract = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        startDate.setDate(startDate.getDate() - daysToSubtract);

        const endDate = new Date(endOfMonth);
        const endDayOfWeek = endOfMonth.getDay();
        const daysToAdd = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
        endDate.setDate(endDate.getDate() + daysToAdd);

        const days = [];
        let dayIterator = new Date(startDate);
        while (dayIterator <= endDate) {
            days.push(new Date(dayIterator));
            dayIterator.setDate(dayIterator.getDate() + 1);
        }
        return days;
    }, [currentDate]);

    const [showAdminPanel, setShowAdminPanel] = useState(false);

    if (loading && events.length === 0) {
        return <div className="flex h-[80vh] items-center justify-center"><LoadingSpinner /></div>;
    }

    const isAdmin = currentUser.role === Role.ADMIN;
    const isAgendaEmpty = events.length === 0 && !loading;

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Top Bar - Compact header with search, metrics and admin toggle */}
            <div className="flex flex-col gap-3">
                {/* Row 1: Title + Search + Admin toggle */}
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3 mr-auto">
                        <div className="bg-[#FF6B00]/20 p-2 rounded-lg">
                            <CalendarIcon className="w-5 h-5 text-[#FF6B00]" />
                        </div>
                        <h1 className="text-xl font-bold text-white">Agenda Corporativa</h1>
                        {dashboard && (
                            <div className="hidden sm:flex items-center gap-4 ml-4 text-sm">
                                <span className="text-[#B3B3B3]">
                                    <span className="text-white font-bold">{dashboard.eventsToday}</span> eventos hoje
                                </span>
                                {dashboard.nextMeeting && (
                                    <span className="text-[#B3B3B3]">
                                        Próximo: <span className="text-[#FF6B00] font-semibold">{dashboard.nextMeeting.title}</span>
                                        {' '}às {new Date(dashboard.nextMeeting.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B3B3B3]" />
                        <input 
                            type="text"
                            placeholder="Pesquisar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-[#1C1C1C] rounded-lg py-2 pl-9 pr-4 w-48 focus:w-64 transition-all focus:ring-1 focus:ring-[#FF6B00] border-none text-white text-sm"
                        />
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#FF8C33] text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-[#FF6B00]/20"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Marcar Reunião
                    </button>

                    {isAdmin && (
                        <button 
                            onClick={() => setShowAdminPanel(!showAdminPanel)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${showAdminPanel ? 'bg-[#FF6B00] text-white' : 'bg-[#1C1C1C] text-[#B3B3B3] hover:text-white'}`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Configurações
                        </button>
                    )}
                </div>

                {/* Admin Panel - Collapsible */}
                {isAdmin && showAdminPanel && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <GoogleCalendarAdmin />
                    </motion.div>
                )}

                {isAdmin && isAgendaEmpty && (
                    <div className="bg-[#1C1C1C] rounded-lg p-3 border border-[#FF6B00]/50 flex items-center gap-3">
                        <AlertCircleIcon className="w-5 h-5 text-[#FF6B00] flex-shrink-0" />
                        <p className="text-sm text-[#B3B3B3]">
                            Nenhum evento encontrado. Clique em <strong className="text-[#FF6B00]">Configurações</strong> acima para sincronizar.
                        </p>
                    </div>
                )}

                {/* Row 2: Navigation + View Mode Tabs */}
                <div className="flex items-center justify-between bg-[#1C1C1C] rounded-xl px-4 py-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-[#2E2E2E] rounded-lg text-[#B3B3B3] transition">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h2 className="text-base font-semibold text-white min-w-[140px] text-center capitalize">
                            {viewMode === 'day' 
                                ? currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
                                : currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                            }
                        </h2>
                        <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-[#2E2E2E] rounded-lg text-[#B3B3B3] transition">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-[#2E2E2E] hover:bg-[#3E3E3E] text-xs rounded-full font-medium text-white transition">Hoje</button>
                    </div>

                    <div className="flex bg-[#0E0E0E] p-1 rounded-lg">
                        {(['day', 'week', 'month', 'list'] as ViewMode[]).map(mode => (
                            <button 
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-1.5 rounded-md text-sm transition ${viewMode === mode ? 'bg-[#FF6B00] text-white font-semibold shadow-lg shadow-[#FF6B00]/20' : 'text-[#B3B3B3] hover:text-white'}`}
                            >
                                {mode === 'list' ? 'Lista' : mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 text-red-400 rounded-lg flex items-center gap-3">
                    <AlertCircleIcon className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Calendar Area - Full Width */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {viewMode === 'list' ? (
                    filteredEvents.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[#B3B3B3] opacity-60 mt-12">
                            <CalendarIcon className="w-16 h-16 mb-4" />
                            <p>Nenhum compromisso encontrado neste período.</p>
                        </div>
                    ) : (
                    <div className="space-y-3 pr-2">
                        {filteredEvents.map(event => {
                            const start = new Date(event.start_time);
                            const end = new Date(event.end_time);
                            const isMeet = !!event.google_meet_link;

                            return (
                                <motion.div 
                                    key={event.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-[#1C1C1C] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 relative overflow-hidden cursor-pointer hover:bg-[#2E2E2E] transition"
                                    onClick={() => { if (event.html_link) window.open(event.html_link, '_blank'); }}
                                >
                                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: event.color_hex || '#4285F4' }} />
                                    
                                    <div className="sm:w-32 flex-shrink-0">
                                        <p className="text-white font-bold text-lg">
                                            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {!event.all_day && (
                                            <p className="text-[#B3B3B3] text-sm">
                                                até {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                        {event.all_day && <p className="text-[#B3B3B3] text-sm">Dia todo</p>}
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-1">{event.title}</h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#B3B3B3]">
                                            {event.organizer_name && (
                                                <div className="flex items-center gap-1">
                                                    <UsersIcon className="w-4 h-4" />
                                                    {event.organizer_name}
                                                </div>
                                            )}
                                            {event.location && (
                                                <div className="flex items-center gap-1">
                                                    <MapPinIcon className="w-4 h-4" />
                                                    <span className="truncate max-w-[200px]">{event.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isMeet && (
                                        <div className="sm:ml-auto">
                                            <a 
                                                href={event.google_meet_link!} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 bg-[#00832D] hover:bg-[#006622] text-white force-text-white px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <VideoIcon className="w-5 h-5" />
                                                Entrar na Reunião
                                            </a>

                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                    )
                ) : viewMode === 'day' || viewMode === 'week' ? (
                    <CalendarWeekView 
                        tasks={mappedTasks} 
                        users={[]} 
                        currentDate={currentDate} 
                        onTaskClick={handleTaskClick} 
                        onAddTask={() => {}}
                        viewMode={viewMode}
                    />
                ) : (
                    <div className="grid grid-cols-7 gap-1 text-center bg-[#0E0E0E] p-2 rounded-lg h-full overflow-y-auto">
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(wd => (
                            <div key={wd} className="text-xs font-bold text-[#B3B3B3] py-2">{wd}</div>
                        ))}
                        {monthDays.map((day, index) => {
                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                            const isToday = day.toDateString() === new Date().toDateString();
                            const dateKey = day.toISOString().slice(0, 10);
                            const dayTasks = tasksByDate.get(dateKey) || [];

                            return (
                                <div key={index} className={`relative pt-2 border border-[#2E2E2E] rounded-md min-h-[100px] ${isCurrentMonth ? 'bg-[#1C1C1C]' : 'bg-[#0E0E0E]'}`}>
                                    <span className={`absolute top-2 right-2 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#FF6B00] text-white' : ''} ${!isCurrentMonth ? 'text-[#B3B3B3] opacity-50' : 'text-white'}`}>
                                        {day.getDate()}
                                    </span>
                                    <div className="mt-8 p-1 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar-thin">
                                        {dayTasks.map(task => (
                                            <div 
                                                key={task.id} 
                                                className="text-[10px] text-left p-1 rounded truncate cursor-pointer hover:opacity-80 transition" 
                                                title={task.title}
                                                style={{
                                                    backgroundColor: `${task.color}20`,
                                                    borderLeft: `2px solid ${task.color}`,
                                                    color: task.color
                                                }}
                                                onClick={() => handleTaskClick(task)}
                                            >
                                                {task.startTime} {task.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Event Details Modal Lateral */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60" 
                        onClick={() => setSelectedEvent(null)}
                    />
                    <motion.div 
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-md bg-[#1C1C1C] h-full shadow-2xl flex flex-col"
                    >
                        <div className="p-4 border-b border-[#2E2E2E] flex justify-between items-center bg-[#1C1C1C] sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-white truncate pr-4">{selectedEvent.title}</h2>
                            <button onClick={() => setSelectedEvent(null)} className="text-[#B3B3B3] hover:text-white p-1 rounded-full hover:bg-[#2E2E2E] transition">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="flex items-center gap-2 mb-6 text-[#B3B3B3]">
                                <ClockIcon className="w-5 h-5 text-[#FF6B00]" />
                                <span>{new Date(selectedEvent.start_time).toLocaleString('pt-BR')} - {new Date(selectedEvent.end_time).toLocaleTimeString('pt-BR')}</span>
                            </div>
                            
                            {selectedEvent.description && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Descrição</h3>
                                    <div className="text-white bg-[#0E0E0E] p-3 rounded-lg text-sm whitespace-pre-wrap">
                                        {selectedEvent.description}
                                    </div>
                                </div>
                            )}

                            {selectedEvent.location && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Local</h3>
                                    <div className="flex items-center gap-2 text-white bg-[#0E0E0E] p-3 rounded-lg">
                                        <MapPinIcon className="w-5 h-5 text-[#FF6B00]" />
                                        <span>{selectedEvent.location}</span>
                                    </div>
                                </div>
                            )}

                            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Participantes</h3>
                                    <div className="bg-[#0E0E0E] rounded-lg p-3 space-y-2">
                                        {selectedEvent.attendees.map((att, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <span className="text-white">{att.displayName || att.email}</span>
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${att.responseStatus === 'accepted' ? 'bg-green-500/20 text-green-400' : att.responseStatus === 'declined' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                    {att.responseStatus}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Cor do Evento</h3>
                                <div className="flex flex-wrap gap-3">
                                    {['#FF6B00', '#1A73E8', '#E91E63', '#4CAF50', '#9C27B0', '#FFC300', '#00BCD4', '#607D8B'].map(color => {
                                        const isSelected = (selectedEvent.color_hex || (selectedEvent.isGoogleEvent ? '#4285F4' : null)) === color;
                                        return (
                                            <button
                                                key={color}
                                                onClick={() => updateEventColor(color)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${isSelected ? 'scale-110 ring-2 ring-white shadow-lg' : 'hover:scale-110'}`}
                                                style={{ backgroundColor: color }}
                                            >
                                                {isSelected && (
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-[#2E2E2E] bg-[#1C1C1C] flex flex-col gap-3">
                            {selectedEvent.google_meet_link && (
                                <a href={selectedEvent.google_meet_link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#00832D] hover:bg-[#006622] text-white force-text-white px-4 py-3 rounded-lg font-semibold transition w-full">
                                    <VideoIcon className="w-5 h-5" /> Entrar no Google Meet
                                </a>
                            )}
                            {selectedEvent.html_link && (
                                <a href={selectedEvent.html_link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#4285F4] hover:bg-[#3367D6] text-white force-text-white px-4 py-3 rounded-lg font-semibold transition w-full">
                                    <CalendarIcon className="w-5 h-5" /> Ver no Google Calendar
                                </a>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Create Meeting Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
                            onClick={() => !isCreatingMeeting && setIsCreateModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-xl bg-[#1C1C1C] border border-[#2E2E2E] shadow-2xl rounded-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="p-5 border-b border-[#2E2E2E] flex justify-between items-center bg-[#1C1C1C] rounded-t-2xl shrink-0">
                                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                    <div className="bg-[#FF6B00]/20 p-2 rounded-lg">
                                        <CalendarIcon className="w-5 h-5 text-[#FF6B00]" />
                                    </div>
                                    Marcar Reunião
                                </h2>
                                <button 
                                    onClick={() => !isCreatingMeeting && setIsCreateModalOpen(false)} 
                                    className="text-[#B3B3B3] hover:text-white p-2 rounded-full hover:bg-[#2E2E2E] transition"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                <form id="create-meeting-form" onSubmit={handleCreateMeeting} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Título <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={newMeeting.title}
                                            onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
                                            className="w-full bg-[#0E0E0E] text-white border border-[#2E2E2E] rounded-lg p-3 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition"
                                            placeholder="Ex: Alinhamento Semanal"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Descrição / Pauta</label>
                                        <textarea
                                            value={newMeeting.description}
                                            onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
                                            className="w-full bg-[#0E0E0E] text-white border border-[#2E2E2E] rounded-lg p-3 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition min-h-[100px] resize-y"
                                            placeholder="Detalhes sobre a reunião..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Data Início <span className="text-red-500">*</span></label>
                                            <input
                                                type="date"
                                                required
                                                value={newMeeting.startDate}
                                                onChange={(e) => setNewMeeting({...newMeeting, startDate: e.target.value, endDate: e.target.value})} // auto sync end date
                                                className="w-full bg-[#0E0E0E] text-white border border-[#2E2E2E] rounded-lg p-3 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition color-scheme-dark"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Hora Início <span className="text-red-500">*</span></label>
                                            <input
                                                type="time"
                                                required
                                                value={newMeeting.startTime}
                                                onChange={(e) => setNewMeeting({...newMeeting, startTime: e.target.value})}
                                                className="w-full bg-[#0E0E0E] text-white border border-[#2E2E2E] rounded-lg p-3 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition color-scheme-dark"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Data Término <span className="text-red-500">*</span></label>
                                            <input
                                                type="date"
                                                required
                                                value={newMeeting.endDate}
                                                onChange={(e) => setNewMeeting({...newMeeting, endDate: e.target.value})}
                                                className="w-full bg-[#0E0E0E] text-white border border-[#2E2E2E] rounded-lg p-3 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition color-scheme-dark"
                                                min={newMeeting.startDate}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Hora Término <span className="text-red-500">*</span></label>
                                            <input
                                                type="time"
                                                required
                                                value={newMeeting.endTime}
                                                onChange={(e) => setNewMeeting({...newMeeting, endTime: e.target.value})}
                                                className="w-full bg-[#0E0E0E] text-white border border-[#2E2E2E] rounded-lg p-3 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none transition color-scheme-dark"
                                            />
                                        </div>
                                    </div>

                                    {/* Attendees Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-[#B3B3B3] mb-2 uppercase tracking-wider">Participantes (Membros)</label>
                                        <div className="bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg max-h-[150px] overflow-y-auto custom-scrollbar-thin p-2 space-y-1">
                                            {users && users.length > 0 ? (
                                                users.map(u => (
                                                    <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-[#1C1C1C] rounded cursor-pointer transition">
                                                        <input 
                                                            type="checkbox"
                                                            className="w-4 h-4 accent-[#FF6B00]"
                                                            checked={newMeeting.attendees.includes(u.email)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setNewMeeting(prev => ({...prev, attendees: [...prev.attendees, u.email]}));
                                                                } else {
                                                                    setNewMeeting(prev => ({...prev, attendees: prev.attendees.filter(email => email !== u.email)}));
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-white text-sm">{u.name}</span>
                                                            <span className="text-[#B3B3B3] text-xs">{u.email}</span>
                                                        </div>
                                                    </label>
                                                ))
                                            ) : (
                                                <p className="text-[#B3B3B3] text-sm p-2 text-center">Nenhum membro encontrado ou carregando...</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Warning about Meet */}
                                    <div className="bg-[#00832D]/10 border border-[#00832D]/30 p-3 rounded-lg flex items-start gap-3">
                                        <VideoIcon className="w-5 h-5 text-[#00832D] flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-[#B3B3B3]">
                                            <strong className="text-[#00832D] block mb-1">Google Meet Integrado</strong>
                                            Um link do Google Meet será gerado automaticamente para esta reunião, e convites serão enviados por e-mail para todos os participantes.
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-5 border-t border-[#2E2E2E] bg-[#1C1C1C] rounded-b-2xl flex gap-3 justify-end shrink-0">
                                <button 
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    disabled={isCreatingMeeting}
                                    className="px-6 py-2.5 rounded-lg font-bold text-[#B3B3B3] hover:text-white hover:bg-[#2E2E2E] transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    form="create-meeting-form"
                                    disabled={isCreatingMeeting}
                                    className="px-6 py-2.5 rounded-lg font-bold text-white bg-[#FF6B00] hover:bg-[#FF8C33] transition-colors shadow-lg shadow-[#FF6B00]/20 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isCreatingMeeting ? (
                                        <>
                                            <LoadingSpinner size="sm" /> 
                                            Marcando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" /> 
                                            Agendar Reunião
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

