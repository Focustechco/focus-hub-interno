import focusLogoMobile from "@/assets/focus-logo-mobile.png";
import focusLogoMobileDark from "@/assets/focus-logo-mobile-dark.png";
import focusLogoMobileIos from "@/assets/focus-logo-mobile-ios.png";
import focusLogoMobileIosDark from "@/assets/focus-logo-mobile-ios-dark.png";
import { Link } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { 
  Search, Bell, Command, Moon, Sun, ArrowRight, LayoutDashboard, Wallet, 
  Users, FileText, Briefcase, BarChart3, FolderOpen, Plug, Plus, ChevronDown, 
  TrendingUp, TrendingDown, Receipt, Target, User, Building2, Settings, LogOut, Megaphone 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "@tanstack/react-router";
import { useLocalStorageState } from "@/hooks/useDataStore";
import { Cliente } from "@/features/clientes/types";
import { Contrato } from "@/features/contratos/types";
import { NotificationBellDropdown } from "@/features/notificacoes/components/NotificationBellDropdown";
import { useAuth } from "@/features/auth/AuthContext";
import { UserProfileModal } from "@/components/UserProfileModal";
import { EmpresaProfileModal } from "@/components/EmpresaProfileModal";
import { useEmpresaConfig } from "@/features/configuracoes/hooks/useEmpresaConfig";

// Importação dos Formulários Oficiais dos Módulos
import { NovoRecebimentoSheet } from "@/features/contas-receber/components/NovoRecebimentoSheet";
import { NovaContaSheet } from "@/features/contas-pagar/components/NovaContaSheet";
import { NovoClienteSheet } from "@/features/clientes/components/NovoClienteSheet";
import { NovoContratoSheet } from "@/features/contratos/components/NovoContratoSheet";

interface QuickLink {
  title: string;
  category: string;
  url: string;
  icon: any;
}

// Helper function to check iOS environment
function checkIsIOS(): boolean {
  if (typeof window === "undefined" || !window.navigator) return false;
  const ua = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  return /iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

export function TopBar() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin, logout } = useAuth();
  const { empresa } = useEmpresaConfig();

  const [openSearchModal, setOpenSearchModal] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isIOS, setIsIOS] = useState(false);

  // States controlados para modais/sheets rápidos (evita bug de foco do DropdownMenu)
  const [novoRecebimentoOpen, setNovoRecebimentoOpen] = useState(false);
  const [novoPagamentoOpen, setNovoPagamentoOpen] = useState(false);
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [novoContratoOpen, setNovoContratoOpen] = useState(false);

  useEffect(() => {
    setIsIOS(checkIsIOS());
  }, []);

  const { data: clientes } = useLocalStorageState<Cliente>("focus_clientes");
  const { data: contratos } = useLocalStorageState<Contrato>("focus_contratos");

  // Escutar atalho de teclado Ctrl+K ou Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenSearchModal(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const systemPages: QuickLink[] = [
    { title: "Dashboard Executivo", category: "Módulo", url: "/", icon: LayoutDashboard },
    { title: "Fluxo de Caixa", category: "Módulo", url: "/fluxo-de-caixa", icon: Wallet },
    { title: "Contas a Receber", category: "Módulo", url: "/contas-a-receber", icon: Wallet },
    { title: "Contas a Pagar", category: "Módulo", url: "/contas-a-pagar", icon: Wallet },
    { title: "Clientes", category: "Módulo", url: "/clientes", icon: Users },
    { title: "Contratos", category: "Módulo", url: "/contratos", icon: FileText },
    { title: "Projetos", category: "Módulo", url: "/projetos", icon: Briefcase },
    { title: "Central de Relatórios", category: "Módulo", url: "/relatorios", icon: BarChart3 },
    { title: "Marketing & Growth", category: "Módulo", url: "/marketing", icon: Megaphone },
    { title: "Central de Documentos (DMS)", category: "Módulo", url: "/documentos", icon: FolderOpen },
    { title: "Hub de Integrações", category: "Módulo", url: "/integracoes", icon: Plug },
  ];

  // Resultados dinâmicos da pesquisa seguros
  const safeQuery = (query || "").toLowerCase();
  const filteredPages = systemPages.filter(p => (p.title || "").toLowerCase().includes(safeQuery));
  const filteredClientes = (clientes || []).filter(c => 
    (c?.razaoSocial || "").toLowerCase().includes(safeQuery) || 
    (c?.nomeFantasia || "").toLowerCase().includes(safeQuery) ||
    (c?.codigo || "").toLowerCase().includes(safeQuery) ||
    (c?.documento || "").includes(safeQuery)
  );
  const filteredContratos = (contratos || []).filter(c => 
    (c?.numeroContrato || c?.codigo || c?.nome || "").toLowerCase().includes(safeQuery) || 
    (c?.nome || "").toLowerCase().includes(safeQuery)
  );

  const handleNavigate = (url: string) => {
    setOpenSearchModal(false);
    setQuery("");
    navigate({ to: url as any });
  };

  const getInitials = (nameStr: string) => {
    return (nameStr || 'AD').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Choose appropriate logo based on OS and theme
  const mobileLightLogo = isIOS ? focusLogoMobileIos : focusLogoMobile;
  const mobileDarkLogo = isIOS ? focusLogoMobileIosDark : focusLogoMobileDark;

  return (
    <>
      <header className="sticky top-0 z-40 w-full hidden md:flex flex-col justify-center border-b bg-background/95 backdrop-blur-md px-2.5 sm:px-6 shadow-2xs pt-[env(safe-area-inset-top,0px)] transition-all">
        <div className="flex h-14 w-full items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground h-9 w-9 shrink-0 cursor-pointer" />
            
            {/* LOGO MOBILE FOCUS ERP */}
            <div className="flex md:hidden items-center mr-1 shrink-0">
              <Link to="/" className="flex items-center">
                <img
                  src={mobileLightLogo}
                  alt="Focus ERP"
                  className="h-7 sm:h-8 w-auto max-w-[125px] sm:max-w-[140px] object-contain dark:hidden"
                />
                <img
                  src={mobileDarkLogo}
                  alt="Focus ERP"
                  className="h-7 sm:h-8 w-auto max-w-[125px] sm:max-w-[140px] object-contain hidden dark:block"
                />
              </Link>
            </div>
          </div>
          
          {/* BUSCADOR GLOBAL INTERATIVO */}
          <div 
            onClick={() => setOpenSearchModal(true)}
            className="relative hidden md:block cursor-pointer group"
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors" />
            <Input
              readOnly
              placeholder="Buscar em toda a plataforma (Ctrl+K)..."
              className="h-9 w-[320px] pl-8 pr-16 lg:w-[420px] cursor-pointer bg-muted/40 hover:bg-muted/80 transition-colors text-xs"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex shadow-xs">
              <Command className="h-3 w-3" />K
            </kbd>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <NotificationBellDropdown />

            {/* BOTÃO NOVA TRANSAÇÃO */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="inline-flex items-center gap-1.5 h-8 px-2 sm:px-3 text-xs font-semibold border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-50/50 hover:bg-orange-100/80 dark:bg-orange-950/30 dark:hover:bg-orange-900/50 transition-all rounded-lg shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span className="hidden sm:inline">Nova Transação</span>
                  <ChevronDown className="hidden sm:inline h-3 w-3 opacity-60 ml-0.5 shrink-0" />
                </Button>
              </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72 p-1.5 space-y-1">
              <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                Criar Nova Transação / Lançamento
              </DropdownMenuLabel>
              
              <DropdownMenuItem onClick={() => setNovoRecebimentoOpen(true)} className="cursor-pointer gap-2.5 py-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-foreground">Novo Recebimento (Entrada)</div>
                  <div className="text-[10px] text-muted-foreground">Lança no Contas a Receber e Fluxo de Caixa</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setNovoPagamentoOpen(true)} className="cursor-pointer gap-2.5 py-2 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-foreground">Novo Pagamento (Saída)</div>
                  <div className="text-[10px] text-muted-foreground">Lança no Contas a Pagar e Fluxo de Caixa</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => setNovoClienteOpen(true)} className="cursor-pointer gap-2.5 py-2 rounded-md">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-foreground">Novo Cliente</div>
                  <div className="text-[10px] text-muted-foreground">Cadastra cliente no diretório da empresa</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setNovoContratoOpen(true)} className="cursor-pointer gap-2.5 py-2 rounded-md">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-foreground">Novo Contrato</div>
                  <div className="text-[10px] text-muted-foreground">Registra novo contrato de vendas/serviços</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate({ to: "/fiscal" })} className="cursor-pointer gap-2.5 py-2 rounded-md">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-foreground">Emissão de Nota Fiscal (NFe/NFSe)</div>
                  <div className="text-[10px] text-muted-foreground">Emitir documento fiscal eletrônico</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate({ to: "/crm" })} className="cursor-pointer gap-2.5 py-2 rounded-md">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-foreground">Nova Oportunidade (CRM)</div>
                  <div className="text-[10px] text-muted-foreground">Adicionar negócio no pipeline do ClickUp</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* PERFIL DA EMPRESA NA NAVBAR */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div 
                className="cursor-pointer flex items-center shrink-0 group select-none"
                title="Perfil & Dados Institucionais da Empresa"
              >
                <Avatar className="h-8 w-8 border-2 border-orange-500/30 group-hover:border-orange-500/80 group-hover:ring-2 group-hover:ring-orange-500/20 transition-all overflow-hidden bg-card">
                  <AvatarImage src={empresa?.logoUrl} className="object-contain p-0.5 w-full h-full" />
                  <AvatarFallback className="text-[11px] font-black bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    {(empresa?.nomeFantasia || 'Focus').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-xl border rounded-xl animate-in fade-in-50 zoom-in-95">
              <div className="p-2.5 bg-muted/40 rounded-lg mb-1 flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border bg-card shrink-0">
                  <AvatarImage src={empresa?.logoUrl} className="object-contain p-0.5" />
                  <AvatarFallback className="text-xs font-bold bg-orange-500/10 text-orange-600">
                    {(empresa?.nomeFantasia || 'Focus').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-foreground truncate block">
                      {empresa?.nomeFantasia || 'Focus Tecnologia'}
                    </span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-orange-500/30 text-orange-600 font-semibold shrink-0">
                      Matriz
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate block font-mono">
                    {empresa?.cnpj || '48.912.345/0001-89'}
                  </span>
                </div>
              </div>

              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">
                Gestão da Empresa
              </DropdownMenuLabel>

              <DropdownMenuItem 
                onClick={() => setEmpresaModalOpen(true)}
                className="cursor-pointer gap-2 py-1.5 text-xs rounded-md"
              >
                <Building2 className="w-4 h-4 text-orange-500" />
                <span>Perfil da Empresa</span>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => navigate({ to: '/configuracoes' as any })}
                className="cursor-pointer gap-2 py-1.5 text-xs rounded-md"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Configurações & Dados Fiscais</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">
                Sessão do Usuário
              </DropdownMenuLabel>

              <DropdownMenuItem 
                onClick={() => setProfileModalOpen(true)}
                className="cursor-pointer gap-2 py-1.5 text-xs rounded-md"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 truncate">
                  <span className="block truncate">{currentUser?.nome || 'Minha Conta'}</span>
                  <span className="text-[10px] text-muted-foreground block truncate">{currentUser?.email}</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem 
                onClick={toggleTheme} 
                className="cursor-pointer gap-2 py-1.5 text-xs rounded-md"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
                <span>{isDark ? 'Tema Claro' : 'Tema Escuro'}</span>
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={logout}
                className="cursor-pointer gap-2 py-1.5 text-xs text-rose-600 dark:text-rose-400 focus:text-rose-600 rounded-md"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Plataforma</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </header>

      {/* MODAL DE PERFIL DA EMPRESA */}
      <EmpresaProfileModal
        open={empresaModalOpen}
        onOpenChange={setEmpresaModalOpen}
      />

      {/* MODAL DE EDIÇÃO DE PERFIL DO USUÁRIO */}
      <UserProfileModal 
        open={profileModalOpen} 
        onOpenChange={setProfileModalOpen} 
      />

      {/* MODAL DE BUSCA GLOBAL (COMMAND PALETTE) */}
      <Dialog open={openSearchModal} onOpenChange={setOpenSearchModal}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0 border shadow-2xl">
          <DialogHeader className="p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground ml-1" />
              <Input
                autoFocus
                placeholder="Digite o que deseja buscar (ex: Clientes, Contratos, Relatórios)..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="border-none shadow-none focus-visible:ring-0 text-sm bg-transparent h-9"
              />
            </div>
          </DialogHeader>

          <div className="p-3 max-h-[380px] overflow-y-auto space-y-4 text-xs">
            {/* Seção Módulos da Plataforma */}
            {filteredPages.length > 0 && (
              <div>
                <p className="font-semibold text-muted-foreground mb-2 text-[10px] uppercase tracking-wider">Módulos da Plataforma</p>
                <div className="space-y-1">
                  {filteredPages.map(page => {
                    const IconComponent = page.icon;
                    return (
                      <div
                        key={page.url}
                        onClick={() => handleNavigate(page.url)}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <IconComponent className="w-4 h-4 text-primary" />
                          <span>{page.title}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seção Clientes Cadastrados */}
            {filteredClientes.length > 0 && (
              <div>
                <p className="font-semibold text-muted-foreground mb-2 text-[10px] uppercase tracking-wider">Clientes Cadastrados</p>
                <div className="space-y-1">
                  {filteredClientes.map(cliente => (
                    <div
                      key={cliente.id}
                      onClick={() => handleNavigate('/clientes')}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-foreground">{cliente.razaoSocial || cliente.nomeFantasia}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{cliente.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seção Contratos */}
            {filteredContratos.length > 0 && (
              <div>
                <p className="font-semibold text-muted-foreground mb-2 text-[10px] uppercase tracking-wider">Contratos</p>
                <div className="space-y-1">
                  {filteredContratos.map(contrato => (
                    <div
                      key={contrato.id}
                      onClick={() => handleNavigate('/contratos')}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium text-foreground">{contrato.numeroContrato || contrato.codigo || 'Contrato'} - {contrato.clienteNome || contrato.nome || 'Cliente'}</span>
                      </div>
                      <span className="font-semibold text-emerald-600">R$ {(contrato.valorTotal || 0).toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredPages.length === 0 && filteredClientes.length === 0 && filteredContratos.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">
                Nenhum resultado encontrado para "{query}".
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheets de Ações Rápidas renderizados no nível raiz para liberar foco e digitação */}
      <NovoRecebimentoSheet open={novoRecebimentoOpen} onOpenChange={setNovoRecebimentoOpen} />
      <NovaContaSheet open={novoPagamentoOpen} onOpenChange={setNovoPagamentoOpen} />
      <NovoClienteSheet open={novoClienteOpen} onOpenChange={setNovoClienteOpen} />
      <NovoContratoSheet open={novoContratoOpen} onOpenChange={setNovoContratoOpen} />
    </>
  );
}
