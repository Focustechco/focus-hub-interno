import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useAuth } from './hooks/useAuth';
import api from './services/api';
import {
    User,
    Screen,
    Role,
    Task,
    CheckIn,
    Post,
    Notification,
    NotificationPreferences,
    NotificationType,
    Goal,
    Sector,
    DailyChecklistItem,
    OfflineAction,
} from './types';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import Layout from './components/Layout';
import DashboardScreen from './screens/DashboardScreen';
import CheckInScreen from './screens/CheckInScreen';
import TasksScreen from './screens/TasksScreen';
import MuralScreen from './screens/MuralScreen';
import AdminScreen from './screens/AdminScreen';
import FocusToolsScreen from './screens/FocusToolsScreen';
import GoalsScreen from './screens/GoalsScreen';
import { useOnlineStatus } from './hooks/useOnlineStatus';



// Force deploy: 2024-12-24 v4 - fix infinite loop
const App: React.FC = () => {
    const { user: currentUser, login, logout, loading: authLoading, updateUser } = useAuth();
    const [activeScreen, setActiveScreen] = useLocalStorage<Screen>('activeScreen', 'dashboard');

    // Temporary: Keep using local storage for data until we implement full backend sync
    // We will replace these one by one in subsequent steps
    const [tasks, setTasks] = useState<Task[]>([]);
    const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [dataError, setDataError] = useState<string | null>(null);
    const [dailyChecklistItems, setDailyChecklistItems] = useState<DailyChecklistItem[]>([]);
    const [taskViewOverride, setTaskViewOverride] = useState<'board' | 'checklist' | 'calendar' | null>(null);

    // State for forgot password screen
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    // Fetch all data in parallel for better performance
    useEffect(() => {
        if (!currentUser) return;

        const fetchAllData = async () => {
            setDataLoading(true);
            setDataError(null);

            try {
                const todayStr = new Date().toISOString().split('T')[0];
                const [tasksRes, checkInsRes, postsRes, goalsRes, usersRes, checklistRes, notificationsRes] = await Promise.all([
                    api.get('/tasks').catch(e => ({ data: [], error: e })),
                    api.get('/checkins').catch(e => ({ data: [], error: e })),
                    api.get('/posts').catch(e => ({ data: [], error: e })),
                    api.get('/goals').catch(e => ({ data: [], error: e })),
                    api.get('/users').catch(e => ({ data: [], error: e })),
                    api.get(`/daily-checklist?userId=${currentUser.id}&date=${todayStr}`).catch(e => ({ data: [], error: e })),
                    api.get(`/notifications?userId=${currentUser.id}`).catch(e => ({ data: [], error: e }))
                ]);

                setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
                setCheckIns(Array.isArray(checkInsRes.data) ? checkInsRes.data : []);
                setPosts(Array.isArray(postsRes.data) ? postsRes.data : []);
                setGoals(Array.isArray(goalsRes.data) ? goalsRes.data : []);
                setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
                setDailyChecklistItems(Array.isArray(checklistRes.data) ? checklistRes.data : []);
                setNotifications(Array.isArray(notificationsRes.data) ? notificationsRes.data : []);

                // Check if any request failed
                const errors = [tasksRes, checkInsRes, postsRes, goalsRes, usersRes, checklistRes, notificationsRes]
                    .filter((res: any) => res.error);
                if (errors.length > 0) {
                    console.error('Some data failed to load:', errors);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setDataError('Falha ao carregar dados. Verifique a conexão.');
            } finally {
                setDataLoading(false);
            }
        };

        fetchAllData();
    }, [currentUser]);

    // Notification preferences derived from users

    const initialPrefs = useMemo(() => users.reduce((acc, user) => {
        acc[user.id] = {
            [NotificationType.TASK_ASSIGNED]: true,
            [NotificationType.TASK_STATUS_CHANGED]: true,
            [NotificationType.NEW_POST]: true,
            [NotificationType.TASK_DUE_SOON]: true,
        };
        return acc;
    }, {} as { [userId: string]: NotificationPreferences }), [users]);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notificationPreferences, setNotificationPreferences] = useLocalStorage<{ [userId: string]: NotificationPreferences }>('notificationPreferences', initialPrefs);

    // Polling for new notifications every 30 seconds
    useEffect(() => {
        if (!currentUser) return;

        const pollNotifications = async () => {
            try {
                const res = await api.get(`/notifications?userId=${currentUser.id}`);
                if (Array.isArray(res.data)) {
                    setNotifications(res.data);
                }
            } catch (err) {
                console.error('Failed to poll notifications:', err);
            }
        };

        const intervalId = setInterval(pollNotifications, 30000);
        return () => clearInterval(intervalId);
    }, [currentUser]);

    // Offline state management
    const isOnline = useOnlineStatus();
    const [offlineActionQueue, setOfflineActionQueue] = useLocalStorage<OfflineAction[]>('offlineActionQueue', []);

    useEffect(() => {
        const syncData = async () => {
            if (isOnline && offlineActionQueue && offlineActionQueue.length > 0) {
                console.log(`[Sync] Conexão restaurada. Sincronizando ${offlineActionQueue.length} ações.`);

                // Coletar IDs de tarefas deletadas offline
                const deletedTaskIds = offlineActionQueue
                    .filter(action => action.type === 'DELETE_TASK')
                    .map(action => action.payload);

                // Processar a fila de ações offline
                for (const action of offlineActionQueue) {
                    try {
                        if (action.type === 'DELETE_TASK') {
                            await api.delete(`/tasks/${action.payload}`);
                            console.log(`[Sync] Tarefa ${action.payload} deletada no servidor.`);
                        } else if (action.type === 'UPDATE_TASK') {
                            await api.put(`/tasks/${action.payload.id}`, action.payload);
                            console.log(`[Sync] Tarefa ${action.payload.id} atualizada no servidor.`);
                        } else if (action.type === 'CREATE_TASK') {
                            await api.post('/tasks', action.payload);
                            console.log(`[Sync] Tarefa criada no servidor.`);
                        }
                    } catch (err) {
                        console.error(`[Sync] Erro ao sincronizar ação:`, action, err);
                    }
                }

                // Atualizar tasks locais removendo as deletadas e o flag isOffline
                const syncedTasks = tasks
                    .filter(task => !deletedTaskIds.includes(task.id))
                    .map(task => {
                        if (task.isOffline) {
                            const { isOffline, ...syncedTask } = task;
                            return syncedTask;
                        }
                        return task;
                    });

                setTasks(syncedTasks);
                setOfflineActionQueue([]); // Limpa a fila
                console.log("[Sync] Sincronização concluída.");
            }
        };

        const timer = setTimeout(syncData, 3000);

        return () => clearTimeout(timer);
    }, [isOnline, offlineActionQueue, setOfflineActionQueue, tasks, setTasks]);

    const handleLogin = async (user: User) => {
        // This is now handled by useAuth, but LoginScreen passes a user object.
        // We need to update LoginScreen to pass email/password, or adapt here.
        // For now, let's assume LoginScreen will be updated or we use a temporary adapter.
        // Since LoginScreen in this codebase is a mock that selects a user from a list,
        // we might need to change LoginScreen to a real form.

        // TEMPORARY: Map the mock user selection to a real login call
        // In a real app, LoginScreen would have email/password inputs.
        // Here we'll just try to login with the selected user's email (assuming default password)
        try {
            // We need to know the email of the selected user.
            // The MOCK_USERS in App.tsx didn't have emails, but the seeded DB users do.
            // Let's assume a default password for now or just set the user directly if we want to skip auth for a sec?
            // No, we want to test auth.

            // Let's just call login with a hardcoded password for now since we seeded with no password (or handled it in backend)
            await login(user.email || `${user.id}@focus.co`, 'password'); // Assuming email generation if missing
            setActiveScreen('dashboard');
        } catch (error) {
            console.error("Login failed", error);
            alert("Login failed. Check console.");
        }
    };

    const handleLogout = () => {
        logout();
        setActiveScreen('dashboard'); // Reset screen on logout
    };

    const handleUpdateUser = async (updatedUser: User) => {
        try {
            // Optimistic update for users list
            setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));

            // Update current user in auth context if editing own profile
            updateUser(updatedUser);

            await api.put(`/users/${updatedUser.id}`, updatedUser);
        } catch (error) {
            console.error("Failed to update user:", error);
            alert("Erro ao atualizar usuário.");
            // Revert would go here
        }
    };

    if (authLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Carregando...</div>;
    }

    // Check for reset-password token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    const isResetPasswordPage = window.location.pathname.includes('reset-password') || resetToken;

    if (!currentUser) {
        // Show reset password screen if token is present
        if (isResetPasswordPage && resetToken) {
            return (
                <ResetPasswordScreen
                    token={resetToken}
                    onBackToLogin={() => {
                        // Clear URL and reload
                        window.history.replaceState({}, document.title, '/');
                        window.location.reload();
                    }}
                />
            );
        }

        // Show forgot password screen
        if (showForgotPassword) {
            return (
                <ForgotPasswordScreen
                    onBackToLogin={() => setShowForgotPassword(false)}
                />
            );
        }

        // Show login screen
        const usersWithEmails = users.map(u => ({ ...u, email: `${u.id}@focus.co` }));
        return (
            <LoginScreen
                onLogin={handleLogin}
                users={usersWithEmails}
                onForgotPassword={() => setShowForgotPassword(true)}
            />
        );
    }

    const renderScreen = () => {
        const dashboardProps = {
            currentUser,
            tasks,
            checkIns,
            posts,
            users,
            setActiveScreen,
            dailyChecklistItems,
            setDailyChecklistItems,
            setTaskViewOverride,
        };

        switch (activeScreen) {
            case 'dashboard':
                return <DashboardScreen {...dashboardProps} />;
            case 'check-in':
                return <CheckInScreen currentUser={currentUser} checkIns={checkIns} setCheckIns={setCheckIns} users={users} />;
            case 'tasks':
                return <TasksScreen currentUser={currentUser} tasks={tasks} users={users} goals={goals} setTasks={setTasks} setNotifications={setNotifications} notificationPreferences={notificationPreferences} dailyChecklistItems={dailyChecklistItems} setDailyChecklistItems={setDailyChecklistItems} taskViewOverride={taskViewOverride} setTaskViewOverride={setTaskViewOverride} isOnline={isOnline} setOfflineActionQueue={setOfflineActionQueue} />;
            case 'mural':
                if (currentUser.role === Role.COLLABORATOR) return <DashboardScreen {...dashboardProps} />;
                return <MuralScreen currentUser={currentUser} posts={posts} users={users} setPosts={setPosts} setNotifications={setNotifications} notificationPreferences={notificationPreferences} />;
            case 'goals':
                if (currentUser.role === Role.COLLABORATOR) return <DashboardScreen {...dashboardProps} />;
                return <GoalsScreen goals={goals} users={users} setGoals={setGoals} />;
            case 'focus-tools':
                if (currentUser.role === Role.COLLABORATOR) return <DashboardScreen {...dashboardProps} />;
                return <FocusToolsScreen />;
            case 'admin':
                if (currentUser.role === Role.ADMIN) {
                    return <AdminScreen currentUser={currentUser} users={users} tasks={tasks} checkIns={checkIns} onUpdateUser={handleUpdateUser} />;
                }
                // Fallback for non-admin trying to access admin screen
                return <DashboardScreen {...dashboardProps} />;
            default:
                return <DashboardScreen {...dashboardProps} />;
        }
    };

    return (
        <Layout
            currentUser={currentUser}
            onLogout={handleLogout}
            activeScreen={activeScreen}
            setActiveScreen={setActiveScreen}
            notifications={notifications}
            setNotifications={setNotifications}
            notificationPreferences={notificationPreferences}
            setNotificationPreferences={setNotificationPreferences}
            tasks={tasks}
            users={users}
            posts={posts}
            onUpdateUser={handleUpdateUser}
            isOnline={isOnline}
        >
            {renderScreen()}
        </Layout>
    );
};

export default App;