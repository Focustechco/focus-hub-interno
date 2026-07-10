import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Role, Notification, Screen, NotificationPreferences, Task, NotificationType, Post } from '../types';
import { HomeIcon, CheckSquareIcon, ClipboardIcon, NewspaperIcon, TargetIcon, SettingsIcon, LogOutIcon, ShieldIcon, UserIcon, TrendingUpIcon, SearchIcon, XIcon, MenuIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from './icons';
import NotificationBell from './NotificationBell';
import ProfileModal from './ProfileModal';
import FoxIAAssistant from './FoxIAAssistant';
import OfflineIndicator from './OfflineIndicator';
import { ThemeToggle } from './ThemeToggle';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface LayoutProps {
    children: React.ReactNode;
    currentUser: User;
    onLogout: () => void;
    activeScreen: Screen;
    setActiveScreen: (screen: Screen) => void;
    notifications: Notification[];
    setNotifications: (notifications: Notification[] | ((prev: Notification[]) => Notification[])) => void;
    notificationPreferences: { [userId: string]: NotificationPreferences };
    setNotificationPreferences: (prefs: any | ((prev: any) => any)) => void;
    tasks: Task[];
    users: User[];
    posts: Post[];
    onUpdateUser: (user: User) => void;
    isOnline: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, currentUser, onLogout, activeScreen, setActiveScreen, notifications, setNotifications, notificationPreferences, setNotificationPreferences, tasks, users, posts, onUpdateUser, isOnline }) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileModalTargetUser, setProfileModalTargetUser] = useState<User | null>(null);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('sidebarCollapsed', false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


    const openProfileModalFor = (user: User) => {
        setProfileModalTargetUser(user);
        setIsProfileModalOpen(true);
    };

    const handleSelectUserFromSearch = (user: User) => {
        setIsSearchOpen(false);
        openProfileModalFor(user);
    };

    useEffect(() => {
        const checkDueDates = () => {
            const now = new Date();
            const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const userPrefs = notificationPreferences[currentUser.id] || {};

            if (!userPrefs[NotificationType.TASK_DUE_SOON]) {
                return;
            }

            const upcomingTasks = tasks.filter(task => {
                if (!task.dueDate || task.status === 'concluida' || task.assigneeId !== currentUser.id) {
                    return false;
                }
                const dueDate = new Date(task.dueDate);
                return dueDate > now && dueDate <= twentyFourHoursFromNow;
            });

            const newNotifications: Notification[] = [];

            upcomingTasks.forEach(task => {
                const notificationExists = notifications?.some(n =>
                    n.type === NotificationType.TASK_DUE_SOON && n.taskId === task.id
                );

                if (!notificationExists) {
                    newNotifications.push({
                        id: `n-due-${task.id}-${Date.now()}`,
                        userId: currentUser.id,
                        type: NotificationType.TASK_DUE_SOON,
                        message: `A tarefa '${task.title}' vence em menos de 24 horas.`,
                        linkTo: 'tasks',
                        isRead: false,
                        createdAt: new Date().toISOString(),
                        taskId: task.id,
                    });
                }
            });

            if (newNotifications && newNotifications.length > 0) {
                setNotifications(prev => [...prev, ...newNotifications]);
            }
        };

        checkDueDates();
        const intervalId = setInterval(checkDueDates, 60 * 60 * 1000);

        return () => clearInterval(intervalId);

    }, [tasks, currentUser.id, notifications, notificationPreferences, setNotifications]);


    const allNavItems = [
        { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, roles: [Role.ADMIN, Role.USER, Role.COLLABORATOR] },
        { id: 'check-in', label: 'Registro de Ponto', icon: CheckSquareIcon, roles: [Role.ADMIN, Role.USER, Role.COLLABORATOR] },
        { id: 'tasks', label: 'Tarefas', icon: ClipboardIcon, roles: [Role.ADMIN, Role.USER, Role.COLLABORATOR] },
        { id: 'agenda', label: 'Agenda', icon: CalendarIcon, roles: [Role.ADMIN, Role.USER, Role.COLLABORATOR] },
        { id: 'mural', label: 'Mural da Equipe', icon: NewspaperIcon, roles: [Role.ADMIN, Role.USER] },
        { id: 'focus-tools', label: 'Ferramentas de Foco', icon: TargetIcon, roles: [Role.ADMIN, Role.USER] },
        { id: 'admin', label: 'Admin', icon: SettingsIcon, roles: [Role.ADMIN] },
    ];

    const navItems = allNavItems.filter(item => item.roles.includes(currentUser.role));

    const NavLink: React.FC<{ screen: Screen, label: string, Icon: React.ElementType, isCollapsed: boolean }> = ({ screen, label, Icon, isCollapsed }) => {
        const isActive = activeScreen === screen;
        return (
            <button
                onClick={() => {
                    setActiveScreen(screen);
                    setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-[#FF6B00] text-white' : 'text-[#B3B3B3] hover:bg-[#2E2E2E] hover:text-white'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? label : undefined}
            >
                <Icon className="w-6 h-6 flex-shrink-0" />
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="font-semibold overflow-hidden whitespace-nowrap"
                        >
                            {label}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>
        );
    };

    const BottomNavLink: React.FC<{ screen: Screen, label: string, Icon: React.ElementType }> = ({ screen, label, Icon }) => {
        const isActive = activeScreen === screen;
        return (
            <button
                onClick={() => setActiveScreen(screen)}
                className={`flex flex-col items-center justify-center flex-1 p-2 ${isActive ? 'text-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}
            >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-[10px] leading-tight truncate w-full text-center">{label}</span>
            </button>
        );
    };

    return (
        <div className="h-[100dvh] w-full bg-[#0E0E0E] text-white flex overflow-hidden">
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-30 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </AnimatePresence>

            <aside className={`fixed inset-y-0 left-0 bg-[#1C1C1C] p-4 hidden md:flex flex-col z-40 transform transition-all duration-300 ease-in-out
                ${isSidebarCollapsed ? 'w-20' : 'w-64'}
            `}>
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#FF6B00] text-white rounded-full items-center justify-center z-50 hover:scale-110 transition-transform"
                >
                    {isSidebarCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
                </button>

                <div className={`text-2xl font-bold text-center mb-8 py-2 transition-all duration-200 ${isSidebarCollapsed ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}>
                    <span className="text-white">Focus</span><span className="text-[#FF6B00]">Hub</span>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map(item => (
                        <NavLink key={item.id} screen={item.id as Screen} label={item.label} Icon={item.icon} isCollapsed={isSidebarCollapsed} />
                    ))}
                </nav>
                <div className="mt-auto">
                    <div className="border-t border-[#2E2E2E] pt-4">
                        <button onClick={() => openProfileModalFor(currentUser)} className={`flex items-center p-2 rounded-lg w-full text-left hover:bg-[#2E2E2E] transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                            <img src={currentUser.avatarUrl} alt={currentUser.name} className={`w-10 h-10 rounded-full flex-shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
                            <AnimatePresence>
                                {!isSidebarCollapsed && (
                                    <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden whitespace-nowrap">
                                        <p className="font-semibold">{currentUser.name}</p>
                                        <p className="text-sm text-[#B3B3B3] flex items-center">
                                            {currentUser.role === Role.ADMIN ? <ShieldIcon className="w-4 h-4 mr-1" /> : <UserIcon className="w-4 h-4 mr-1" />}
                                            {currentUser.role}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                        <button
                            onClick={onLogout}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 text-[#B3B3B3] hover:bg-red-600/20 hover:text-red-400 mt-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                            title={isSidebarCollapsed ? 'Sair' : undefined}
                        >
                            <LogOutIcon className="w-6 h-6 flex-shrink-0" />
                            <AnimatePresence>
                                {!isSidebarCollapsed && (
                                    <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="font-semibold overflow-hidden whitespace-nowrap">
                                        Sair
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </aside>
            <main className={`flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 md:p-8 md:pb-8 relative transition-all duration-300 ease-in-out overflow-y-auto custom-scrollbar
                md:${isSidebarCollapsed ? 'ml-20' : 'ml-64'}
            `}>
                <header className="flex items-center justify-between md:justify-end mb-6">
                    <div className="md:hidden text-xl font-bold">
                        <span className="text-white">Focus</span><span className="text-[#FF6B00]">Hub</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="relative p-2 rounded-full bg-[#1C1C1C] hover:bg-[#2E2E2E] text-white"
                            aria-label="Pesquisa Global"
                        >
                            <SearchIcon className="w-6 h-6" />
                        </button>
                        <NotificationBell
                            currentUser={currentUser}
                            notifications={notifications}
                            setNotifications={setNotifications}
                            setActiveScreen={setActiveScreen}
                            notificationPreferences={notificationPreferences}
                            setNotificationPreferences={setNotificationPreferences}
                        />
                    </div>
                </header>
                {children}
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1C1C1C] border-t border-[#2E2E2E] flex justify-between items-end pb-[env(safe-area-inset-bottom)] px-1 z-50">
                <div className="flex w-full justify-between overflow-x-auto custom-scrollbar no-scrollbar py-2">
                    {navItems.map(item => (
                        <BottomNavLink key={item.id} screen={item.id as Screen} label={item.label} Icon={item.icon} />
                    ))}
                    <button
                        onClick={() => openProfileModalFor(currentUser)}
                        className="flex flex-col items-center justify-center flex-1 p-2 text-[#B3B3B3] hover:text-white"
                    >
                        <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-6 h-6 rounded-full mb-1" />
                        <span className="text-[10px] leading-tight truncate w-full text-center">Perfil</span>
                    </button>
                </div>
            </nav>
            {profileModalTargetUser && (
                <ProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    userToEdit={profileModalTargetUser}
                    onSave={onUpdateUser}
                    currentUserRole={currentUser.role}
                />
            )}
            <GlobalSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                tasks={tasks}
                posts={posts}
                users={users}
                setActiveScreen={setActiveScreen}
                onSelectUser={handleSelectUserFromSearch}
            />
            <FoxIAAssistant />
            <OfflineIndicator isOnline={isOnline} />
        </div>
    );
};

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    posts: Post[];
    users: User[];
    setActiveScreen: (screen: Screen) => void;
    onSelectUser: (user: User) => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, tasks, posts, users, setActiveScreen, onSelectUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) {
            return { tasks: [], posts: [], users: [] };
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const filteredTasks = tasks.filter(task =>
            task.title.toLowerCase().includes(lowerCaseSearchTerm) ||
            task.description.toLowerCase().includes(lowerCaseSearchTerm)
        ).slice(0, 5);

        const filteredPosts = posts.filter(post =>
            post.content.toLowerCase().includes(lowerCaseSearchTerm)
        ).slice(0, 5);

        const filteredUsers = users.filter(user =>
            user.name.toLowerCase().includes(lowerCaseSearchTerm)
        ).slice(0, 5);

        return { tasks: filteredTasks, posts: filteredPosts, users: filteredUsers };
    }, [searchTerm, tasks, posts, users]);

    const hasResults = (searchResults.tasks?.length || 0) > 0 || (searchResults.posts?.length || 0) > 0 || (searchResults.users?.length || 0) > 0;

    const handleTaskClick = () => {
        setActiveScreen('tasks');
        onClose();
    };

    const handlePostClick = () => {
        setActiveScreen('mural');
        onClose();
    };

    const handleUserClick = (user: User) => {
        onSelectUser(user);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 flex justify-center items-start z-[100] pt-[15vh]"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: -20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: -20, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="bg-[#1C1C1C] rounded-2xl shadow-2xl w-full max-w-2xl relative flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 flex items-center border-b border-[#2E2E2E]">
                            <SearchIcon className="w-5 h-5 text-[#B3B3B3] mr-3" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Pesquisar em Tarefas, Mural, Usuários..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-transparent text-white text-lg placeholder:text-[#B3B3B3] focus:ring-0 border-none p-0"
                            />
                            <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-[#2E2E2E] hover:text-white">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-[60vh] custom-scrollbar">
                            {searchTerm.trim() ? (
                                hasResults ? (
                                    <div className="p-4 space-y-4">
                                        {(searchResults.tasks || []).length > 0 && (
                                            <section>
                                                <h3 className="text-xs font-bold text-[#B3B3B3] uppercase px-2 mb-2">Tarefas</h3>
                                                <ul className="space-y-1">
                                                    {searchResults.tasks.map(task => (
                                                        <li key={task.id} onClick={handleTaskClick} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2E2E2E] cursor-pointer">
                                                            <ClipboardIcon className="w-5 h-5 text-[#B3B3B3] flex-shrink-0" />
                                                            <span className="text-white truncate">{task.title}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}
                                        {(searchResults.posts || []).length > 0 && (
                                            <section>
                                                <h3 className="text-xs font-bold text-[#B3B3B3] uppercase px-2 mb-2">Mural</h3>
                                                <ul className="space-y-1">
                                                    {searchResults.posts.map(post => (
                                                        <li key={post.id} onClick={handlePostClick} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2E2E2E] cursor-pointer">
                                                            <NewspaperIcon className="w-5 h-5 text-[#B3B3B3] flex-shrink-0" />
                                                            <span className="text-white truncate italic">"{post.content}"</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}
                                        {(searchResults.users || []).length > 0 && (
                                            <section>
                                                <h3 className="text-xs font-bold text-[#B3B3B3] uppercase px-2 mb-2">Usuários</h3>
                                                <ul className="space-y-1">
                                                    {searchResults.users.map(user => (
                                                        <li key={user.id} onClick={() => handleUserClick(user)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2E2E2E] cursor-pointer">
                                                            <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full flex-shrink-0" />
                                                            <span className="text-white truncate">{user.name}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-center text-[#B3B3B3] p-16">Nenhum resultado encontrado para "{searchTerm}".</p>
                                )
                            ) : (
                                <p className="text-center text-[#B3B3B3] p-16">Comece a digitar para pesquisar.</p>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Layout;