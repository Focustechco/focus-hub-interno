import React from "react";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { 
  LayoutDashboard, Wallet, TrendingUp, TrendingDown, Bell, Landmark, CalendarDays,
  Users, Truck, Package, Building2, Tags, Briefcase, Code2, Headphones, Boxes, Cog,
  Heart, UserCog, Megaphone, FolderOpen, FileCheck2, BarChart3, LineChart, PieChart,
  Shield, Plug, Settings, ChevronRight, LogOut, Receipt
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useEmpresaConfig } from "@/features/configuracoes/hooks/useEmpresaConfig";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MobileDrawerMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODULE_SECTIONS = [
  {
    title: "Visão Geral",
    items: [
      { name: "Dashboard Executivo", path: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "Financeiro & Contábil",
    items: [
      { name: "Fluxo de Caixa", path: "/fluxo-de-caixa", icon: Wallet },
      { name: "Contas a Receber", path: "/contas-a-receber", icon: TrendingUp },
      { name: "Contas a Pagar", path: "/contas-a-pagar", icon: TrendingDown },
      { name: "Agenda Financeira", path: "/agenda", icon: CalendarDays },
      { name: "Cobranças", path: "/cobrancas", icon: Bell },
      { name: "Conciliação Bancária", path: "/conciliacao", icon: Landmark },
      { name: "DRE Gerencial", path: "/dre", icon: LineChart },
      { name: "Fiscal & NFe/NFSe", path: "/fiscal", icon: Receipt },
    ],
  },
  {
    title: "Comercial & Vendas",
    items: [
      { name: "Clientes", path: "/clientes", icon: Users },
      { name: "CRM Pipeline", path: "/crm", icon: TrendingUp },
      { name: "Contratos & Recorrência", path: "/contratos", icon: FileCheck2 },
      { name: "Comercial OS", path: "/comercial", icon: Megaphone },
      { name: "Marketing & Growth", path: "/marketing", icon: Megaphone },
    ],
  },
  {
    title: "Operação & Projetos",
    items: [
      { name: "Projetos & Sprints", path: "/projetos", icon: Briefcase },
      { name: "Produtos Focus", path: "/produtos", icon: Cog },
      { name: "Desenvolvimento", path: "/desenvolvimento", icon: Code2 },
      { name: "Agenda de Entregas", path: "/agenda-de-entregas", icon: CalendarDays },
      { name: "Estoque & Patrimônio", path: "/estoque", icon: Package },
      { name: "Fornecedores", path: "/fornecedores", icon: Truck },
      { name: "Suporte ( central)", path: "/suporte", icon: Headphones },
    ],
  },
  {
    title: "Pessoas & Documentos",
    items: [
      { name: "Recursos Humanos (RH)", path: "/rh", icon: UserCog },
      { name: "Central de Documentos", path: "/documentos", icon: FolderOpen },
      { name: "Assinaturas Digitais", path: "/assinaturas", icon: FileCheck2 },
      { name: "Customer Success", path: "/customer-success", icon: Heart },
    ],
  },
  {
    title: "Administração & Estratégia",
    items: [
      { name: "Central de Relatórios", path: "/relatorios", icon: BarChart3 },
      { name: "Indicadores & KPIs", path: "/indicadores", icon: PieChart },
      { name: "Centro de Custos", path: "/centro-de-custos", icon: Building2 },
      { name: "Categorias", path: "/categorias", icon: Tags },
      { name: "Usuários", path: "/usuarios", icon: Users },
      { name: "Permissões", path: "/permissoes", icon: Shield },
      { name: "Integrações (API Hub)", path: "/integracoes", icon: Plug },
      { name: "Configurações", path: "/configuracoes", icon: Settings },
    ],
  },
];

export function MobileDrawerMenu({ open, onOpenChange }: MobileDrawerMenuProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { currentUser, canAccessRoute, logout } = useAuth();
  const { empresa } = useEmpresaConfig();

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate({ to: path as any });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-slate-200/80 dark:border-zinc-800 shadow-2xl">
        {/* Linha superior fina laranja */}
        <div className="h-1 w-full bg-[#FF6A00]" />

        {/* Topo do Menu com Identidade Focus */}
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shrink-0">
              <AvatarImage src={empresa?.logoUrl} className="object-contain p-0.5" />
              <AvatarFallback className="text-xs font-bold text-[#FF6A00] bg-[#FFF4EA] dark:bg-orange-950/40">
                {(empresa?.nomeFantasia || "FC").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                  {empresa?.nomeFantasia || "Focus ERP"}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 block truncate font-medium">
                Módulos do Sistema
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Módulos Categorizada (Todos com ícones Laranja Focus) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {MODULE_SECTIONS.map((section) => {
            const accessibleItems = section.items.filter((item) => canAccessRoute(item.path));
            if (accessibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 px-2.5 mb-1">
                  {section.title}
                </h3>
                <div className="space-y-0.5">
                  {accessibleItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigate(item.path)}
                        className={cn(
                          "flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer",
                          isActive
                            ? "bg-[#FF6A00] text-white font-bold shadow-xs"
                            : "text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
                            isActive ? "bg-white/20 text-white" : "bg-[#FFF4EA] dark:bg-orange-950/40 text-[#FF6A00]"
                          )}>
                            <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-[#FF6A00]")} />
                          </div>
                          <span className="truncate">{item.name}</span>
                        </div>
                        <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 ml-2", isActive ? "text-white" : "text-slate-400")} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé com Informação do Usuário */}
        <div className="p-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={currentUser?.foto} />
              <AvatarFallback className="text-[10px] font-bold bg-[#FFF4EA] text-[#FF6A00]">
                {(currentUser?.nome || "AD").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.nome || "Usuário"}</p>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">{currentUser?.perfil || "Acesso Ativo"}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
