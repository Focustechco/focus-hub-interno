import React, { useMemo, useRef, useEffect } from 'react';
import { Task, User, Sector } from '../types';

interface CalendarWeekViewProps {
    tasks: Task[];
    users: User[];
    currentDate: Date;
    onTaskClick: (task: Task) => void;
    onAddTask: (date: Date, hour: number) => void;
    viewMode?: 'day' | 'week';
}

const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({ tasks, users, currentDate, onTaskClick, onAddTask, viewMode = 'week' }) => {
    // Scroll to current time on mount
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) {
            const currentHour = new Date().getHours();
            // scroll to current hour roughly
            scrollRef.current.scrollTop = (currentHour - 1) * 60; // 60px per hour
        }
    }, [currentDate]);

    // Calculate days to show
    const weekDays = useMemo(() => {
        if (viewMode === 'day') {
            return [new Date(currentDate)];
        }

        const date = new Date(currentDate);
        const day = date.getDay(); // 0 is Sunday
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
        const monday = new Date(date.setDate(diff));

        const days = [];
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(monday);
            currentDay.setDate(monday.getDate() + i);
            days.push(currentDay);
        }
        return days;
    }, [currentDate, viewMode]);

    // Hours to show (0 to 23)
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const getSectorColor = (sector?: Sector, customColor?: string) => {
        if (customColor) return customColor;
        switch (sector) {
            case 'Administração': return '#FFC300';
            case 'Tech': return '#1A73E8';
            case 'RH': return '#E91E63';
            case 'Comercial': return '#4CAF50';
            case 'Financeiro': return '#9C27B0';
            default: return '#FF6B00';
        }
    };

    return (
        <div className="bg-[#1C1C1C] rounded-lg border border-[#2E2E2E] flex flex-col h-[600px] overflow-hidden">
            {/* Header: Days of the week */}
            <div className="flex border-b border-[#2E2E2E]">
                {/* Empty corner for time column */}
                <div className="w-16 shrink-0 bg-[#1C1C1C] border-r border-[#2E2E2E]" />
                
                {/* Days */}
                <div className="flex-grow grid" style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}>
                    {weekDays.map((day, idx) => {
                        const isToday = day.toDateString() === new Date().toDateString();
                        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                        return (
                            <div key={idx} className="text-center py-3 border-r border-[#2E2E2E] last:border-r-0 flex flex-col items-center">
                                <span className="text-xs text-[#B3B3B3] uppercase font-bold">{dayNames[day.getDay()]}</span>
                                <span className={`text-xl font-normal mt-1 w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-[#FF6B00] text-white' : 'text-white'}`}>
                                    {day.getDate()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Scrollable Timeline Grid */}
            <div ref={scrollRef} className="flex-grow overflow-y-auto custom-scrollbar-thin flex relative bg-[#0E0E0E]">
                {/* Time column */}
                <div className="w-16 shrink-0 border-r border-[#2E2E2E] bg-[#1C1C1C]">
                    {hours.map(hour => (
                        <div key={hour} className="h-[60px] border-b border-[#2E2E2E] flex items-start justify-end pr-2 pt-1">
                            <span className="text-xs text-[#B3B3B3]">{String(hour).padStart(2, '0')}:00</span>
                        </div>
                    ))}
                </div>

                {/* Grid columns */}
                <div className="flex-grow grid relative" style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(0, 1fr))` }}>
                    {weekDays.map((day, dayIdx) => {
                        // Filter tasks for this day
                        const dayTasks = tasks.filter(t => {
                            if (!t.dueDate) return false;
                            const d = new Date(t.dueDate);
                            return d.toDateString() === day.toDateString();
                        });

                        return (
                            <div key={dayIdx} className="relative border-r border-[#2E2E2E] last:border-r-0">
                                {/* Hour slots for clicking */}
                                {hours.map(hour => (
                                    <div 
                                        key={hour} 
                                        className="h-[60px] border-b border-[#2E2E2E] border-dashed opacity-30 hover:opacity-100 hover:bg-[#2E2E2E]/50 transition-colors cursor-pointer"
                                        onClick={() => onAddTask(day, hour)}
                                    />
                                ))}

                                {/* Tasks rendering */}
                                {dayTasks.map(task => {
                                    // Parse start time (default 00:00)
                                    let startHour = 0;
                                    let startMin = 0;
                                    if (task.startTime) {
                                        const [h, m] = task.startTime.split(':').map(Number);
                                        startHour = h || 0;
                                        startMin = m || 0;
                                    } else {
                                        // fallback to dueDate time if exists
                                        if (task.dueDate.includes('T')) {
                                            const timePart = task.dueDate.split('T')[1];
                                            const [h, m] = timePart.split(':').map(Number);
                                            startHour = h || 0;
                                            startMin = m || 0;
                                        } else if (task.dueDate.includes(' ')) {
                                            const timePart = task.dueDate.split(' ')[1];
                                            const [h, m] = timePart.split(':').map(Number);
                                            startHour = h || 0;
                                            startMin = m || 0;
                                        }
                                    }

                                    // Parse end time (default start + 1h or estimatedTime)
                                    let endHour = startHour + 1;
                                    let endMin = startMin;
                                    if (task.endTime) {
                                        const [h, m] = task.endTime.split(':').map(Number);
                                        endHour = h || 0;
                                        endMin = m || 0;
                                    } else if (task.estimatedTime) {
                                        const totalMins = startHour * 60 + startMin + task.estimatedTime;
                                        endHour = Math.floor(totalMins / 60);
                                        endMin = totalMins % 60;
                                    }

                                    const topPx = (startHour * 60) + startMin;
                                    const bottomPx = (endHour * 60) + endMin;
                                    let heightPx = bottomPx - topPx;
                                    if (heightPx < 20) heightPx = 20; // min height

                                    const bgColor = task.color || (task.isGoogleEvent ? '#4285F4' : getSectorColor(task.sector));

                                    return (
                                        <div 
                                            key={task.id}
                                            className={`absolute left-1 right-1 rounded p-1 overflow-hidden shadow cursor-pointer transition-transform hover:scale-[1.02] z-10 ${task.isGoogleEvent ? 'border-2 border-[#4285F4]' : ''}`}
                                            style={{
                                                top: `${topPx}px`,
                                                height: `${heightPx}px`,
                                                backgroundColor: `${bgColor}20`,
                                                borderLeft: task.isGoogleEvent ? `4px solid ${bgColor}` : `4px solid ${bgColor}`
                                            }}
                                            onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                                        >
                                            <div className="text-xs font-bold text-white truncate">{task.title}</div>
                                            {heightPx > 30 && (
                                                <div className="text-[10px] text-[#B3B3B3] truncate">
                                                    {String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')} - {String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CalendarWeekView;
