import React, { useState, useMemo } from 'react';
import { Task, User } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons';
import { DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

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
            <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                task.priority === 'alta' ? 'bg-red-500' :
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
    const dateKey = day.toISOString().split('T')[0];
    const { setNodeRef, isOver } = useDroppable({ id: dateKey });

    return (
        <div 
            ref={setNodeRef}
            className={`relative pt-2 border border-[#2E2E2E] rounded-md min-h-[120px] transition-colors ${
                isCurrentMonth ? (isOver ? 'bg-[#3a3a3a]' : 'bg-[#1C1C1C]') : 'bg-[#0E0E0E]'
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


const CalendarView: React.FC<CalendarViewProps> = ({ tasks, users, onTaskClick, setTasks }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const tasksByDate = useMemo(() => {
        const map = new Map<string, Task[]>();
        tasks.forEach(task => {
            if (task.dueDate) {
                try {
                    // The date string can be either 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm'.
                    // We just need the date part as the key.
                    const dateKey = task.dueDate.split('T')[0];

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
    
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days = [];
    let dayIterator = new Date(startDate);
    while (dayIterator <= endDate) {
        days.push(new Date(dayIterator));
        dayIterator.setDate(dayIterator.getDate() + 1);
    }

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const today = new Date();
    
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setTasks((prevTasks) => {
                return prevTasks.map((task) => {
                    if (task.id === active.id) {
                        const originalDueDate = task.dueDate;
                        const newDatePart = String(over.id);
                        let newDueDate = newDatePart;

                        // Preserve time if it exists
                        if (originalDueDate && originalDueDate.includes('T')) {
                            const timePart = originalDueDate.split('T')[1];
                            newDueDate = `${newDatePart}T${timePart}`;
                        }
                        
                        return { ...task, dueDate: newDueDate };
                    }
                    return task;
                });
            });
        }
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="bg-[#0E0E0E] p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
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
                <div className="grid grid-cols-7 gap-1 text-center">
                    {weekDays.map(wd => (
                        <div key={wd} className="text-xs font-bold text-[#B3B3B3] py-2">{wd}</div>
                    ))}
                    {days.map((day, index) => {
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const isToday = day.toDateString() === today.toDateString();
                        const dateKey = day.toISOString().split('T')[0];
                        const dayTasks = tasksByDate.get(dateKey) || [];

                        return (
                            <DroppableDayCell
                                key={index}
                                day={day}
                                isCurrentMonth={isCurrentMonth}
                                isToday={isToday}
                                tasks={dayTasks}
                                onTaskClick={onTaskClick}
                                onAddTask={(date) => onTaskClick({
                                    id: '', // Temporary ID, will be replaced on save
                                    title: '',
                                    description: '',
                                    status: 'pendente',
                                    priority: 'media',
                                    assigneeId: '',
                                    estimatedTime: 60,
                                    createdAt: new Date().toISOString(),
                                    dueDate: date.toISOString().split('T')[0],
                                })}
                            />
                        );
                    })}
                </div>
            </div>
        </DndContext>
    );
};

export default CalendarView;