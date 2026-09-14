import React, { useState, useMemo } from 'react';
import { Task, User } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons';
import { DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { taskToCalendarEvent, generateGoogleCalendarUrl, downloadICS } from '../src/utils/calendar';

interface CalendarViewProps {
    tasks: Task[];
    users: User[];
    onTaskClick: (task: Task) => void;
    setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
}

const DraggableTaskItem: React.FC<{ task: Task, onTaskClick: (task: Task) => void }> = ({ task, onTaskClick }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 'auto',
        touchAction: 'none', // Prevents scrolling on mobile while dragging
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onTaskClick(task)}
            className="text-xs text-left p-1 bg-[#2E2E2E] rounded cursor-grab active:cursor-grabbing hover:bg-[#3a3a3a] truncate"
            title={task.title}
        >
            <span className={`inline-block w-2 h-2 rounded-full mr-1 ${task.priority === 'alta' ? 'bg-red-500' :
                task.priority === 'media' ? 'bg-yellow-500' : 'bg-green-500'
                }`}></span>
            {task.title}
        </div>
    );
};

const DroppableDayCell: React.FC<{
    day: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onAddTask: (date: Date) => void;
}> = ({ day, isCurrentMonth, isToday, tasks, onTaskClick, onAddTask }) => {
    // Use local date components to avoid timezone issues
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayNum = String(day.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${dayNum}`;
    const { setNodeRef, isOver } = useDroppable({ id: dateKey });

    return (
        <div
            ref={setNodeRef}
            className={`relative pt-2 border border-[#2E2E2E] rounded-md min-h-[120px] transition-colors ${isCurrentMonth ? (isOver ? 'bg-[#3a3a3a]' : 'bg-[#1C1C1C]') : 'bg-[#0E0E0E]'
                }`}
            onClick={(e) => {
                // Prevent opening modal if clicking on a task itself
                if ((e.target as HTMLElement).closest('[role="button"]')) return;
                onAddTask(day);
            }}
        >
            <span className={`absolute top-2 right-2 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#FF6B00] text-white' : ''} ${!isCurrentMonth ? 'text-gray-600' : ''}`}>
                {day.getDate()}
            </span>
            <div className="mt-8 p-1 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar-thin">
                {tasks.map(task => (
                    <DraggableTaskItem key={task.id} task={task} onTaskClick={onTaskClick} />
                ))}
            </div>
        </div>
    );
};


