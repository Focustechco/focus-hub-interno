import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Notification, User, Screen, NotificationPreferences, NotificationType } from '../types';
import { BellIcon, SettingsIcon, CheckIcon, XIcon, ClipboardIcon, NewspaperIcon, CalendarIcon } from './icons';
import pushNotifications from '../src/utils/pushNotifications';
import api from '../services/api';

interface NotificationBellProps {
    currentUser: User;
    notifications: Notification[];
    setNotifications: (notifications: Notification[] | ((prev: Notification[]) => Notification[])) => void;
    setActiveScreen: (screen: Screen) => void;
    notificationPreferences: { [userId: string]: NotificationPreferences };
    setNotificationPreferences: (prefs: any | ((prev: any) => any)) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ currentUser, notifications, setNotifications, setActiveScreen, notificationPreferences, setNotificationPreferences }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'list' | 'settings'>('list');
    const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
    const [pushEnabled, setPushEnabled] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (pushNotifications.isPushSupported()) {
            setPushPermission(pushNotifications.getNotificationPermission());
            setPushEnabled(pushNotifications.isPushEnabled());
        }
    }, []);

    const handleEnablePush = async () => {
        setIsSubscribing(true);
        try {
            const success = await pushNotifications.subscribeToPush();
            if (success) {
                setPushPermission('granted');
                setPushEnabled(true);
                pushNotifications.showNotification('🔔 Notificações ativadas!', {
                    body: 'Você receberá alertas do Focus Hub mesmo com o app fechado.',
                    tag: 'push-enabled',
                });
            } else {
                setPushPermission(pushNotifications.getNotificationPermission());
            }
        } catch (error) {
            console.error('[NotificationBell] Failed to enable push:', error);
        } finally {
            setIsSubscribing(false);
        }
    };

    const handleDisablePush = async () => {
        setIsSubscribing(true);
        try {
            await pushNotifications.unsubscribeFromPush();
            setPushEnabled(false);
        } catch (error) {
            console.error('[NotificationBell] Failed to disable push:', error);
        } finally {
            setIsSubscribing(false);
        }
    };

    const userNotifications = useMemo(() => 
        notifications.filter(n => n.userId === currentUser.id && !n.isRead)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    , [notifications, currentUser.id]);
    
    const unreadCount = useMemo(() => userNotifications.filter(n => !n.isRead).length, [userNotifications]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (isOpen) {
            setView('list'); // Reset to list view when closing
        }
    };
    
    const handleNotificationClick = async (notification: Notification) => {
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
        setActiveScreen(notification.linkTo);
        setIsOpen(false);
        try {
            await api.put(`/notifications/${notification.id}/read`);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, isRead: true } : n));
        try {
            await api.put('/notifications/mark-all-read', { userId: currentUser.id });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const handlePrefChange = (type: NotificationType, value: boolean) => {
        setNotificationPreferences((prev: { [x: string]: any; }) => ({
            ...prev,
            [currentUser.id]: {
                ...prev[currentUser.id],
                [type]: value,
            }
        }));
    };

    const getIconForType = (type: NotificationType) => {
        switch(type) {
            case NotificationType.TASK_ASSIGNED:
            case NotificationType.TASK_STATUS_CHANGED:
                return <ClipboardIcon className="w-5 h-5 text-[#FF6B00]" />;
            case NotificationType.NEW_POST:
                return <NewspaperIcon className="w-5 h-5 text-blue-400" />;
            case NotificationType.TASK_DUE_SOON:
                return <CalendarIcon className="w-5 h-5 text-yellow-400" />;
            default:
                return <BellIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    const userPrefs = notificationPreferences[currentUser.id] || {
        [NotificationType.TASK_ASSIGNED]: true,
        [NotificationType.TASK_STATUS_CHANGED]: true,
        [NotificationType.NEW_POST]: true,
        [NotificationType.TASK_DUE_SOON]: true,
    };

    const isPushSupported = pushNotifications.isPushSupported();
    
    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={handleToggle} className="relative p-2 rounded-full bg-[#1C1C1C] hover:bg-[#2E2E2E] text-white">
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold" style={{fontSize: '0.6rem'}}>
                        {unreadCount}
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#1C1C1C] border border-[#2E2E2E] rounded-lg shadow-xl z-20 overflow-hidden">
                    <div className="p-3 flex justify-between items-center border-b border-[#2E2E2E]">
                        <h3 className="font-bold text-lg">{view === 'list' ? 'Notificações' : 'Preferências'}</h3>
                        <button onClick={() => setView(view === 'list' ? 'settings' : 'list')} className="p-1.5 rounded-full hover:bg-[#3a3a3a]">
                            {view === 'list' ? <SettingsIcon className="w-5 h-5" /> : <XIcon className="w-5 h-5" />}
                        </button>
                    </div>

                    {view === 'list' ? (
                        <>
                            <div className="max-h-[300px] overflow-y-auto">
                            {/* Push notification banner */}
                            {isPushSupported && !pushEnabled && pushPermission !== 'denied' && (
                                <div className="p-3 bg-[#FF6B00]/10 border-b border-[#FF6B00]/20 flex flex-col items-center text-center">
                                    <p className="text-xs text-gray-300 mb-2">
                                        Ative as notificações para receber alertas mesmo com o app fechado!
                                    </p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEnablePush(); }}
                                        disabled={isSubscribing}
                                        className="text-xs font-medium text-white bg-[#FF6B00] hover:bg-[#E66000] px-3 py-1.5 rounded transition-colors w-full disabled:opacity-50"
                                    >
                                        {isSubscribing ? 'Ativando...' : '🔔 Ativar Notificações Push'}
                                    </button>
                                </div>
                            )}
                            {isPushSupported && pushEnabled && (
                                <div className="p-2 bg-green-500/10 border-b border-green-500/20 flex items-center justify-center gap-2">
                                    <span className="text-xs text-green-400 font-medium">✅ Notificações Push ativas</span>
                                </div>
                            )}
                            {isPushSupported && pushPermission === 'denied' && (
                                <div className="p-2 bg-red-500/10 border-b border-red-500/20 flex items-center justify-center">
                                    <span className="text-xs text-red-400">⚠️ Notificações bloqueadas no navegador</span>
                                </div>
                            )}
                                {userNotifications.length > 0 ? (
                                    userNotifications.map(n => (
                                        <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-3 flex items-start gap-3 cursor-pointer hover:bg-[#2E2E2E] ${!n.isRead ? 'bg-[#FF6B00]/10' : ''}`}>
                                            <div className="mt-1">{getIconForType(n.type)}</div>
                                            <div>
                                                <p className="text-sm text-white">{n.message}</p>
                                                <p className="text-xs text-[#B3B3B3] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                            </div>
                                            {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#FF6B00] mt-2 flex-shrink-0"></div>}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-[#B3B3B3] py-8">Nenhuma notificação.</p>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <div className="p-2 border-t border-[#2E2E2E]">
                                    <button onClick={handleMarkAllAsRead} className="w-full text-center text-sm py-1.5 text-[#FF6B00] hover:underline">
                                        Marcar todas como lidas
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-4 space-y-4">
                            {/* Push notification toggle */}
                            {isPushSupported && (
                                <div className="pb-4 border-b border-[#2E2E2E]">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-semibold">Notificações Push</label>
                                        <button
                                            onClick={pushEnabled ? handleDisablePush : handleEnablePush}
                                            disabled={isSubscribing || pushPermission === 'denied'}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pushEnabled ? 'bg-[#FF6B00]' : 'bg-[#2E2E2E]'} ${isSubscribing ? 'opacity-50' : ''}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pushEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-[#B3B3B3]">
                                        {pushEnabled
                                            ? 'Você receberá notificações na tela de bloqueio do seu dispositivo.'
                                            : pushPermission === 'denied'
                                                ? 'Notificações foram bloqueadas. Altere nas configurações do navegador.'
                                                : 'Receba alertas mesmo com o app fechado.'}
                                    </p>
                                </div>
                            )}

                            {/* Notification type preferences */}
                            <div className="flex justify-between items-center">
                                <label htmlFor="task-assigned" className="text-sm">Nova tarefa atribuída</label>
                                <input type="checkbox" id="task-assigned" checked={userPrefs[NotificationType.TASK_ASSIGNED]} onChange={e => handlePrefChange(NotificationType.TASK_ASSIGNED, e.target.checked)} className="h-4 w-4 rounded bg-[#2E2E2E] border-gray-600 text-[#FF6B00] focus:ring-[#FF8C33]" />
                            </div>
                            <div className="flex justify-between items-center">
                                <label htmlFor="task-status" className="text-sm">Status de tarefa alterado</label>
                                <input type="checkbox" id="task-status" checked={userPrefs[NotificationType.TASK_STATUS_CHANGED]} onChange={e => handlePrefChange(NotificationType.TASK_STATUS_CHANGED, e.target.checked)} className="h-4 w-4 rounded bg-[#2E2E2E] border-gray-600 text-[#FF6B00] focus:ring-[#FF8C33]" />
                            </div>
                            <div className="flex justify-between items-center">
                                <label htmlFor="new-post" className="text-sm">Novo post no mural</label>
                                <input type="checkbox" id="new-post" checked={userPrefs[NotificationType.NEW_POST]} onChange={e => handlePrefChange(NotificationType.NEW_POST, e.target.checked)} className="h-4 w-4 rounded bg-[#2E2E2E] border-gray-600 text-[#FF6B00] focus:ring-[#FF8C33]" />
                            </div>
                             <div className="flex justify-between items-center">
                                <label htmlFor="task-due" className="text-sm">Prazo de tarefa próximo</label>
                                <input type="checkbox" id="task-due" checked={userPrefs[NotificationType.TASK_DUE_SOON]} onChange={e => handlePrefChange(NotificationType.TASK_DUE_SOON, e.target.checked)} className="h-4 w-4 rounded bg-[#2E2E2E] border-gray-600 text-[#FF6B00] focus:ring-[#FF8C33]" />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;