import React from 'react';
import { motion } from 'framer-motion';
import { 
    LayoutDashboard, Users, Building2, Puzzle, Shield, Link2, 
    Calendar, FolderOpen, BarChart3, Target, Bot, Megaphone, 
    Bell, ScrollText, Database, Settings, Palette, Lock, Activity,
    Search, ChevronRight
} from 'lucide-react';

export type AdminSection = 
    | 'dashboard' | 'users' | 'sectors' | 'permissions'
    | 'integrations' | 'agenda' | 'drive' | 'reports' | 'goals'
    | 'automations' | 'notifications' | 'audit'
    | 'backup' | 'security' | 'monitoring';

interface AdminTopNavProps {
    activeSection: AdminSection;
    onSectionChange: (section: AdminSection) => void;
}

const NAV_ITEMS: { id: AdminSection; label: string; icon: React.ElementType; category: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Geral' },
    { id: 'users', label: 'Usuários', icon: Users, category: 'Organização' },
    { id: 'sectors', label: 'Setores', icon: Building2, category: 'Organização' },
    { id: 'permissions', label: 'Permissões', icon: Shield, category: 'Organização' },
    { id: 'integrations', label: 'Integrações', icon: Link2, category: 'Sistema' },
    { id: 'audit', label: 'Auditoria', icon: ScrollText, category: 'Segurança' },
    { id: 'security', label: 'Segurança', icon: Lock, category: 'Segurança' },
    { id: 'monitoring', label: 'Monitoramento', icon: Activity, category: 'Segurança' },
    { id: 'notifications', label: 'Notificações', icon: Bell, category: 'Ferramentas' },
    { id: 'backup', label: 'Backup', icon: Database, category: 'Ferramentas' },
];

export default function AdminTopNav({ activeSection, onSectionChange }: AdminTopNavProps) {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isExpanded, setIsExpanded] = React.useState(false);

    const filteredItems = searchTerm.trim()
        ? NAV_ITEMS.filter(item => 
            item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : NAV_ITEMS;

    // Group by category
    const categories = [...new Set(filteredItems.map(i => i.category))];

    return (
        <div className="mb-6">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] p-2.5 rounded-xl shadow-lg shadow-[#FF6B00]/20">
                        <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Centro Administrativo</h1>
                        <p className="text-sm text-gray-500 dark:text-[#B3B3B3]">Gerencie toda a plataforma Focus Hub</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#B3B3B3]" />
                    <input
                        type="text"
                        placeholder="Pesquisar seção..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-gray-100 dark:bg-[#1C1C1C] rounded-lg py-2 pl-9 pr-4 w-56 focus:w-72 transition-all focus:ring-1 focus:ring-[#FF6B00] border border-gray-200 dark:border-[#2E2E2E] text-gray-900 dark:text-white text-sm outline-none"
                    />
                </div>
            </div>

            {/* Navigation Tabs - Scrollable on mobile */}
            <div className="relative">
                <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                    {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <motion.button
                                key={item.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onSectionChange(item.id)}
                                className={`
                                    flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0
                                    ${isActive 
                                        ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/25' 
                                        : 'bg-gray-100 dark:bg-[#1C1C1C] text-gray-600 dark:text-[#B3B3B3] hover:bg-gray-200 dark:hover:bg-[#2E2E2E] hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#2E2E2E]'
                                    }
                                `}
                            >
                                <Icon className="w-4 h-4" />
                                {item.label}
                            </motion.button>
                        );
                    })}
                </div>
                {/* Fade edges for scroll indication */}
                <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-white dark:from-[#0E0E0E] to-transparent pointer-events-none" />
            </div>
        </div>
    );
}
