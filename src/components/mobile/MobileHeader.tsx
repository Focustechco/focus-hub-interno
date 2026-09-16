import React, { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { 
  Menu, Bell, ArrowLeft, Search, User, ShieldCheck, Sun, Moon, LogOut, Building2, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useEmpresaConfig } from "@/features/configuracoes/hooks/useEmpresaConfig";
import { useNotificacoesStore } from "@/features/notificacoes/useNotificacoesStore";
import { useSidebar } from "@/components/ui/sidebar";
import { UserProfileModal } from "@/components/UserProfileModal";
import { EmpresaProfileModal } from "@/components/EmpresaProfileModal";
import { NotificationBellDropdown } from "@/features/notificacoes/components/NotificationBellDropdown";

// Mapeamento de rotas para títulos amigáveis no cabeçalho mobile
const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/fluxo-de-caixa": "Fluxo de Caixa",
  "/contas-a-receber": "Contas a Receber",
  "/contas-a-pagar": "Contas a Pagar",
  "/cobrancas": "Cobranças",
  "/conciliacao": "Conciliação",
  "/agenda": "Agenda Financeira",
  "/clientes": "Clientes",
  "/fornecedores": "Fornecedores",
  "/estoque": "Estoque & Patrimônio",
  "/centro-de-custos": "Centro de Custos",
  "/categorias": "Categorias",
  "/projetos": "Projetos",
  "/agenda-de-entregas": "Agenda de Entregas",
  "/desenvolvimento": "Desenvolvimento",
  "/suporte": "Suporte",
  "/produtos": "Produtos",
  "/rh": "Recursos Humanos",
  "/documentos": "Documentos (DMS)",
  "/assinaturas": "Assinaturas Digitais",
  "/relatorios": "Relatórios",
  "/dre": "DRE Gerencial",
  "/indicadores": "Indicadores",
  "/comercial": "Comercial",
  "/crm": "CRM & Pipeline",
  "/customer-success": "Customer Success",
  "/marketing": "Marketing",
  "/usuarios": "Usuários",
  "/permissoes": "Permissões (IAM)",
  "/configuracoes": "Configurações",
  "/integracoes": "Integrações",
  "/fiscal": "Fiscal",
  "/notificacoes": "Notificações",
};

interface MobileHeaderProps {
  onOpenDrawer?: () => void;
  onOpenMenu?: () => void;
  onOpenSearch?: () => void;
}

