import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CheckSquare,
  Target,
  Calendar,
  Bell,
  HardDrive,
  Shield,
  Activity,
  Server,
  Database,
  Wifi,
  BarChart3,
  TrendingUp,
  Building2,
  FileText,
  MessageSquare,
  Globe,
} from 'lucide-react';
import api from '../../services/api';
import { LoadingSpinner } from '../Loading';

// ─── Types ────────────────────────────────────────────────────────

interface DashboardData {
  users: {
    total: number;
    active: number;
    archived: number;
    admins: number;
    regular: number;
    collaborators: number;
  };
  sectors: {
    total: number;
    list: string[];
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
  };
  goals: {
    total: number;
    active: number;
  };
  posts: {
    total: number;
  };
  notifications: {
    unread: number;
  };
  agenda: {
    upcomingEvents: number;
  };
  integrations: {
    google: boolean;
    drivePermissions: boolean;
  };
  charts: {
    usersBySector: { sector: string; count: number }[];
    tasksBySector: { sector: string; count: number }[];
  };
  audit: {
    totalLogs: number;
  };
  system: {
    uptime: number;
    nodeVersion: string;
    memoryUsage: number;
    timestamp: string;
  };
}

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  subtitle?: string;
  color: string;
  section: string;
  onClick: (section: string) => void;
  index: number;
}

interface AdminDashboardProps {
  onNavigate: (section: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function formatMemory(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
}

// ─── Palette ──────────────────────────────────────────────────────

const COLORS = {
  orange: { bg: 'rgba(255,107,0,0.15)', ring: '#FF6B00' },
  emerald: { bg: 'rgba(16,185,129,0.15)', ring: '#10B981' },
  sky: { bg: 'rgba(56,189,248,0.15)', ring: '#38BDF8' },
  violet: { bg: 'rgba(139,92,246,0.15)', ring: '#8B5CF6' },
  rose: { bg: 'rgba(244,63,94,0.15)', ring: '#F43F5E' },
  amber: { bg: 'rgba(245,158,11,0.15)', ring: '#F59E0B' },
  cyan: { bg: 'rgba(6,182,212,0.15)', ring: '#06B6D4' },
  lime: { bg: 'rgba(132,204,22,0.15)', ring: '#84CC16' },
} as const;

type ColorKey = keyof typeof COLORS;

// ─── Animations ───────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 22,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 200, damping: 20 },
  },
};

