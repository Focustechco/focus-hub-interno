import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Megaphone, MessageCircle, Users, Building, Trophy, Link as LinkIcon, FileText, Search, Cake, UserPlus, PhoneCall, Radio, Paperclip, Send, Heart, ThumbsUp, PartyPopper, ExternalLink, Mail, Copy, CheckCircle2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import api from '../services/api';
import { User, Post, Notification, NotificationType, NotificationPreferences, Role } from '../types';
import { useToast } from '../components/Toast';

interface MuralScreenProps {
    currentUser: User;
    posts?: Post[];
    users?: User[];
    setPosts?: (posts: Post[] | ((prev: Post[]) => Post[])) => void;
    setNotifications?: (notifications: (prev: Notification[]) => Notification[]) => void;
    notificationPreferences?: { [userId: string]: NotificationPreferences };
}

const MuralScreen: React.FC<MuralScreenProps> = ({ currentUser }) => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [birthdays, setBirthdays] = useState([]);
    const [newHires, setNewHires] = useState([]);
    
    // Avisos State
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [newPost, setNewPost] = useState({ title: '', content: '', priority: 'Normal' });
    const [isPosting, setIsPosting] = useState(false);

    // Canais e Contatos State
    const [channels, setChannels] = useState<any[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Chat State
    const [socket, setSocket] = useState<Socket | null>(null);
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Socket Initialization
    useEffect(() => {
        const baseUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
        const newSocket = io(baseUrl, {
            auth: { userId: currentUser.id }
        });
        
        setSocket(newSocket);

        newSocket.on('new_message', (msg: any) => {
            setMessages(prev => {
                // Ignore if not related to the current chat (to be robust, we filter in UI, but let's just append)
                return [...prev, msg];
            });
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        return () => {
            newSocket.close();
        };
    }, [currentUser.id]);

    useEffect(() => {
        if (activeTab === 'dashboard') {
            api.get('/communication/dashboard/birthdays').then(res => setBirthdays(res.data)).catch(console.error);
            api.get('/communication/dashboard/new-hires').then(res => setNewHires(res.data)).catch(console.error);
        } else if (activeTab === 'avisos') {
            fetchAnnouncements();
        } else if (activeTab === 'setores') {
            api.get('/communication/channels').then(res => setChannels(res.data)).catch(console.error);
        } else if (activeTab === 'contatos' || activeTab === 'chat') {
            // Load contacts for both tabs
            api.get('/communication/contacts').then(res => setContacts(res.data.filter((c: any) => c.id !== currentUser.id))).catch(console.error);
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'chat' && selectedContact && socket) {
            socket.emit('fetch_messages', { contactId: selectedContact.id }, (response: any) => {
                if (response.status === 'success') {
                    setMessages(response.messages);
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            });
        }
    }, [activeTab, selectedContact, socket]);

    const fetchAnnouncements = async () => {
        try {
            const res = await api.get('/communication/announcements');
            setAnnouncements(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPost.title.trim() || !newPost.content.trim()) return;

        setIsPosting(true);
        try {
            await api.post('/communication/announcements', newPost);
            setNewPost({ title: '', content: '', priority: 'Normal' });
            fetchAnnouncements();
            toast.success('Aviso publicado com sucesso!');
        } catch (err) {
            console.error(err);
            toast.error('Erro ao publicar aviso.');
        } finally {
            setIsPosting(false);
        }
    };

    const handleReaction = async (annId: string, reactionType: string) => {
        try {
            await api.post(`/communication/announcements/${annId}/reactions`, { reaction_type: reactionType });
            fetchAnnouncements();
        } catch (err) {
            console.error(err);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copiado para a área de transferência!');
    };

    const sendChatMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedContact || !socket) return;

        socket.emit('send_message', {
            receiverId: selectedContact.id,
            content: messageText
        }, (response: any) => {
            if (response.status === 'success') {
                setMessageText('');
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        });
    };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard Inicial', icon: Home },
        { id: 'avisos', label: 'Mural de Avisos', icon: Megaphone },
        { id: 'chat', label: 'Chat Interno', icon: MessageCircle },
        { id: 'setores', label: 'Setores e Canais', icon: Building },
        { id: 'contatos', label: 'Contatos Corporativos', icon: Users },
        { id: 'conquistas', label: 'Conquistas', icon: Trophy },
        { id: 'links', label: 'Links Úteis', icon: LinkIcon },
    ];

    const filteredContacts = contacts.filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.sector?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter messages for current conversation
    const currentConversationMessages = messages.filter(m => 
        (m.sender_id === currentUser.id && m.receiver_id === selectedContact?.id) ||
        (m.sender_id === selectedContact?.id && m.receiver_id === currentUser.id)
    );

    return (
        <div className="flex flex-col h-full">
            {/* Top Navigation */}
            <div className="h-16 bg-[#1C1C1C] border-b border-[#2E2E2E] flex items-center justify-between px-6 shrink-0 z-30">
                <div className="flex items-center space-x-6 flex-1 overflow-hidden">
                    <div className="flex items-center shrink-0">
                        <h2 className="text-xl font-bold text-white">Central de</h2>
                        <h2 className="text-xl font-bold text-[#FF6B00] ml-1">Comunicação</h2>
                    </div>
                    <div className="h-6 w-px bg-[#333] shrink-0 hidden md:block"></div>
                    <div className="flex space-x-2 overflow-x-auto scrollbar-hide flex-1 items-center pb-1 pt-1">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center px-4 py-2 rounded-full transition-colors whitespace-nowrap text-sm shrink-0 ${activeTab === tab.id ? 'bg-[#FF6B00] text-white font-bold' : 'text-[#888] hover:bg-[#FF6B00]/10 hover:text-[#FF6B00]'}`}
                                >
                                    <Icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'text-white' : 'text-[#888]'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                <div className="flex items-center space-x-4 pl-4 ml-2 border-l border-[#2E2E2E] shrink-0 hidden md:flex">
                    <div className="flex items-center space-x-3">
                        <img src={currentUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=2A2A2A&color=fff`} alt="Você" className="w-8 h-8 rounded-full" />
                        <div>
                            <p className="text-sm font-bold text-white truncate max-w-[120px]">{currentUser.name.split(' ')[0]}</p>
                            <p className="text-[10px] text-green-500 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span> Online</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden">


                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'dashboard' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-8 pb-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { id: 'avisos', title: 'Comunicados', desc: 'Avisos importantes', icon: Megaphone, color: 'text-[#FF6B00]', bg: 'bg-[#FF6B00]' },
                                    { id: 'chat', title: 'Chat Interno', desc: 'Converse com a equipe', icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-500' },
                                    { id: 'setores', title: 'Canais Focus', desc: 'Grupos e setores', icon: Radio, color: 'text-purple-500', bg: 'bg-purple-500' },
                                    { id: 'contatos', title: 'Ramais e Contatos', desc: 'Diretório corporativo', icon: PhoneCall, color: 'text-green-500', bg: 'bg-green-500' },
                                ].map(item => (
                                    <div key={item.id} onClick={() => setActiveTab(item.id)} className="bg-[#1C1C1C] p-5 rounded-2xl border border-[#2E2E2E] cursor-pointer hover:bg-[#2A2A2A] transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between h-36">
                                        <div className={`w-10 h-10 rounded-xl ${item.bg} bg-opacity-20 flex items-center justify-center mb-4`}>
                                            <item.icon className={`w-5 h-5 ${item.color}`} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-lg leading-tight">{item.title}</h3>
                                            <p className="text-[#888] text-xs mt-1">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] p-6 shadow-lg flex flex-col">
                                    <h3 className="text-white font-bold mb-6 flex items-center pb-3 border-b border-[#333]"><Megaphone className="w-5 h-5 mr-2 text-[#FF6B00]"/> Últimos Avisos</h3>
                                    <div className="space-y-4 flex-1">
                                        <div className="border-l-2 border-[#FF6B00] pl-4">
                                            <p className="text-xs text-[#FF6B00] font-bold mb-1">HOJE</p>
                                            <p className="text-white text-sm hover:underline cursor-pointer">Verifique a nova aba de Mural de Avisos</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveTab('avisos')} className="mt-6 w-full py-2 bg-[#FF6B00] hover:bg-[#FF8C33] rounded-lg text-sm text-white font-semibold transition-colors">Ver todos os avisos</button>
                                </div>

                                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] p-6 shadow-lg">
                                    <h3 className="text-white font-bold mb-6 flex items-center pb-3 border-b border-[#333]"><Cake className="w-5 h-5 mr-2 text-pink-500"/> Aniversariantes</h3>
                                    {birthdays.length === 0 ? <p className="text-sm text-[#888] text-center py-4">Nenhum aniversariante recente.</p> : (
                                        <ul className="space-y-4">
                                            {birthdays.map((b: any) => (
                                                <li key={b.id} className="flex items-center space-x-3">
                                                    <img src={b.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=2A2A2A&color=fff`} alt={b.name} className="w-10 h-10 rounded-full object-cover" />
                                                    <div>
                                                        <p className="text-white text-sm font-bold">{b.name}</p>
                                                        <p className="text-[#888] text-xs">{new Date(b.birth_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                
                                <div className="flex flex-col space-y-6">
                                    <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] p-6 shadow-lg flex-1">
                                        <h3 className="text-white font-bold mb-4 flex items-center"><UserPlus className="w-5 h-5 mr-2 text-green-500"/> Novos Colaboradores</h3>
                                        {newHires.length === 0 ? <p className="text-sm text-[#888]">Nenhum colaborador recente.</p> : (
                                            <ul className="space-y-3">
                                                {newHires.map((h: any) => (
                                                    <li key={h.id} className="flex items-center space-x-3 bg-[#FF6B00]/10 p-2 rounded-lg">
                                                        <img src={h.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(h.name)}&background=FF6B00&color=fff`} alt={h.name} className="w-8 h-8 rounded-full object-cover" />
                                                        <div>
                                                            <p className="text-white text-xs font-bold">{h.name}</p>
                                                            <p className="text-[#B3B3B3] text-[10px] uppercase">{h.job_title || h.sector || 'Equipe'}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    <div className="bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] p-6 shadow-lg">
                                        <h3 className="text-white font-bold mb-4 flex items-center"><LinkIcon className="w-5 h-5 mr-2 text-blue-500"/> Links Úteis</h3>
                                        <ul className="space-y-3">
                                        <li className="bg-[#FF6B00]/10 rounded-lg p-3 flex items-center space-x-3 cursor-pointer hover:bg-[#FF6B00]/20 transition-colors">
                                            <FileText className="w-4 h-4 text-[#FF6B00]" />
                                            <span className="text-white text-sm font-semibold">Manual do Colaborador</span>
                                        </li>
                                        <li className="bg-[#FF6B00]/10 rounded-lg p-3 flex items-center space-x-3 cursor-pointer hover:bg-[#FF6B00]/20 transition-colors">
                                            <LinkIcon className="w-4 h-4 text-[#FF6B00]" />
                                            <span className="text-white text-sm font-semibold">Google Drive</span>
                                        </li>
                                        <li className="bg-[#FF6B00]/10 rounded-lg p-3 flex items-center space-x-3 cursor-pointer hover:bg-[#FF6B00]/20 transition-colors">
                                            <LinkIcon className="w-4 h-4 text-[#FF6B00]" />
                                            <span className="text-white text-sm font-semibold">Portal RH</span>
                                        </li>
                                    </ul>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'avisos' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-12 pb-10 max-w-4xl mx-auto">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2 flex items-center"><Megaphone className="w-8 h-8 mr-3 text-[#FF6B00]"/> Mural de Avisos</h1>
                                    <p className="text-gray-500">Acompanhe os comunicados oficiais e notícias da equipe.</p>
                                </div>
                            </div>

                            {currentUser.role === Role.ADMIN && (
                                <div className="border border-gray-200 shadow-sm rounded-2xl p-6 mb-8 bg-white">
                                    <form onSubmit={handleCreateAnnouncement}>
                                        <input 
                                            type="text" 
                                            placeholder="Título do Comunicado..." 
                                            value={newPost.title}
                                            onChange={e => setNewPost({...newPost, title: e.target.value})}
                                            className="w-full bg-transparent text-xl font-bold mb-4 focus:outline-none placeholder-gray-400"
                                        />
                                        <textarea 
                                            placeholder="Escreva a mensagem oficial..." 
                                            value={newPost.content}
                                            onChange={e => setNewPost({...newPost, content: e.target.value})}
                                            className="w-full bg-gray-50 p-4 rounded-xl resize-none h-24 focus:outline-none focus:ring-1 focus:ring-[#FF6B00] mb-4 border border-gray-200"
                                        />
                                        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                                            <div className="flex space-x-4">
                                                <button type="button" className="flex items-center text-gray-500 hover:text-[#FF6B00] transition-colors text-sm">
                                                    <Paperclip className="w-4 h-4 mr-2" /> Anexar
                                                </button>
                                                <select 
                                                    value={newPost.priority}
                                                    onChange={e => setNewPost({...newPost, priority: e.target.value})}
                                                    className="bg-gray-50 text-sm rounded-lg px-3 py-1 border border-gray-200 focus:outline-none"
                                                >
                                                    <option value="Normal">Normal</option>
                                                    <option value="Importante">Importante</option>
                                                    <option value="Urgente">Urgente</option>
                                                </select>
                                            </div>
                                            <button 
                                                type="submit" 
                                                disabled={isPosting}
                                                className="bg-[#FF6B00] text-white px-6 py-2 rounded-full font-bold flex items-center hover:bg-[#e66000] transition-colors disabled:opacity-50"
                                            >
                                                <Send className="w-4 h-4 mr-2" /> {isPosting ? 'Publicando...' : 'Publicar Aviso'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="space-y-6">
                                {announcements.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">Nenhum aviso publicado ainda.</div>
                                ) : (
                                    announcements.map(ann => (
                                        <div key={ann.id} className={`bg-white border ${ann.priority === 'Urgente' ? 'border-red-500' : ann.priority === 'Importante' ? 'border-yellow-500' : 'border-gray-200'} rounded-2xl p-6 shadow-sm relative`}>
                                            {ann.priority !== 'Normal' && (
                                                <span className={`absolute top-0 right-6 -translate-y-1/2 px-3 py-1 rounded-full text-xs font-bold text-white ${ann.priority === 'Urgente' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                                                    {ann.priority.toUpperCase()}
                                                </span>
                                            )}
                                            <div className="flex items-center mb-4">
                                                <img src={ann.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ann.author_name)}&background=FF6B00&color=fff`} alt={ann.author_name} className="w-12 h-12 rounded-full mr-4" />
                                                <div>
                                                    <h4 className="font-bold">{ann.author_name}</h4>
                                                    <div className="flex items-center text-gray-500 text-xs space-x-2">
                                                        <span>{ann.author_role || 'Administrador'}</span>
                                                        <span>•</span>
                                                        <span>{ann.author_sector || 'Geral'}</span>
                                                        <span>•</span>
                                                        <span>{new Date(ann.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">{ann.title}</h3>
                                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                                            <div className="mt-6 border-t border-gray-100 pt-4 flex items-center justify-between">
                                                <div className="flex flex-wrap gap-2">
                                                    <button onClick={() => handleReaction(ann.id, 'like')} className="flex items-center bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm transition-colors border border-gray-200">
                                                        <ThumbsUp className="w-4 h-4 mr-2 text-blue-500" /> Curti
                                                    </button>
                                                    <button onClick={() => handleReaction(ann.id, 'clap')} className="flex items-center bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm transition-colors border border-gray-200">
                                                        👏 Parabéns
                                                    </button>
                                                    <button onClick={() => handleReaction(ann.id, 'heart')} className="flex items-center bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm transition-colors border border-gray-200">
                                                        <Heart className="w-4 h-4 mr-2 text-red-500" /> Gostei
                                                    </button>
                                                    <button onClick={() => handleReaction(ann.id, 'celebrate')} className="flex items-center bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm transition-colors border border-gray-200">
                                                        <PartyPopper className="w-4 h-4 mr-2 text-purple-500" /> Comemorar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'setores' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-12 pb-10 max-w-5xl mx-auto">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center"><Building className="w-8 h-8 mr-3 text-[#FF6B00]"/> Setores e Canais</h1>
                                    <p className="text-[#B3B3B3]">Acesso rápido aos grupos de comunicação da empresa.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {channels.length === 0 ? (
                                    <div className="col-span-full text-center py-12 text-[#888]">Nenhum canal configurado.</div>
                                ) : (
                                    channels.map(channel => (
                                        <div key={channel.id} className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-2xl p-6 shadow-lg hover:border-[#FF6B00] transition-colors group">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-12 h-12 rounded-xl bg-[#2A2A2A] flex items-center justify-center">
                                                    <Radio className="w-6 h-6 text-[#FF6B00]" />
                                                </div>
                                                <span className="bg-[#2A2A2A] text-white text-xs px-2 py-1 rounded-full uppercase font-bold tracking-wider">{channel.type}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">{channel.name}</h3>
                                            <p className="text-[#888] text-sm mb-6 h-10 line-clamp-2">{channel.description}</p>
                                            <a href={channel.url} target="_blank" rel="noopener noreferrer" className="w-full py-2 bg-[#FF6B00] hover:bg-[#e66000] rounded-lg text-white font-bold transition-colors flex items-center justify-center">
                                                Acessar <ExternalLink className="w-4 h-4 ml-2" />
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'contatos' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-12 pb-10 max-w-6xl mx-auto">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center"><Users className="w-8 h-8 mr-3 text-[#FF6B00]"/> Agenda Corporativa</h1>
                                    <p className="text-[#B3B3B3]">Contatos de toda a equipe e diretoria.</p>
                                </div>
                            </div>

                            {/* Diretoria Section */}
                            <div className="mb-12">
                                <h2 className="text-xl font-bold text-white mb-6 border-b border-[#333] pb-2 text-center">Diretoria</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredContacts.filter(c => c.role === 'admin' || c.job_title?.toLowerCase().includes('diretor') || c.job_title?.toLowerCase().includes('ceo')).map(contact => (
                                        <div key={contact.id} className="bg-[#1C1C1C] border border-yellow-500/50 rounded-2xl p-6 shadow-lg flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
                                            <img src={contact.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=2A2A2A&color=fff`} alt={contact.name} className="w-20 h-20 rounded-full mb-4 border-2 border-yellow-500" />
                                            <h3 className="text-white font-bold text-lg">{contact.name}</h3>
                                            <p className="text-yellow-500 text-sm font-semibold mb-1">{contact.job_title || 'Diretor'}</p>
                                            <p className="text-[#888] text-xs mb-4">{contact.sector || 'Geral'}</p>
                                            
                                            <div className="flex space-x-3 mt-auto w-full">
                                                {contact.whatsapp && (
                                                    <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g,'')}`} target="_blank" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors">
                                                        WhatsApp
                                                    </a>
                                                )}
                                                <button onClick={() => copyToClipboard(contact.email)} className="bg-[#2A2A2A] hover:bg-[#333] text-white p-2 rounded-lg transition-colors" title="Copiar Email">
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Todos Contatos */}
                            <div>
                                <h2 className="text-xl font-bold text-white mb-6 border-b border-[#333] pb-2 text-center">Colaboradores</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredContacts.filter(c => c.role !== 'admin' && !c.job_title?.toLowerCase().includes('diretor') && !c.job_title?.toLowerCase().includes('ceo')).map(contact => (
                                        <div key={contact.id} className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-2xl p-6 shadow-lg flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
                                            <img src={contact.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=2A2A2A&color=fff`} alt={contact.name} className="w-20 h-20 rounded-full mb-4" />
                                            <h3 className="text-white font-bold text-lg">{contact.name}</h3>
                                            <p className="text-[#FF6B00] text-sm font-semibold mb-1">{contact.job_title || 'Colaborador'}</p>
                                            <p className="text-[#888] text-xs mb-4">{contact.sector || 'Equipe'}</p>
                                            
                                            <div className="flex space-x-3 mt-auto w-full">
                                                {contact.phone && (
                                                    <button onClick={() => copyToClipboard(contact.phone)} className="flex-1 bg-[#2A2A2A] hover:bg-[#333] text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors">
                                                        <Copy className="w-3 h-3 mr-1" /> Tel
                                                    </button>
                                                )}
                                                {contact.whatsapp && (
                                                    <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g,'')}`} target="_blank" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors">
                                                        WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab !== 'dashboard' && activeTab !== 'avisos' && activeTab !== 'setores' && activeTab !== 'contatos' && activeTab !== 'chat' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-20 flex flex-col items-center justify-center text-center p-12 bg-[#1C1C1C] border border-[#2E2E2E] rounded-2xl shadow-xl">
                            <div className="w-20 h-20 bg-[#2A2A2A] rounded-full flex items-center justify-center mb-6">
                                {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Home, { className: 'w-10 h-10 text-[#FF6B00]' })}
                            </div>
                            <h2 className="text-2xl font-bold mb-3 text-white">Módulo em Desenvolvimento</h2>
                            <p className="text-[#B3B3B3] max-w-md">O submódulo <span className="font-bold text-white">"{tabs.find(t => t.id === activeTab)?.label}"</span> está sendo construído nesta fase da integração da nova Intranet FocusHub.</p>
                            <button onClick={() => setActiveTab('dashboard')} className="mt-8 px-6 py-2 border border-[#FF6B00] text-[#FF6B00] rounded-full hover:bg-[#FF6B00] hover:text-white transition-colors font-semibold">
                                Voltar ao Dashboard
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Chat UI Overlaid or Full Screen - using absolute positioning when activeTab is chat to fill the content area */}
                {activeTab === 'chat' && (
                    <div className="absolute inset-0 bg-[#121212] z-20 flex flex-row">
                        {/* Contacts Sidebar */}
                        <div className="w-80 border-r border-[#2E2E2E] flex flex-col bg-[#1C1C1C]">
                            <div className="p-4 border-b border-[#2E2E2E]">
                                <h3 className="text-white font-bold mb-4 text-xl">Chat Interno</h3>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Buscar contato..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#2A2A2A] border border-[#3E3E3E] text-white px-4 py-2 pl-10 rounded-xl focus:outline-none focus:border-[#FF6B00] transition-colors" 
                                    />
                                    <Search className="w-4 h-4 text-[#888] absolute left-3 top-3" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {filteredContacts.map(contact => (
                                    <div 
                                        key={contact.id} 
                                        onClick={() => setSelectedContact(contact)}
                                        className={`p-4 flex items-center cursor-pointer transition-colors border-b border-[#2A2A2A] ${selectedContact?.id === contact.id ? 'bg-[#FF6B00]/10 border-l-4 border-l-[#FF6B00]' : 'hover:bg-[#2A2A2A] border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="relative">
                                            <img src={contact.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=333&color=fff`} alt={contact.name} className="w-12 h-12 rounded-full mr-3 object-cover" />
                                            {/* Fake online status for demo */}
                                            <span className="absolute bottom-0 right-3 w-3 h-3 bg-green-500 border-2 border-[#1C1C1C] rounded-full"></span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold text-sm truncate">{contact.name}</h4>
                                            <p className="text-[#888] text-xs truncate">{contact.job_title || contact.sector}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chat Window */}
                        <div className="flex-1 flex flex-col bg-[#121212]">
                            {selectedContact ? (
                                <>
                                    {/* Header */}
                                    <div className="h-20 border-b border-[#2E2E2E] bg-[#1C1C1C] px-6 flex items-center justify-between shrink-0">
                                        <div className="flex items-center">
                                            <img src={selectedContact.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.name)}&background=333&color=fff`} alt={selectedContact.name} className="w-12 h-12 rounded-full mr-4 object-cover" />
                                            <div>
                                                <h3 className="text-white font-bold text-lg">{selectedContact.name}</h3>
                                                <p className="text-green-500 text-xs flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> Online</p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-3">
                                            <button className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#B3B3B3] hover:text-white hover:bg-[#333] transition-colors"><PhoneCall className="w-5 h-5"/></button>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-opacity-5">
                                        {currentConversationMessages.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center">
                                                <div className="w-24 h-24 bg-[#1C1C1C] rounded-full flex items-center justify-center mb-4">
                                                    <MessageCircle className="w-12 h-12 text-[#FF6B00]"/>
                                                </div>
                                                <h4 className="text-white font-bold text-xl mb-2">Inicie uma conversa</h4>
                                                <p className="text-[#888] max-w-sm">Mande um "Olá" para {selectedContact.name.split(' ')[0]} e comece a colaborar!</p>
                                            </div>
                                        ) : (
                                            currentConversationMessages.map((msg, idx) => {
                                                const isMine = msg.sender_id === currentUser.id;
                                                return (
                                                    <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${isMine ? 'bg-[#FF6B00] text-white rounded-tr-sm' : 'bg-[#1C1C1C] border border-[#2E2E2E] text-white rounded-tl-sm'}`}>
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                            <div className={`flex items-center justify-end mt-1 space-x-1 ${isMine ? 'text-white/70' : 'text-[#888]'}`}>
                                                                <span className="text-[10px]">{new Date(msg.created_at || Date.now()).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                                                                {isMine && <CheckCircle2 className="w-3 h-3" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input */}
                                    <div className="p-6 bg-[#1C1C1C] border-t border-[#2E2E2E]">
                                        <form onSubmit={sendChatMessage} className="flex items-center bg-[#2A2A2A] rounded-full px-2 py-2 pr-4 border border-[#3E3E3E] focus-within:border-[#FF6B00] transition-colors">
                                            <button type="button" className="w-10 h-10 flex items-center justify-center text-[#888] hover:text-white transition-colors shrink-0">
                                                <Paperclip className="w-5 h-5" />
                                            </button>
                                            <input 
                                                type="text" 
                                                placeholder="Digite sua mensagem..." 
                                                value={messageText}
                                                onChange={e => setMessageText(e.target.value)}
                                                className="flex-1 bg-transparent text-white px-4 focus:outline-none placeholder-[#666]"
                                            />
                                            <button 
                                                type="submit"
                                                disabled={!messageText.trim()} 
                                                className="w-10 h-10 rounded-full bg-[#FF6B00] flex items-center justify-center text-white shrink-0 hover:bg-[#e66000] disabled:opacity-50 disabled:hover:bg-[#FF6B00] transition-colors"
                                            >
                                                <Send className="w-5 h-5 ml-1" />
                                            </button>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center bg-[#121212] text-center p-10">
                                    <div className="w-32 h-32 bg-[#1C1C1C] rounded-full flex items-center justify-center mb-6 shadow-xl border border-[#2E2E2E]">
                                        <MessageCircle className="w-16 h-16 text-[#FF6B00] opacity-50"/>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">FocusHub Chat</h3>
                                    <p className="text-[#888] max-w-md">Selecione um contato ao lado para iniciar uma conversa, compartilhar arquivos e manter o time alinhado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MuralScreen;