export function MobileHeader({ onOpenDrawer, onOpenMenu, onOpenSearch }: MobileHeaderProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { empresa } = useEmpresaConfig();
  const { naoLidasCount } = useNotificacoesStore();
  const { setOpenMobile } = useSidebar();

  const handleOpenDrawer = () => {
    if (onOpenMenu) onOpenMenu();
    else if (onOpenDrawer) onOpenDrawer();
    else setOpenMobile(true);
  };

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);

  const isHome = pathname === "/";
  const currentTitle = ROUTE_TITLES[pathname] || "Focus ERP";

  // Saudação Dinâmica por Horário
  const greeting = React.useMemo(() => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return "Bom dia";
    if (hora >= 12 && hora < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const dataHojeFormatada = React.useMemo(() => {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, "0");
    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }, []);

  const primeiroNome = React.useMemo(() => {
    const nomeCompleto = currentUser?.nome || "Adriano";
    return nomeCompleto.split(" ")[0];
  }, [currentUser]);

  const getInitials = (nameStr?: string) => {
    return (nameStr || "AD")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full md:hidden bg-[#FF5000] text-white shadow-md pt-[env(safe-area-inset-top,0px)]">
        <div className="flex h-16 items-center justify-between px-3 sm:px-4">
          {/* LADO ESQUERDO */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {isHome ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenDrawer}
                  className="h-10 w-10 text-white hover:bg-white/20 active:bg-white/30 rounded-xl shrink-0 p-0 -ml-1"
                  aria-label="Abrir Menu de Módulos"
                >
                  <Menu className="h-6 w-6 text-white" />
                </Button>
                <div className="min-w-0 pr-2">
                  <h1 className="text-base sm:text-lg font-normal text-white tracking-tight leading-tight truncate">
                    {greeting},{" "}
                    <span className="font-bold">{primeiroNome}</span>
                  </h1>
                  <p className="text-[11px] text-white/90 font-normal truncate mt-0.5">
                    Painel principal • {dataHojeFormatada}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate({ to: "/" })}
                  className="h-9 w-9 text-white hover:bg-white/20 active:bg-white/30 rounded-xl shrink-0 -ml-1"
                  aria-label="Voltar ao Início"
                >
                  <ArrowLeft className="h-6 w-6 text-white" />
                </Button>
                <h1 className="text-base sm:text-lg font-bold text-white truncate max-w-[220px]">
                  {currentTitle}
                </h1>
              </>
            )}
          </div>

          {/* LADO DIREITO (AÇÕES) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sino de Notificações com Modal/Dropdown */}
            <NotificationBellDropdown
              triggerClassName="h-9 w-9 text-white hover:bg-white/20 active:bg-white/30 rounded-full relative flex items-center justify-center cursor-pointer"
              iconClassName="h-5 w-5 text-white"
              badgeClassName="absolute top-1 right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-white px-0.5 text-[8px] font-extrabold text-[#FF5000] shadow-xs"
            />

            {/* Foto / Perfil da Empresa */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-9 w-9 rounded-full ring-2 ring-white/90 hover:ring-white focus:outline-none transition-all overflow-hidden flex items-center justify-center bg-white cursor-pointer shrink-0 shadow-xs p-0"
                  aria-label="Perfil da Empresa"
                >
                  <Avatar className="h-full w-full rounded-full overflow-hidden bg-white">
                    <AvatarImage src={empresa?.logoUrl} className="object-cover w-full h-full rounded-full" />
                    <AvatarFallback className="text-xs font-bold bg-white text-[#FF5000] w-full h-full flex items-center justify-center">
                      {(empresa?.nomeFantasia || "FC").substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-xl border rounded-2xl animate-in fade-in-50 zoom-in-95 bg-white dark:bg-card">
                <div className="p-3 bg-muted/40 rounded-xl mb-1 flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border shrink-0 bg-white rounded-full overflow-hidden">
                    <AvatarImage src={empresa?.logoUrl} className="object-cover w-full h-full rounded-full" />
                    <AvatarFallback className="text-xs font-bold bg-orange-500/10 text-orange-600 w-full h-full flex items-center justify-center">
                      {(empresa?.nomeFantasia || "FC").substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-foreground truncate block">
                      {empresa?.nomeFantasia || "Focus Tecnologia"}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate block">
                      {empresa?.cnpj || currentUser?.email || "contato@focustecnologia.com.br"}
                    </span>
                    <Badge variant="outline" className="mt-1 text-[9px] py-0 px-1.5 border-orange-500/30 text-orange-600 font-semibold">
                      {currentUser?.nome ? `${currentUser.nome.split(" ")[0]} • ${currentUser?.perfil || "Admin"}` : (currentUser?.perfil || "Administrador")}
                    </Badge>
                  </div>
                </div>

                <DropdownMenuItem 
                  onClick={() => setEmpresaModalOpen(true)}
                  className="cursor-pointer gap-2.5 py-2 text-xs rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/30"
                >
                  <Building2 className="w-4 h-4 text-orange-500" />
                  <span>Dados da Empresa</span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => navigate({ to: "/configuracoes" })}
                  className="cursor-pointer gap-2.5 py-2 text-xs rounded-xl"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span>Configurações</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1.5" />

                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault();
                    toggleTheme();
                  }}
                  className="cursor-pointer flex items-center justify-between py-2 px-3 text-xs rounded-xl bg-muted/40 hover:bg-muted/70 active:bg-muted font-medium transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {isDark ? (
                      <Moon className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="font-semibold text-foreground">
                      {isDark ? "Modo Escuro" : "Modo Claro"}
                    </span>
                  </div>
                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${isDark ? 'bg-orange-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}>
                    <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={logout}
                  className="cursor-pointer gap-2.5 py-2 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-600 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Plataforma</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Modais de Perfil */}
      <UserProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
      <EmpresaProfileModal open={empresaModalOpen} onOpenChange={setEmpresaModalOpen} />
    </>
  );
}