// ─── StatCard Component ───────────────────────────────────────────

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  value,
  label,
  subtitle,
  color,
  section,
  onClick,
}) => {
  const palette = COLORS[color as ColorKey] ?? COLORS.orange;

  return (
    <motion.button
      variants={cardVariants}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(section)}
      className="relative group w-full text-left rounded-2xl border border-[#2E2E2E]
                 bg-[#1C1C1C] dark:bg-[#1C1C1C] p-5 overflow-hidden
                 transition-shadow duration-300
                 hover:shadow-[0_0_32px_-8px_rgba(255,107,0,0.25)]
                 hover:border-[#FF6B00]/40
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
    >
      {/* Gradient accent top-line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0
                    group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, ${palette.ring}, transparent)`,
        }}
      />

      {/* Subtle radial glow behind icon */}
      <div
        className="absolute -top-6 -left-6 w-28 h-28 rounded-full blur-3xl
                    opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
        style={{ background: palette.ring }}
      />

      <div className="relative flex items-start gap-4">
        {/* Icon circle */}
        <div
          className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl
                      transition-transform duration-300 group-hover:scale-110"
          style={{ background: palette.bg }}
        >
          <Icon className="w-6 h-6" style={{ color: palette.ring }} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-white leading-tight tracking-tight">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          <p className="text-sm text-[#B3B3B3] mt-0.5 truncate">{label}</p>
          {subtitle && (
            <p className="text-xs text-[#666] mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#10B981]" />
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
};

// ─── Section Header ───────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  color: string;
}> = ({ icon: Icon, title, color }) => {
  const palette = COLORS[color as ColorKey] ?? COLORS.orange;
  return (
    <motion.div
      variants={sectionVariants}
      className="flex items-center gap-3 mb-5"
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg"
        style={{ background: palette.bg }}
      >
        <Icon className="w-5 h-5" style={{ color: palette.ring }} />
      </div>
      <h2 className="text-lg font-semibold text-white tracking-tight">
        {title}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-[#2E2E2E] to-transparent" />
    </motion.div>
  );
};

// ─── Bar Chart ────────────────────────────────────────────────────

const BarChart: React.FC<{
  data: { sector: string; count: number }[];
}> = ({ data }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <motion.div
      variants={cardVariants}
      className="rounded-2xl border border-[#2E2E2E] bg-[#1C1C1C] p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-[#FF6B00]" />
        <h3 className="text-base font-semibold text-white">
          Usuários por Setor
        </h3>
      </div>

      <div className="space-y-3">
        {data.map((item, i) => {
          const pct = (item.count / maxCount) * 100;
          const hue = (i * 47 + 20) % 360;
          const barColor =
            i === 0
              ? '#FF6B00'
              : `hsl(${hue}, 70%, 55%)`;

          return (
            <motion.div
              key={item.sector}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[#B3B3B3] truncate max-w-[60%]">
                  {item.sector}
                </span>
                <span className="text-sm font-semibold text-white tabular-nums">
                  {item.count}
                </span>
              </div>
              <div className="w-full h-3 bg-[#2E2E2E] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full relative"
                  style={{
                    background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.4 + i * 0.08,
                    ease: 'easeOut',
                  }}
                >
                  {/* Shine */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {data.length === 0 && (
        <p className="text-sm text-[#666] text-center py-6">
          Nenhum dado disponível
        </p>
      )}
    </motion.div>
  );
};

// ─── System Health Panel ──────────────────────────────────────────

const SystemHealthPanel: React.FC<{
  system: DashboardData['system'];
  integrations: DashboardData['integrations'];
  audit: DashboardData['audit'];
}> = ({ system, integrations, audit }) => {
  const items = [
    {
      icon: Activity,
      label: 'Uptime',
      value: formatUptime(system.uptime),
      color: '#10B981',
    },
    {
      icon: Server,
      label: 'Node.js',
      value: system.nodeVersion,
      color: '#38BDF8',
    },
    {
      icon: Database,
      label: 'Memória',
      value: formatMemory(system.memoryUsage),
      color: '#8B5CF6',
    },
    {
      icon: Globe,
      label: 'Google',
      value: integrations.google ? 'Conectado' : 'Desconectado',
      color: integrations.google ? '#10B981' : '#F43F5E',
    },
    {
      icon: HardDrive,
      label: 'Drive',
      value: integrations.drivePermissions ? 'Ativo' : 'Inativo',
      color: integrations.drivePermissions ? '#10B981' : '#F59E0B',
    },
    {
      icon: Shield,
      label: 'Logs de Auditoria',
      value: formatNumber(audit.totalLogs),
      color: '#FF6B00',
    },
  ];

  return (
    <motion.div
      variants={cardVariants}
      className="rounded-2xl border border-[#2E2E2E] bg-[#1C1C1C] p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <Wifi className="w-5 h-5 text-[#10B981]" />
        <h3 className="text-base font-semibold text-white">
          Saúde do Sistema
        </h3>
        <div className="ml-auto flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]" />
          </span>
          <span className="text-xs text-[#10B981] font-medium">Online</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.07 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#0E0E0E]/60 border border-[#2E2E2E]/50
                        hover:border-[#2E2E2E] transition-colors"
          >
            <item.icon
              className="w-5 h-5 flex-shrink-0"
              style={{ color: item.color }}
            />
            <div className="min-w-0">
              <p className="text-xs text-[#666] truncate">{item.label}</p>
              <p className="text-sm font-semibold text-white truncate">
                {item.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Timestamp */}
      <p className="text-xs text-[#555] mt-4 text-right">
        Última atualização:{' '}
        {new Date(system.timestamp).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </motion.div>
  );
};

// ─── Skeleton Loader ──────────────────────────────────────────────

const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#0E0E0E] p-6 lg:p-8">
    <div className="max-w-7xl mx-auto">
      {/* Title skeleton */}
      <div className="mb-8">
        <div className="h-8 w-64 bg-[#1C1C1C] rounded-lg animate-pulse" />
        <div className="h-4 w-96 bg-[#1C1C1C] rounded mt-2 animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] animate-pulse"
          />
        ))}
      </div>

      {/* Bottom sections skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] animate-pulse" />
        <div className="h-72 bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] animate-pulse" />
      </div>
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/dashboard');
      setData(response.data);
    } catch (err: any) {
      console.error('[AdminDashboard] Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar painel administrativo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Loading state ──
  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  // ── Error state ──
  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1C1C1C] border border-[#2E2E2E] rounded-2xl p-8 max-w-md text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(244,63,94,0.15)] flex items-center justify-center">
            <Wifi className="w-8 h-8 text-[#F43F5E]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Erro ao carregar
          </h2>
          <p className="text-[#B3B3B3] text-sm mb-6">{error}</p>
          <button
            onClick={fetchDashboard}
            className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#FF8C33] text-white text-sm
                       font-semibold rounded-xl transition-colors focus:outline-none
                       focus-visible:ring-2 focus-visible:ring-[#FF6B00] focus-visible:ring-offset-2
                       focus-visible:ring-offset-[#1C1C1C]"
          >
            Tentar novamente
          </button>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  // ── Compute derived values ──
  const taskCompletionRate =
    data.tasks.total > 0
      ? Math.round((data.tasks.completed / data.tasks.total) * 100)
      : 0;

  // ── Card definitions ──
  const userCards: StatCardProps[] = [
    {
      icon: Users,
      value: data.users.total,
      label: 'Total de Usuários',
      subtitle: `${data.users.active} ativos`,
      color: 'orange',
      section: 'users',
      onClick: onNavigate,
      index: 0,
    },
    {
      icon: Shield,
      value: data.users.admins,
      label: 'Administradores',
      subtitle: `${data.users.regular} regulares`,
      color: 'violet',
      section: 'users',
      onClick: onNavigate,
      index: 1,
    },
    {
      icon: Building2,
      value: data.sectors.total,
      label: 'Setores',
      subtitle: `${data.charts.usersBySector.length} com usuários`,
      color: 'sky',
      section: 'sectors',
      onClick: onNavigate,
      index: 2,
    },
    {
      icon: MessageSquare,
      value: data.posts.total,
      label: 'Publicações',
      color: 'cyan',
      section: 'posts',
      onClick: onNavigate,
      index: 3,
    },
  ];

  const productivityCards: StatCardProps[] = [
    {
      icon: CheckSquare,
      value: data.tasks.total,
      label: 'Total de Tarefas',
      subtitle: `${taskCompletionRate}% concluídas`,
      color: 'emerald',
      section: 'tasks',
      onClick: onNavigate,
      index: 4,
    },
    {
      icon: Target,
      value: data.goals.active,
      label: 'Metas Ativas',
      subtitle: `${data.goals.total} total`,
      color: 'amber',
      section: 'goals',
      onClick: onNavigate,
      index: 5,
    },
    {
      icon: Calendar,
      value: data.agenda.upcomingEvents,
      label: 'Próximos Eventos',
      color: 'sky',
      section: 'agenda',
      onClick: onNavigate,
      index: 6,
    },
    {
      icon: Bell,
      value: data.notifications.unread,
      label: 'Notificações Pendentes',
      color: 'rose',
      section: 'notifications',
      onClick: onNavigate,
      index: 7,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0E0E0E] dark:bg-[#0E0E0E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Painel Administrativo
              </h1>
              <p className="text-[#B3B3B3] text-sm mt-1">
                Visão geral em tempo real do Focus Hub
              </p>
            </div>

            {/* Refresh button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchDashboard}
              disabled={loading}
              className="self-start sm:self-auto flex items-center gap-2 px-4 py-2
                         bg-[#1C1C1C] border border-[#2E2E2E] rounded-xl text-sm text-[#B3B3B3]
                         hover:text-white hover:border-[#FF6B00]/40 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Activity
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              {loading ? 'Atualizando...' : 'Atualizar'}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Section: Usuários ── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <SectionHeader icon={Users} title="Usuários" color="orange" />
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {userCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </motion.div>
        </motion.section>

        {/* ── Section: Produtividade ── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <SectionHeader
            icon={TrendingUp}
            title="Produtividade"
            color="emerald"
          />
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {productivityCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </motion.div>
        </motion.section>

        {/* ── Section: Charts + System ── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <SectionHeader icon={Server} title="Sistema" color="sky" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart – Users by Sector */}
            <BarChart data={data.charts.usersBySector} />

            {/* System Health */}
            <SystemHealthPanel
              system={data.system}
              integrations={data.integrations}
              audit={data.audit}
            />
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default AdminDashboard;
