import React, { useState } from 'react';
import { TaskComment, User } from '../types';
import { SendIcon, UserIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './Toast';
import api from '../services/api';

interface TaskCommentsProps {
    taskId: string;
    comments: TaskComment[];
    users: User[];
    currentUserId: string;
    onAddComment: (comment: TaskComment) => void;
}

const TaskComments: React.FC<TaskCommentsProps> = ({
    taskId,
    comments = [],
    users,
    currentUserId,
    onAddComment
}) => {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const commentData = {
                taskId,
                authorId: currentUserId,
                content: newComment.trim(),
            };

            // Optimistic update
            const tempComment: TaskComment = {
                id: `temp-${Date.now()}`,
                ...commentData,
                createdAt: new Date().toISOString(),
            };
            onAddComment(tempComment);
            setNewComment('');

            // API call (would be implemented in backend)
            // const response = await api.post(`/tasks/${taskId}/comments`, commentData);
            // onAddComment(response.data);

            toast.success('Comentário adicionado!');
        } catch (error) {
            console.error('Failed to add comment:', error);
            toast.error('Erro ao adicionar comentário.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getUser = (userId: string) => users.find(u => u.id === userId);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'agora';
        if (diffMins < 60) return `${diffMins}m atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays < 7) return `${diffDays}d atrás`;

        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className="mt-4 border-t border-[#2E2E2E] pt-4">
            <h4 className="text-sm font-semibold text-[#B3B3B3] mb-3 flex items-center gap-2">
                💬 Comentários ({comments.length})
            </h4>

            {/* Comments list */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar mb-4">
                <AnimatePresence>
                    {comments.length === 0 ? (
                        <p className="text-sm text-[#666] italic">Nenhum comentário ainda.</p>
                    ) : (
                        comments.map((comment) => {
                            const author = getUser(comment.authorId);
                            return (
                                <motion.div
                                    key={comment.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex gap-3"
                                >
                                    {author?.avatarUrl ? (
                                        <img
                                            src={author.avatarUrl}
                                            alt={author.name}
                                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 bg-[#2E2E2E] rounded-full flex items-center justify-center flex-shrink-0">
                                            <UserIcon className="w-4 h-4 text-[#B3B3B3]" />
                                        </div>
                                    )}
                                    <div className="flex-1 bg-[#2E2E2E] rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-white">
                                                {author?.name || 'Usuário'}
                                            </span>
                                            <span className="text-xs text-[#666]">
                                                {formatDate(comment.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[#B3B3B3] whitespace-pre-wrap">
                                            {comment.content}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Add comment form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicionar comentário..."
                    className="flex-1 bg-[#2E2E2E] text-white text-sm rounded-lg px-3 py-2 border border-transparent focus:border-[#FF6B00] focus:ring-0 transition-colors"
                    disabled={isSubmitting}
                />
                <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="bg-[#FF6B00] hover:bg-[#FF8C33] disabled:bg-[#2E2E2E] disabled:text-[#666] text-white p-2 rounded-lg transition-colors"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
};

export default TaskComments;
