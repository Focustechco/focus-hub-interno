import React from 'react';
import { Task, User } from '../types';
import * as LucideIcons from 'lucide-react';

interface TaskSidePanelProps {
    event: Task;
    onClose: () => void;
    onEdit: () => void;
    users: User[];
}

const TaskSidePanel: React.FC<TaskSidePanelProps> = ({ event, onClose, onEdit, users }) => {
    const assignee = users.find(u => u.id === event.assigneeId);
    
    // Format date
    let formattedDate = event.dueDate || '';
    if (event.dueDate) {
        try {
            const d = new Date(event.dueDate);
            formattedDate = d.toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
        } catch (e) {}
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-end z-[100] transition-opacity" onClick={onClose}>
            <div className="bg-[#1C1C1C] h-full shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col translate-x-0 transition-transform" onClick={e => e.stopPropagation()}>
                {/* Header actions */}
                <div className="flex justify-between items-center p-4 border-b border-[#2E2E2E]">
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-[#3a3a3a] text-[#B3B3B3] hover:text-white transition-colors" title="Fechar">
                            <LucideIcons.X className="w-5 h-5" />
                        </button>
                        <span className="font-semibold text-white">Detalhes do Evento</span>
                    </div>
                    <button onClick={onEdit} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#2E2E2E] hover:bg-[#3a3a3a] text-white transition-colors text-sm font-medium" title="Editar">
                        <LucideIcons.Edit2 className="w-4 h-4" /> Editar
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Title Row */}
                    <div className="flex gap-4 items-start mb-6">
                        <div className="mt-2 shrink-0">
                            <span className={`inline-block w-4 h-4 rounded-sm ${event.priority === 'alta' ? 'bg-red-500' : event.priority === 'media' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-normal text-white">{event.title}</h2>
                            <p className="text-sm text-[#B3B3B3] capitalize mt-1">{formattedDate}</p>
                        </div>
                    </div>

                    <div className="space-y-6 mt-6 text-sm text-white">
                        {/* Status */}
                        <div className="flex gap-4 items-center">
                            <LucideIcons.CheckCircle2 className="w-5 h-5 text-[#B3B3B3]" />
                            <span>Status: <strong className="capitalize font-semibold">{event.status.replace('_', ' ')}</strong></span>
                        </div>

                        {/* Assignee */}
                        <div className="flex gap-4 items-center">
                            <LucideIcons.Users className="w-5 h-5 text-[#B3B3B3]" />
                            {assignee ? (
                                <div className="flex items-center gap-3">
                                    <img src={assignee.avatarUrl} alt={assignee.name} className="w-7 h-7 rounded-full object-cover" />
                                    <span className="font-medium">{assignee.name}</span>
                                </div>
                            ) : (
                                <span className="text-[#B3B3B3]">Não atribuído</span>
                            )}
                        </div>

                        {/* New Agenda Fields */}
                        {event.startTime && (
                            <div className="flex gap-4 items-center">
                                <LucideIcons.Clock className="w-5 h-5 text-[#B3B3B3]" />
                                <span>Início: <strong className="font-semibold">{event.startTime}</strong></span>
                            </div>
                        )}
                        
                        {event.endTime && (
                            <div className="flex gap-4 items-center">
                                <LucideIcons.Clock className="w-5 h-5 text-[#B3B3B3]" />
                                <span>Término: <strong className="font-semibold">{event.endTime}</strong></span>
                            </div>
                        )}

                        {event.sector && (
                            <div className="flex gap-4 items-center">
                                <LucideIcons.Tag className="w-5 h-5 text-[#B3B3B3]" />
                                <span className="px-2 py-1 bg-[#2E2E2E] rounded-md text-xs">{event.sector}</span>
                            </div>
                        )}

                        {event.location && (
                            <div className="flex gap-4 items-start">
                                <LucideIcons.MapPin className="w-5 h-5 text-[#B3B3B3] mt-0.5" />
                                <span>Local: <strong className="font-semibold">{event.location}</strong></span>
                            </div>
                        )}

                        {event.repetition && event.repetition !== 'none' && (
                            <div className="flex gap-4 items-center">
                                <LucideIcons.Repeat className="w-5 h-5 text-[#B3B3B3]" />
                                <span>Repete: <strong className="font-semibold capitalize">{event.repetition}</strong></span>
                            </div>
                        )}

                        {/* Description */}
                        {event.description && (
                            <div className="pt-4 border-t border-[#2E2E2E]">
                                <div className="flex gap-2 items-center text-[#B3B3B3] mb-2">
                                    <LucideIcons.AlignLeft className="w-4 h-4" />
                                    <span className="font-semibold">Descrição</span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed opacity-90 pl-6">
                                    {event.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskSidePanel;
