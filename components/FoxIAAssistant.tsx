import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ChatMessage } from '../types';
import { SunIcon, PaperclipIcon, SendIcon, XIcon } from './icons';

const FoxIAAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useLocalStorage<ChatMessage[]>('fox-ia-chat-history', []);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: `ia-${Date.now()}`,
                    text: "Olá! 🦊 Sou a Fox IA, seu assistente inteligente da Focus. Como posso te ajudar hoje dentro do Focus Hub?",
                    sender: 'ia'
                }
            ]);
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            text: input.trim(),
            sender: 'user'
        };
        
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        try {
            if (!process.env.API_KEY) {
                console.error("Gemini API key not found.");
                const aiMessage: ChatMessage = {
                    id: `ia-error-${Date.now()}`,
                    text: "Desculpe, a chave da API do Gemini não está configurada. A funcionalidade de chat está desativada.",
                    sender: 'ia'
                };
                setMessages(prev => [...prev, aiMessage]);
                setIsLoading(false);
                return;
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const systemInstruction = `
                You are Fox IA, an intelligent, professional, and welcoming assistant for Focus Hub.
                Your knowledge base includes:
                - Focus Marketing: A marketing agency.
                - Focus Estúdios: An audiovisual production sector.
                - Focus Tech: A technology and systems development division.
                - Focus Hub: The all-in-one platform you are integrated into. It's used for daily operations, task management, check-ins, team announcements, etc.
                Your goal is to answer questions and provide guidance about these entities, internal modules, workflows, tools, and the team structure.
                Keep your answers concise and helpful.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: input.trim(),
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            const aiMessage: ChatMessage = {
                id: `ia-${Date.now()}`,
                text: response.text,
                sender: 'ia'
            };
            
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Error communicating with Gemini API:", error);
            const errorMessage: ChatMessage = {
                id: `ia-error-${Date.now()}`,
                text: "Desculpe, estou com um problema para me conectar. Tente novamente mais tarde.",
                sender: 'ia'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.1, boxShadow: "0 0 15px #ff6600" }}
                whileTap={{ scale: 0.9 }}
                className="fixed bottom-6 right-6 w-16 h-16 bg-[#1C1C1C] border-2 border-[#FF6B00] rounded-full flex items-center justify-center shadow-lg z-50"
                aria-label="Abrir assistente Fox IA"
            >
                <SunIcon className="w-7 h-7 text-white" />
            </motion.button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="fixed bottom-24 right-6 w-[calc(100%-3rem)] max-w-[420px] h-[70vh] max-h-[600px] bg-[#0f0f0f] border border-[#2E2E2E] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
                    >
                        <header className="flex items-center justify-between p-4 border-b border-[#2E2E2E] flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <SunIcon className="w-6 h-6 text-[#FF6B00]" />
                                <h3 className="font-bold text-lg">Fox IA Assistente</h3>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-gray-400 hover:bg-[#2E2E2E] hover:text-white">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </header>
                        
                        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                        {msg.sender === 'ia' && <div className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center flex-shrink-0"><SunIcon className="w-5 h-5 text-white" /></div>}
                                        <div className={`max-w-[80%] p-3 rounded-xl ${msg.sender === 'user' ? 'bg-[#FF6B00] text-white rounded-br-none' : 'bg-[#1C1C1C] text-gray-200 rounded-bl-none'}`}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                     <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center flex-shrink-0"><SunIcon className="w-5 h-5 text-white" /></div>
                                        <div className="max-w-[80%] p-3 rounded-xl bg-[#1C1C1C] text-gray-200 rounded-bl-none flex items-center">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse mr-1.5"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse mr-1.5" style={{animationDelay: '0.2s'}}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                        
                        <footer className="p-4 border-t border-[#2E2E2E] flex-shrink-0">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                <button type="button" className="p-2 text-gray-400 hover:text-white hover:bg-[#2E2E2E] rounded-full">
                                    <PaperclipIcon className="w-5 h-5" />
                                </button>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Pergunte à Fox IA..."
                                    className="flex-1 bg-[#1C1C1C] p-2 px-4 rounded-full border border-transparent focus:border-[#FF6B00] focus:ring-0 text-sm"
                                />
                                <button type="submit" disabled={!input.trim() || isLoading} className="p-2 bg-[#FF6B00] rounded-full text-white disabled:bg-gray-500 disabled:cursor-not-allowed">
                                    <SendIcon className="w-5 h-5" />
                                </button>
                            </form>
                        </footer>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default FoxIAAssistant;