const CalendarView: React.FC<CalendarViewProps> = ({ tasks, users: _users, onTaskClick, setTasks }) => {
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());

    const tasksByDate = useMemo(() => {
        const map = new Map<string, Task[]>();
        tasks.forEach(task => {
            if (task.dueDate) {
                try {
                    // The date string can be 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm', or 'YYYY-MM-DD HH:MM:SS'.
                    // We just need the date part as the key.
                    let dateKey: string;
                    if (task.dueDate.includes('T')) {
                        dateKey = task.dueDate.split('T')[0];
                    } else if (task.dueDate.includes(' ')) {
                        dateKey = task.dueDate.split(' ')[0];
                    } else {
                        dateKey = task.dueDate.slice(0, 10);
                    }

                    // Let's do a basic validation of the date part format.
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
                        console.error("Skipping task with invalid date part:", task.id, dateKey);
                        return;
                    }

                    if (!map.has(dateKey)) {
                        map.set(dateKey, []);
                    }
                    map.get(dateKey)!.push(task);
                } catch (e) {
                    console.error("Error processing date for task:", task.id, task.dueDate, e);
                }
            }
        });
        return map;
    }, [tasks]);

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Ajustar para semana começando na segunda-feira (modelo brasileiro)
    const startDate = new Date(startOfMonth);
    const startDayOfWeek = startOfMonth.getDay(); // 0 = Dom, 1 = Seg, ...
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

    const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const today = new Date();

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const taskToUpdate = tasks.find(t => t.id === active.id);
            if (!taskToUpdate) return;

            const newDatePart = String(over.id);
            let newDueDate = newDatePart;

            // Preserve time if it exists (supports both ISO 'T' and PostgreSQL ' ' separators)
            if (taskToUpdate.dueDate) {
                let timePart: string | undefined;
                if (taskToUpdate.dueDate.includes('T')) {
                    timePart = taskToUpdate.dueDate.split('T')[1];
                } else if (taskToUpdate.dueDate.includes(' ')) {
                    timePart = taskToUpdate.dueDate.split(' ')[1];
                }
                if (timePart) {
                    newDueDate = `${newDatePart}T${timePart}`;
                }
            }

            const updatedTask = { ...taskToUpdate, dueDate: newDueDate };

            // Update local state optimistically
            setTasks((prevTasks) =>
                prevTasks.map((task) =>
                    task.id === active.id ? updatedTask : task
                )
            );

            // Persist to backend
            api.put(`/tasks/${taskToUpdate.id}`, {
                title: updatedTask.title,
                description: updatedTask.description,
                status: updatedTask.status,
                priority: updatedTask.priority,
                assigneeId: updatedTask.assigneeId,
                estimatedTime: updatedTask.estimatedTime,
                dueDate: updatedTask.dueDate,
                subtasks: updatedTask.subtasks || []
            }).catch(err => {
                console.error('Failed to update task date:', err);
                // Revert on failure
                setTasks((prevTasks) =>
                    prevTasks.map((t) =>
                        t.id === active.id ? taskToUpdate : t
                    )
                );
                toast.error('Erro ao salvar data da tarefa. Tente novamente.');
            });
        }
    };

    const handleExportICS = () => {
        const tasksWithDueDate = tasks.filter(t => t.dueDate);
        if (tasksWithDueDate.length === 0) {
            toast.error('Nenhuma tarefa com data para exportar.');
            return;
        }
        const events = tasksWithDueDate.map(t => taskToCalendarEvent({
            title: t.title,
            description: t.description,
            dueDate: t.dueDate!,
            priority: t.priority,
            estimatedTime: t.estimatedTime
        }));
        downloadICS(events, `focushub_tarefas_${currentDate.toISOString().slice(0, 7)}.ics`);
        toast.success('Arquivo ICS baixado!');
    };

    const handleOpenGoogleCalendar = () => {
        const tasksWithDueDate = tasks.filter(t => t.dueDate && t.status !== 'concluida');
        if (tasksWithDueDate.length === 0) {
            toast.error('Nenhuma tarefa pendente para adicionar.');
            return;
        }
        // Open first pending task in Google Calendar
        const firstTask = tasksWithDueDate[0];
        if (!firstTask) return;
        const event = taskToCalendarEvent({
            title: firstTask.title,
            description: firstTask.description,
            dueDate: firstTask.dueDate!,
            priority: firstTask.priority,
            estimatedTime: firstTask.estimatedTime
        });
        window.open(generateGoogleCalendarUrl(event), '_blank');
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="bg-[#0E0E0E] p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-[#2E2E2E]">
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-white capitalize">
                            {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-[#2E2E2E]">
                            <ChevronRightIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportICS}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-[#2E2E2E] text-white rounded-lg hover:bg-[#3a3a3a] transition-colors"
                            title="Baixar arquivo ICS"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Exportar ICS
                        </button>
                        <button
                            onClick={handleOpenGoogleCalendar}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-[#4285F4] text-white rounded-lg hover:bg-[#3574E0] transition-colors"
                            title="Abrir no Google Calendar"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V9h15v10.5zm0-12h-15V4.5h15V7.5z" />
                            </svg>
                            Google Calendar
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {weekDays.map(wd => (
                        <div key={wd} className="text-xs font-bold text-[#B3B3B3] py-2">{wd}</div>
                    ))}
                    {days.map((day, index) => {
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const isToday = day.toDateString() === today.toDateString();
                        // Use local date components to avoid timezone issues
                        const year = day.getFullYear();
                        const month = String(day.getMonth() + 1).padStart(2, '0');
                        const dayNum = String(day.getDate()).padStart(2, '0');
                        const dateKey = `${year}-${month}-${dayNum}`;
                        const dayTasks = tasksByDate.get(dateKey) || [];

                        return (
                            <DroppableDayCell
                                key={index}
                                day={day}
                                isCurrentMonth={isCurrentMonth}
                                isToday={isToday}
                                tasks={dayTasks}
                                onTaskClick={onTaskClick}
                                onAddTask={(date) => {
                                    // Use local date format to avoid timezone issues
                                    const y = date.getFullYear();
                                    const m = String(date.getMonth() + 1).padStart(2, '0');
                                    const d = String(date.getDate()).padStart(2, '0');
                                    const localDate = `${y}-${m}-${d}`;

                                    onTaskClick({
                                        id: `new-${Date.now()}`, // Temporary ID for new task
                                        title: '',
                                        description: '',
                                        status: 'pendente',
                                        priority: 'media',
                                        assigneeId: '',
                                        estimatedTime: 60,
                                        createdAt: new Date().toISOString(),
                                        dueDate: localDate,
                                    });
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </DndContext>
    );
};

export default CalendarView;