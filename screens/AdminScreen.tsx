import React, { useState, useMemo, useEffect } from 'react';
import { User, Role, Task, CheckIn } from '../types';
import { ShieldIcon, UserIcon, ClipboardIcon, FileTextIcon, SearchIcon, CheckCircle2Icon, XIcon, PlusIcon, Trash2Icon, ArchiveIcon, ArchiveRestoreIcon } from '../components/icons';
import ProfileModal from '../components/ProfileModal';
import api from '../services/api';
import { useToast } from '../components/Toast';
import AdminTopNav, { AdminSection } from '../components/admin/AdminTopNav';
import { Suspense, lazy } from 'react';
import { LoadingSpinner } from '../components/Loading';

// Lazy load admin sub-pages
const AdminDashboard = lazy(() => import('../components/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('../components/admin/AdminUsers'));
const AdminSectors = lazy(() => import('../components/admin/AdminSectors'));
const AdminPermissions = lazy(() => import('../components/admin/AdminPermissions'));
const AdminIntegrations = lazy(() => import('../components/admin/AdminIntegrations'));
const AdminNotifications = lazy(() => import('../components/admin/AdminNotifications'));
const AdminAudit = lazy(() => import('../components/admin/AdminAudit'));
const AdminSecurity = lazy(() => import('../components/admin/AdminSecurity'));
const AdminMonitoring = lazy(() => import('../components/admin/AdminMonitoring'));
const AdminBackup = lazy(() => import('../components/admin/AdminBackup'));

interface AdminScreenProps {
    currentUser: User;
    users: User[];
    tasks: Task[];
    checkIns: CheckIn[];
    onUpdateUser: (user: User) => void;
    onDeleteUser: (userId: string) => void;
    onCreateUser: (user: Partial<User>) => Promise<void>;
}

// Placeholder component for sections not yet implemented
const ComingSoon = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-[#FF6B00]/10 p-6 rounded-full mb-6">
            <svg className="w-12 h-12 text-[#FF6B00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-gray-500 dark:text-[#B3B3B3] max-w-md">
            Esta seção está sendo desenvolvida e estará disponível em breve. 
            Acompanhe as atualizações do sistema.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm text-[#FF6B00] font-medium">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF6B00]"></span>
            </span>
            Em desenvolvimento
        </div>
    </div>
);

const AdminScreen: React.FC<AdminScreenProps> = ({ currentUser, users, tasks, checkIns, onUpdateUser, onDeleteUser, onCreateUser }) => {
    const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

    if (currentUser.role !== Role.ADMIN) {
        return (
            <div className="text-center p-8">
                <h1 className="text-2xl font-bold text-red-500">Acesso Negado</h1>
                <p className="text-gray-400">Você não tem permissão para acessar esta página.</p>
            </div>
        );
    }

    const renderSection = () => {
        switch (activeSection) {
            case 'dashboard':
                return (
                    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
                        <AdminDashboard onNavigate={(section) => setActiveSection(section as AdminSection)} />
                    </Suspense>
                );
            case 'users':
                return (
                    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
                        <AdminUsers 
                            currentUser={currentUser} 
                            users={users} 
                            onUpdateUser={onUpdateUser} 
                            onDeleteUser={onDeleteUser}
                            onCreateUser={onCreateUser}
                        />
                    </Suspense>
                );
            case 'sectors':
                return (
                    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
                        <AdminSectors />
                    </Suspense>
                );
            case 'permissions':
                return (
                    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
                        <AdminPermissions />
                    </Suspense>
                );
            case 'integrations':
                return (
                    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
                        <AdminIntegrations />
                    </Suspense>
                );
            case 'notifications':
                return (
                    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
                        <AdminNotifications />
                    </Suspense>
                );
            case 'audit':
                return (
                    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
                        <AdminAudit />
                    </Suspense>
                );
            case 'security':
                return (
                    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
                        <AdminSecurity />
                    </Suspense>
                );
            case 'monitoring':
                return (
                    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
                        <AdminMonitoring />
                    </Suspense>
                );
            case 'backup':
                return (
                    <Suspense fallback={<div className="flex justify-center py-20"><LoadingSpinner /></div>}>
                        <AdminBackup />
                    </Suspense>
                );
            default:
                return <ComingSoon title="Seção em Desenvolvimento" />;
        }
    };

    return (
        <div className="flex flex-col h-full">
            <AdminTopNav 
                activeSection={activeSection} 
                onSectionChange={setActiveSection} 
            />
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {renderSection()}
            </div>
        </div>
    );
};

export default AdminScreen;