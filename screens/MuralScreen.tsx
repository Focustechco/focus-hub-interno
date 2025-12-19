
import React, { useState } from 'react';
import { User, Post, Notification, NotificationType, NotificationPreferences, Role } from '../types';
import { SendIcon, UserIcon, StarIcon } from '../components/icons';
import api from '../services/api';

interface MuralScreenProps {
    currentUser: User;
    posts: Post[];
    users: User[];
    setPosts: (posts: Post[] | ((prev: Post[]) => Post[])) => void;
    setNotifications: (notifications: (prev: Notification[]) => Notification[]) => void;
    notificationPreferences: { [userId: string]: NotificationPreferences };
}

const MuralScreen: React.FC<MuralScreenProps> = ({ currentUser, posts, users, setPosts, setNotifications, notificationPreferences }) => {
    const [newPostContent, setNewPostContent] = useState('');

    const handlePostSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPostContent.trim() === '') return;

        try {
            const response = await api.post('/posts', {
                authorId: currentUser.id,
                content: newPostContent.trim()
            });

            const newPost = response.data;
            setPosts(prev => [newPost, ...prev]);
            setNewPostContent('');

            // Create notifications for all other users (Frontend only for now, ideally backend)
            const newNotifications: Notification[] = users
                .filter(user => user.id !== currentUser.id && (notificationPreferences[user.id]?.[NotificationType.NEW_POST] ?? true))
                .map(user => ({
                    id: `n${Date.now()}-${user.id}`,
                    userId: user.id,
                    type: NotificationType.NEW_POST,
                    message: `${currentUser.name} publicou no mural da equipe.`,
                    linkTo: 'mural',
                    isRead: false,
                    createdAt: new Date().toISOString(),
                }));

            setNotifications(prev => [...newNotifications, ...prev]);
        } catch (error) {
            console.error("Failed to create post:", error);
            alert("Erro ao publicar no mural.");
        }
    };

    const handleTogglePin = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const newPinState = !post.isPinned;

        // Optimistic update
        setPosts(prevPosts =>
            prevPosts.map(p =>
                p.id === postId ? { ...p, isPinned: newPinState } : p
            )
        );

        try {
            await api.put(`/posts/${postId}`, { isPinned: newPinState });
        } catch (error) {
            console.error("Failed to toggle pin:", error);
            // Revert on error
            setPosts(prevPosts =>
                prevPosts.map(p =>
                    p.id === postId ? { ...p, isPinned: !newPinState } : p
                )
            );
        }
    };

    const sortedPosts = [...posts].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return (
        <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-white">Mural da Equipe</h2>

            <div className="bg-[#1C1C1C] p-4 rounded-lg shadow-md mb-8">
                <form onSubmit={handlePostSubmit} className="flex items-start space-x-4">
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-10 h-10 rounded-full" />
                    <textarea
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Compartilhe algo com a equipe..."
                        className="flex-1 p-2 bg-[#2E2E2E] rounded-md border border-[#2E2E2E] focus:ring-1 focus:ring-[#FF6B00] focus:border-[#FF6B00] resize-none"
                        rows={2}
                    />
                    <button
                        type="submit"
                        className="bg-[#FF6B00] hover:bg-[#FF8C33] text-white font-bold p-3 rounded-full self-end disabled:bg-[#2E2E2E] disabled:text-gray-500"
                        disabled={!newPostContent.trim()}
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>

            <div className="space-y-6">
                {sortedPosts.map(post => {
                    const author = users.find(u => u.id === post.authorId);
                    return (
                        <div key={post.id} className={`bg-[#1C1C1C] p-5 rounded-lg shadow-md relative transition-all ${post.isPinned ? 'border-2 border-[#FF6B00]/50' : 'border-2 border-transparent'}`}>
                            <div className="flex items-center mb-3">
                                {author ? (
                                    <img src={author.avatarUrl} alt={author.name} className="w-10 h-10 rounded-full mr-3" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-[#2E2E2E] flex items-center justify-center mr-3">
                                        <UserIcon className="w-6 h-6 text-[#B3B3B3]" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-white">{author?.name || 'Usuário Desconhecido'}</p>
                                    <p className="text-xs text-[#B3B3B3]">{new Date(post.createdAt).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="absolute top-5 right-5 flex items-center gap-2">
                                {currentUser.role === Role.ADMIN && (
                                    <button
                                        onClick={() => handleTogglePin(post.id)}
                                        className="p-1 rounded-full text-gray-400 hover:text-white bg-[#2E2E2E]/50 hover:bg-[#2E2E2E]"
                                        title={post.isPinned ? 'Desafixar post' : 'Fixar post'}
                                    >
                                        <StarIcon className={`w-5 h-5 transition-colors ${post.isPinned ? 'text-yellow-400 fill-current' : 'hover:text-yellow-400'}`} />
                                    </button>
                                )}
                                {/* Fix: The 'title' prop is not valid on SVG components. Wrapped StarIcon in a span to apply the title for tooltip behavior. */}
                                {post.isPinned && currentUser.role !== Role.ADMIN && <span title="Post fixado"><StarIcon className="w-5 h-5 text-yellow-400 fill-current" /></span>}
                            </div>

                            <p className="text-white whitespace-pre-wrap">{post.content}</p>
                        </div>
                    );
                })}
                {posts.length === 0 && <p className="text-center text-[#B3B3B3]">O mural está vazio. Seja o primeiro a postar!</p>}
            </div>
        </div>
    );
};

export default MuralScreen;