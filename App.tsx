import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react'; // v2.0.2 lazy loading
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
import MuralScreen from './screens/MuralScreen';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { setupAutoSync } from './src/utils/onlineSync';
import { requestNotificationPermission } from './src/utils/pushNotifications';
import { LoadingSpinner } from './components/Loading';
import { InstallPWA } from './components/InstallPWA';

// Lazy load larger screens for better initial performance
const TasksScreen = lazy(() => import('./screens/TasksScreen'));
const AdminScreen = lazy(() => import('./screens/AdminScreen'));
const FocusToolsScreen = lazy(() => import('./screens/FocusToolsScreen'));
const GoalsScreen = lazy(() => import('./screens/GoalsScreen'));



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
                const date = new Date();
                const todayStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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
        // Setup robust offline sync
        const cleanupSync = setupAutoSync();

        // Optional: Request push notification permission if user is logged in
        if (currentUser) {
            // We don't want to block or annoy, so maybe just check or log for now?
            // or we can request it:
            // requestNotificationPermission().then(granted => {
            //    if (granted) console.log("Push notifications enabled");
            // });
        }

        return () => {
            // cleanupSync(); // setupAutoSync doesn't actually return a cleanup function in the current implementation, but it should ideally.
            // implementation of setupAutoSync attaches a window listener.
        };
    }, []);

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

    const handleDeleteUser = async (userId: string) => {
        try {
            await api.delete(`/users/${userId}`);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error("Failed to delete user:", error);
            alert("Erro ao excluir usuário.");
        }
    };

    const handleCreateUser = async (userData: Partial<User>) => {
        try {
            // Ensure bio is not undefined if not provided to avoid issues? Backend handles it.
            const res = await api.post('/users', userData);
            setUsers(prev => [...prev, res.data]);
            alert("Usuário criado com sucesso!");
        } catch (error) {
            console.error("Failed to create user:", error);
            // Rethrow so modal can handle it (stay open)
            throw error;
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0E0E0E]">
                <LoadingSpinner size="lg" message="Iniciando Focus Hub..." />
            </div>
        );
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

    // Show loading screen while fetching data
    if (dataLoading && tasks.length === 0 && users.length === 0) {
        return (
            <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center">
                <LoadingSpinner size="lg" message="Carregando dados..." />
            </div>
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
            setTasks,
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
                return <FocusToolsScreen currentUser={currentUser} />;
            case 'admin':
                if (currentUser.role === Role.ADMIN) {
                    return <AdminScreen currentUser={currentUser} users={users} tasks={tasks} checkIns={checkIns} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} onCreateUser={handleCreateUser} />;
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
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                    <LoadingSpinner size="lg" message="Carregando..." />
                </div>
            }>
                {renderScreen()}
            </Suspense>
            <InstallPWA />
        </Layout>
    );
};

export default App;