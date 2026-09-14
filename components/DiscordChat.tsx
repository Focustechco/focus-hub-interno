import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { User } from '../types';
import { UsersIcon, SendIcon, UserIcon, PaperclipIcon } from './icons';
import { Hash as HashIcon } from 'lucide-react';
import { useToast } from './Toast';

interface DiscordChatProps {
    currentUser: User;
}

const DiscordChat: React.FC<DiscordChatProps> = ({ currentUser }) => {
    const toast = useToast();
    const [channels, setChannels] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchInitialData();
        // Setup Socket.io or periodic polling for Discord messages in a real app
        const interval = setInterval(() => {
            if (selectedChannel) fetchMessages(selectedChannel.id);
        }, 5000);
        return () => clearInterval(interval);
    }, [selectedChannel]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [channelsRes, usersRes] = await Promise.all([
                api.get('/discord/channels').catch(() => ({ data: [] })),
                api.get('/discord/users').catch(() => ({ data: [] }))
            ]);
            setChannels(channelsRes.data || []);
            setUsers(usersRes.data || []);
            
            if (channelsRes.data && channelsRes.data.length > 0) {
                setSelectedChannel(channelsRes.data[0]);
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao conectar com Discord');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (channelId: string) => {
        try {
            const res = await api.get(`/discord/channels/${channelId}/messages?limit=50`);
            setMessages(res.data);
            scrollToBottom();
        } catch (err) {
            console.error('Error fetching messages', err);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChannel) return;

        const content = newMessage;
        setNewMessage('');
        
        try {
            // Optimistic update
            const tempId = Date.now().toString();
            setMessages(prev => [...prev, {
                id: tempId,
                content,
                author: {
                    id: currentUser.id,
                    username: currentUser.name,
                    avatar: currentUser.avatarUrl
                },
                timestamp: Date.now(),
                attachments: []
            }]);
            scrollToBottom();

            await api.post(`/discord/channels/${selectedChannel.id}/messages`, { content });
            fetchMessages(selectedChannel.id);
        } catch (err) {
            toast.error('Falha ao enviar mensagem');
            fetchMessages(selectedChannel.id);
        }
    };

    if (loading && channels.length === 0) {
        return <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#1C1C1C] text-gray-500 dark:text-[#888]">Conectando ao Servidor Discord...</div>;
    }

    return (
        <div className="absolute inset-0 bg-white dark:bg-[#1C1C1C] z-20 flex flex-row">
            {/* Sidebar Channels */}
            <div className="w-64 border-r border-gray-200 dark:border-[#2E2E2E] flex flex-col bg-gray-50 dark:bg-[#0E0E0E]">
                <div className="p-4 border-b border-gray-200 dark:border-[#2E2E2E]">
                    <h3 className="text-gray-900 dark:text-white font-bold text-lg flex items-center">
                        <span className="-white">
                            <svg className="w-4 h-4 text-gray-900 dark:text-white" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.1,53,91,65.69,84.69,65.69Z" /></svg>
                        </span>
                        Chat Interno
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-[#888] uppercase mb-2 px-2">Canais</h4>
                    {channels.map(channel => (
                        <div 
                            key={channel.id} 
                            onClick={() => setSelectedChannel(channel)}
                            className={`flex items-center p-2 mb-1 rounded cursor-pointer transition-colors ${selectedChannel?.id === channel.id ? 'bg-gray-200 dark:bg-[#333] text-gray-900 dark:text-white' : 'text-gray-500 dark:text-[#888] hover:bg-gray-100 dark:bg-[#2A2A2A] hover:text-gray-900 dark:text-white'}`}
                        >
                            <HashIcon className="w-4 h-4 mr-2 opacity-70" />
                            <span className="text-sm font-medium truncate">{channel.name.toLowerCase()}</span>
                        </div>
                    ))}

                    <h4 className="text-xs font-bold text-gray-500 dark:text-[#888] uppercase mb-2 px-2 mt-6">Mensagens Diretas</h4>
                    <div className="text-xs text-gray-500 dark:text-[#B3B3B3] px-2 italic">Carregando usuários...</div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-[#1C1C1C]">
                {/* Chat Header */}
                <div className="h-14 border-b border-gray-200 dark:border-[#2E2E2E] flex items-center justify-between px-4 bg-white dark:bg-[#1C1C1C]">
                    <div className="flex items-center">
                        <HashIcon className="w-6 h-6 text-gray-500 dark:text-[#888] mr-2" />
                        <h2 className="text-gray-900 dark:text-white font-bold text-lg">{selectedChannel?.name || 'Selecione um canal'}</h2>
                    </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {!selectedChannel ? (
                        <div className="h-full flex items-center justify-center text-gray-500 dark:text-[#888]">
                            Selecione um canal no menu lateral.
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-[#888]">
                            <HashIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p>Bem-vindo ao início do canal <strong>#{selectedChannel?.name}</strong>.</p>
                            <p className="text-sm">Este é o começo da história deste canal no Discord.</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isConsecutive = idx > 0 && messages[idx-1].author.id === msg.author.id && (msg.timestamp - messages[idx-1].timestamp < 300000); // 5 mins
                            
                            return (
                                <div key={msg.id} className={`flex ${isConsecutive ? 'mt-1' : 'mt-4'} hover:bg-gray-50 dark:bg-[#0E0E0E] -mx-4 px-4 py-1 group`}>
                                    {isConsecutive ? (
                                        <div className="w-10 mr-4 opacity-0 group-hover:opacity-50 text-[10px] text-right pt-1">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    ) : (
                                        <img 
                                            src={msg.author.avatar || `https://ui-avatars.com/api/?name=${msg.author.username}`} 
                                            alt={msg.author.username} 
                                            className="w-10 h-10 rounded-full mr-4 cursor-pointer hover:opacity-80" 
                                        />
                                    )}
                                    <div className="flex-1">
                                        {!isConsecutive && (
                                            <div className="flex items-baseline">
                                                <span className="font-semibold text-gray-900 dark:text-white mr-2 hover:underline cursor-pointer">{msg.author.username}</span>
                                                {msg.author.isBot && <span className="text-[10px] -white px-1 rounded mr-2 uppercase">Bot</span>}
                                                <span className="text-xs text-gray-500 dark:text-[#888]">
                                                    {new Date(msg.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                        <div className="text-gray-900 dark:text-[#DCDDDE] text-sm whitespace-pre-wrap leading-relaxed">
                                            {msg.content}
                                        </div>
                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {msg.attachments.map((att: any) => (
                                                    <div key={att.id} className="max-w-xs rounded overflow-hidden border border-gray-200 dark:border-[#2E2E2E]">
                                                        {att.contentType?.startsWith('image/') ? (
                                                            <img src={att.url} alt={att.name} className="w-full h-auto" />
                                                        ) : (
                                                            <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center p-3 bg-gray-100 dark:bg-[#2A2A2A] hover:bg-gray-200 dark:bg-[#333] transition-colors">
                                                                <PaperclipIcon className="w-5 h-5 mr-2 text-gray-500 dark:text-[#888]" />
                                                                <span className="text-sm text-[#00AFF4] truncate">{att.name}</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {selectedChannel && (
                    <div className="p-4 bg-white dark:bg-[#1C1C1C]">
                        <form onSubmit={handleSendMessage} className="bg-gray-100 dark:bg-[#2A2A2A] rounded-lg flex items-center p-2 focus-within:ring-1 focus-within:ring-[#5865F2]">
                            <button type="button" className="p-2 text-gray-500 dark:text-[#888] hover:text-gray-900 dark:text-white transition-colors rounded-full hover:bg-gray-200 dark:bg-[#333]">
                                <PaperclipIcon className="w-5 h-5" />
                            </button>
                            <input 
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder={`Conversar em #${selectedChannel.name}`}
                                className="flex-1 bg-transparent text-gray-900 dark:text-white px-3 focus:outline-none placeholder-[#B3B3B3]"
                            />
                            <button 
                                type="submit" 
                                disabled={!newMessage.trim()}
                                className="p-2 text-gray-500 dark:text-[#888] hover:text-[#5865F2] disabled:opacity-50 transition-colors"
                            >
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                )}
            </div>
            
            {/* Right Panel (Server/User Info) */}
            <div className="w-64 border-l border-gray-200 dark:border-[#2E2E2E] bg-white dark:bg-[#1C1C1C] hidden lg:flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-[#2E2E2E] flex items-center">
                    <UsersIcon className="w-5 h-5 text-gray-500 dark:text-[#888] mr-2" />
                    <h3 className="text-gray-900 dark:text-white font-bold text-sm">Membros do Canal</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-[#888] uppercase mb-2 px-2 mt-2">Equipe</h4>
                    {users.map((u: any) => (
                        <div key={u.id} className="flex items-center p-2 rounded cursor-pointer hover:bg-gray-100 dark:bg-[#2A2A2A] group">
                            <div className="relative mr-3">
                                <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}`} alt={u.username} className="w-8 h-8 rounded-full" />
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#181818] ${u.status === 'online' ? 'bg-green-500' : u.status === 'idle' ? 'bg-yellow-500' : u.status === 'dnd' ? 'bg-red-500' : 'bg-gray-50 dark:bg-[#0E0E0E]0'}`}></div>
                            </div>
                            <div className="flex-1 truncate">
                                <div className="text-gray-900 dark:text-[#DCDDDE] text-sm group-hover:text-gray-900 dark:text-white truncate" style={{ color: u.roles && u.roles[0]?.color ? u.roles[0].color : undefined }}>
                                    {u.displayName || u.username}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-[#888] truncate">{u.status === 'online' ? 'Disponível' : u.status}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DiscordChat;
