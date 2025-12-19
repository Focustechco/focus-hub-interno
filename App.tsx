import React, { useState, useEffect } from 'react';
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
import Layout from './components/Layout';
import DashboardScreen from './screens/DashboardScreen';
import CheckInScreen from './screens/CheckInScreen';
import TasksScreen from './screens/TasksScreen';
import MuralScreen from './screens/MuralScreen';
import AdminScreen from './screens/AdminScreen';
import FocusToolsScreen from './screens/FocusToolsScreen';
import GoalsScreen from './screens/GoalsScreen';
import { useOnlineStatus } from './hooks/useOnlineStatus';



const App: React.FC = () => {
    console.log('App Render: Check for infinite loop');
    const { user: currentUser, login, logout, loading: authLoading } = useAuth();
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
    const [dailyChecklistItems, setDailyChecklistItems] = useLocalStorage<DailyChecklistItem[]>('dailyChecklist', []);
    const [taskViewOverride, setTaskViewOverride] = useState<'board' | 'checklist' | 'calendar' | null>(null);

    // Fetch all data in parallel for better performance
    useEffect(() => {
        if (!currentUser) return;

        const fetchAllData = async () => {
            setDataLoading(true);
            setDataError(null);

            try {
                const [tasksRes, checkInsRes, postsRes, goalsRes, usersRes] = await Promise.all([
                    api.get('/tasks').catch(e => ({ data: [], error: e })),
                    api.get('/checkins').catch(e => ({ data: [], error: e })),
                    api.get('/posts').catch(e => ({ data: [], error: e })),
                    api.get('/goals').catch(e => ({ data: [], error: e })),
                    api.get('/users').catch(e => ({ data: [], error: e }))
                ]);

                setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
                setCheckIns(Array.isArray(checkInsRes.data) ? checkInsRes.data : []);
                setPosts(Array.isArray(postsRes.data) ? postsRes.data : []);
                setGoals(Array.isArray(goalsRes.data) ? goalsRes.data : []);
                setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);

                // Check if any request failed
                const errors = [tasksRes, checkInsRes, postsRes, goalsRes, usersRes]
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

    const initialPrefs = users.reduce((acc, user) => {
        acc[user.id] = {
            [NotificationType.TASK_ASSIGNED]: true,
            [NotificationType.TASK_STATUS_CHANGED]: true,
            [NotificationType.NEW_POST]: true,
            [NotificationType.TASK_DUE_SOON]: true,
        };
        return acc;
    }, {} as { [userId: string]: NotificationPreferences });

    const [notifications, setNotifications] = useLocalStorage<Notification[]>('notifications', []);
    const [notificationPreferences, setNotificationPreferences] = useLocalStorage<{ [userId: string]: NotificationPreferences }>('notificationPreferences', initialPrefs);

    // Offline state management
    const isOnline = useOnlineStatus();
    const [offlineActionQueue, setOfflineActionQueue] = useLocalStorage<OfflineAction[]>('offlineActionQueue', []);

    useEffect(() => {
        const syncData = () => {
            if (isOnline && offlineActionQueue && offlineActionQueue.length > 0) {
                console.log(`[Sync] Conexão restaurada. Sincronizando ${offlineActionQueue.length} ações.`);

                // Em uma aplicação real, aqui você enviaria a fila de ações para o servidor.
                // Para esta simulação, vamos apenas "finalizar" as tarefas, removendo o status offline.

                const syncedTasks = tasks.map(task => {
                    if (task.isOffline) {
                        const { isOffline, ...syncedTask } = task; // Remove the isOffline flag
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
            // Optimistic update
            setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));

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

    if (!currentUser) {
        // We need to pass the users list to LoginScreen so the user can still "select" a user to login as
        // But ideally we should change LoginScreen to be a real form.
        // For now, let's inject emails into the users list so handleLogin works
        const usersWithEmails = users.map(u => ({ ...u, email: `${u.id}@focus.co` }));
        return <LoginScreen onLogin={handleLogin} users={usersWithEmails} />;
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