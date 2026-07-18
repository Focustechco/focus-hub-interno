import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Send, Users, Building2, Shield, Bell, Smartphone, Monitor } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../Toast';

interface Sector {
    id: string;
    name: string;
}

export default function AdminNotifications() {
    const { addToast } = useToast();
    const [sectors, setSectors] = useState<Sector[]>([]);
    
    const [target, setTarget] = useState<'all' | 'sector' | 'admins'>('all');
    const [selectedSector, setSelectedSector] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    
    // Channels
    const [channels, setChannels] = useState({
        inApp: true,
        push: false,
        whatsapp: false
    });
    
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        // Fetch sectors for the dropdown
        api.get('/admin/sectors')
            .then(res => setSectors(res.data))
            .catch(console.error);
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!message.trim()) {
            addToast({ type: 'error', title: 'Erro', message: 'A mensagem não pode estar vazia' });
            return;
        }

        const selectedChannels = [];
        if (channels.inApp) selectedChannels.push('in-app');
        if (channels.push) selectedChannels.push('push');
        if (channels.whatsapp) selectedChannels.push('whatsapp');

        if (selectedChannels.length === 0) {
            addToast({ type: 'error', title: 'Erro', message: 'Selecione pelo menos um canal de envio' });
            return;
        }

        try {
            setIsSending(true);
            const response = await api.post('/admin/communication/send', {
                target,
                sector: selectedSector,
                title,
                message,
                channels: selectedChannels
            });
            
            addToast({ type: 'success', title: 'Sucesso', message: `Comunicado enviado para ${response.data.sentCount} usuário(s)` });
            
            // Reset form
            setTitle('');
            setMessage('');
        } catch (error) {
            console.error('Error sending mass communication:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao enviar comunicado' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E]">
                <div className="flex items-center gap-3">
                    <div className="bg-[#FF6B00]/10 p-2 rounded-lg">
                        <Megaphone className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Central de Comunicação em Massa</h2>
                        <p className="text-sm text-[#B3B3B3]">Envie alertas, comunicados e atualizações para as equipes</p>
                    </div>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1C1C1C] rounded-xl border border-[#2E2E2E] overflow-hidden"
            >
                <form onSubmit={handleSend} className="p-6 space-y-8">
                    
                    {/* Target Selection */}
                    <section>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-[#2E2E2E] pb-2">1. Público Alvo</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label className={`
                                cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all
                                ${target === 'all' ? 'border-[#FF6B00] bg-[#FF6B00]/5' : 'border-[#2E2E2E] bg-[#0E0E0E] hover:border-gray-500'}
                            `}>
                                <input type="radio" name="target" value="all" checked={target === 'all'} onChange={() => setTarget('all')} className="hidden" />
                                <Users className={`w-6 h-6 ${target === 'all' ? 'text-[#FF6B00]' : 'text-gray-500'}`} />
                                <div>
                                    <div className={`font-medium ${target === 'all' ? 'text-white' : 'text-[#B3B3B3]'}`}>Todos os Usuários</div>
                                    <div className="text-xs text-gray-500 mt-0.5">Companhia inteira</div>
                                </div>
                            </label>

                            <label className={`
                                cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all
                                ${target === 'sector' ? 'border-[#FF6B00] bg-[#FF6B00]/5' : 'border-[#2E2E2E] bg-[#0E0E0E] hover:border-gray-500'}
                            `}>
                                <input type="radio" name="target" value="sector" checked={target === 'sector'} onChange={() => setTarget('sector')} className="hidden" />
                                <Building2 className={`w-6 h-6 ${target === 'sector' ? 'text-[#FF6B00]' : 'text-gray-500'}`} />
                                <div>
                                    <div className={`font-medium ${target === 'sector' ? 'text-white' : 'text-[#B3B3B3]'}`}>Setor Específico</div>
                                    <div className="text-xs text-gray-500 mt-0.5">Apenas um departamento</div>
                                </div>
                            </label>

                            <label className={`
                                cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all
                                ${target === 'admins' ? 'border-[#FF6B00] bg-[#FF6B00]/5' : 'border-[#2E2E2E] bg-[#0E0E0E] hover:border-gray-500'}
                            `}>
                                <input type="radio" name="target" value="admins" checked={target === 'admins'} onChange={() => setTarget('admins')} className="hidden" />
                                <Shield className={`w-6 h-6 ${target === 'admins' ? 'text-[#FF6B00]' : 'text-gray-500'}`} />
                                <div>
                                    <div className={`font-medium ${target === 'admins' ? 'text-white' : 'text-[#B3B3B3]'}`}>Administradores</div>
                                    <div className="text-xs text-gray-500 mt-0.5">Somente gestão</div>
                                </div>
                            </label>
                        </div>

                        {target === 'sector' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                                <select
                                    value={selectedSector}
                                    onChange={e => setSelectedSector(e.target.value)}
                                    required
                                    className="w-full bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg py-2.5 px-4 text-white focus:ring-1 focus:ring-[#FF6B00] outline-none"
                                >
                                    <option value="" disabled>Selecione um setor...</option>
                                    {sectors.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </motion.div>
                        )}
                    </section>

                    {/* Channels Selection */}
                    <section>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-[#2E2E2E] pb-2">2. Canais de Envio</h3>
                        <div className="flex flex-wrap gap-4">
                            <label className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors
                                ${channels.inApp ? 'bg-[#FF6B00]/10 border-[#FF6B00] text-white' : 'bg-[#0E0E0E] border-[#2E2E2E] text-[#B3B3B3] hover:border-gray-500'}
                            `}>
                                <input type="checkbox" checked={channels.inApp} onChange={e => setChannels({...channels, inApp: e.target.checked})} className="hidden" />
                                <Monitor className="w-4 h-4" /> Notificação In-App
                            </label>

                            <label className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors
                                ${channels.push ? 'bg-[#FF6B00]/10 border-[#FF6B00] text-white' : 'bg-[#0E0E0E] border-[#2E2E2E] text-[#B3B3B3] hover:border-gray-500'}
                            `}>
                                <input type="checkbox" checked={channels.push} onChange={e => setChannels({...channels, push: e.target.checked})} className="hidden" />
                                <Bell className="w-4 h-4" /> Web Push
                            </label>

                            <label className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors
                                ${channels.whatsapp ? 'bg-[#FF6B00]/10 border-[#FF6B00] text-white' : 'bg-[#0E0E0E] border-[#2E2E2E] text-[#B3B3B3] hover:border-gray-500'}
                            `}>
                                <input type="checkbox" checked={channels.whatsapp} onChange={e => setChannels({...channels, whatsapp: e.target.checked})} className="hidden" />
                                <Smartphone className="w-4 h-4" /> WhatsApp
                            </label>
                        </div>
                    </section>

                    {/* Message Content */}
                    <section>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-[#2E2E2E] pb-2">3. Conteúdo</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[#B3B3B3] mb-1">Título (Opcional)</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Ex: Atualização Importante"
                                    className="w-full bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg py-2.5 px-4 text-white focus:ring-1 focus:ring-[#FF6B00] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-[#B3B3B3] mb-1">Mensagem *</label>
                                <textarea
                                    required
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Escreva sua mensagem aqui..."
                                    className="w-full bg-[#0E0E0E] border border-[#2E2E2E] rounded-lg py-3 px-4 text-white focus:ring-1 focus:ring-[#FF6B00] outline-none min-h-[150px] resize-y"
                                />
                                <div className="text-right text-xs text-gray-500 mt-1">
                                    {message.length} caracteres
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Submit */}
                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit"
                            disabled={isSending}
                            className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF8C33] text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                        >
                            {isSending ? <span className="animate-spin text-xl">⏳</span> : <Send className="w-5 h-5" />}
                            {isSending ? 'Enviando...' : 'Enviar Comunicado'}
                        </button>
                    </div>

                </form>
            </motion.div>
        </div>
    );
}
