import React, { useState, useMemo } from 'react';
import { useClientesQuery } from '../hooks/useClientesQuery';
import { Cliente } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Filter, Plus, Phone, MessageCircle, MoreVertical,
  Building2, User, ChevronRight, RotateCw, RefreshCw
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NovoClienteSheet } from './NovoClienteSheet';
import { ClientePerfilSheet } from './ClientePerfilSheet';
import { toast } from 'sonner';

export function MobileClientesView() {
  const { clientes, isLoading, refetch, saveCliente, deleteCliente } = useClientesQuery();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ativos' | 'todos' | 'inativos' | 'pj' | 'pf'>('ativos');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sheet states
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [clientePerfil, setClientePerfil] = useState<Cliente | null>(null);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Clientes sincronizados com o servidor!');
    } catch {
      toast.error('Erro ao sincronizar clientes.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredClientes = useMemo(() => {
    const list = clientes.filter((c) => {
      const matchesSearch =
        (c.razaoSocial || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.nomeFantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.documento || '').includes(searchTerm) ||
        (c.codigo || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'ativos' && (c.status === 'Inativo' || c.status === 'inativo')) return false;
      if (activeFilter === 'inativos' && c.status !== 'Inativo' && c.status !== 'inativo') return false;
      if (activeFilter === 'pj' && c.tipo === 'Pessoa Física') return false;
      if (activeFilter === 'pf' && c.tipo !== 'Pessoa Física') return false;

      const estadoUf = (c.endereco?.estado || c.endereco?.uf || '').trim().toUpperCase();
      if (selectedEstado !== 'todos' && estadoUf !== selectedEstado.toUpperCase()) return false;

      return true;
    });

    // Ordenar para garantir que Clientes Ativos sempre fiquem no topo
    return list.sort((a, b) => {
      const aInactive = a.status === 'Inativo' || a.status === 'inativo';
      const bInactive = b.status === 'Inativo' || b.status === 'inativo';
      if (!aInactive && bInactive) return -1;
      if (aInactive && !bInactive) return 1;
      return 0;
    });
  }, [clientes, searchTerm, activeFilter, selectedEstado]);

  const stats = useMemo(() => {
    const total = clientes.length;
    const ativos = clientes.filter((c) => c.status !== 'Inativo' && c.status !== 'inativo').length;
    const inativos = total - ativos;
    return { total, ativos, inativos };
  }, [clientes]);

  const handleToggleStatus = async (cliente: Cliente, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = (cliente.status === 'Inativo' || cliente.status === 'inativo') ? 'Ativo' : 'Inativo';
    try {
      await saveCliente({
        ...cliente,
        status: newStatus,
      });
      if (newStatus === 'Inativo') {
        toast.info(`Cliente "${cliente.nomeFantasia || cliente.razaoSocial}" inativado.`);
      } else {
        toast.success(`Cliente "${cliente.nomeFantasia || cliente.razaoSocial}" reativado!`);
      }
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || 'Falha na operação'}`);
    }
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 pb-24">
      {/* Top Mobile Bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b px-4 py-3 space-y-2.5">
        {/* Campo de Busca, Filtro & Botão Novo */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar razão, fantasia, CNPJ..."
              className="h-9 pl-9 pr-3 text-xs rounded-xl bg-muted/40 border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-[#FF6A00]"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleManualRefresh}
            className="h-9 w-9 rounded-xl shrink-0 border-muted-foreground/20 text-muted-foreground hover:text-foreground"
            aria-label="Sincronizar"
            title="Sincronizar em Tempo Real"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing || isLoading ? 'animate-spin text-orange-500' : ''}`} />
          </Button>

          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl shrink-0 border-muted-foreground/20 text-muted-foreground hover:text-foreground"
                aria-label="Filtrar"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] p-4">
              <SheetHeader className="pb-3 border-b">
                <SheetTitle className="text-base font-bold text-left">Filtros de Clientes</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-muted-foreground block mb-2">Tipo de Cliente</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'todos', label: 'Todos' },
                      { id: 'pj', label: 'Pessoa Jurídica' },
                      { id: 'pf', label: 'Pessoa Física' },
                    ].map((t) => (
                      <Button
                        key={t.id}
                        type="button"
                        variant={activeFilter === t.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter(t.id as any)}
                        className={`text-xs h-8 ${activeFilter === t.id ? 'bg-[#FF6A00] text-white' : ''}`}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-muted-foreground block mb-2">Status da Conta</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={activeFilter === 'ativos' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveFilter('ativos')}
                      className={`text-xs h-8 ${activeFilter === 'ativos' ? 'bg-emerald-600 text-white' : ''}`}
                    >
                      Apenas Ativos
                    </Button>
                    <Button
                      type="button"
                      variant={activeFilter === 'inativos' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveFilter('inativos')}
                      className={`text-xs h-8 ${activeFilter === 'inativos' ? 'bg-slate-700 text-white' : ''}`}
                    >
                      Apenas Inativos
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => setFilterSheetOpen(false)}
                  className="w-full bg-[#FF6A00] hover:bg-orange-600 text-white mt-4 h-10 rounded-xl font-bold"
                >
                  Aplicar Filtros ({filteredClientes.length} resultados)
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            size="sm"
            onClick={() => setNovoClienteOpen(true)}
            className="h-9 px-3 rounded-xl bg-[#FF6A00] hover:bg-orange-600 text-white font-bold text-xs shadow-xs gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo
          </Button>
        </div>

        {/* Category Pills (Horizontal Scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          {[
            { id: 'ativos', label: `Clientes Ativos (${stats.ativos})` },
            { id: 'todos', label: `Todos (${clientes.length})` },
            { id: 'inativos', label: `Inativos (${stats.inativos})` },
            { id: 'pj', label: 'Empresas (PJ)' },
            { id: 'pf', label: 'Pessoa Física' },
          ].map((pill) => {
            const isActive = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActiveFilter(pill.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border shrink-0 ${
                  isActive
                    ? 'bg-orange-500 text-white border-orange-500 font-semibold shadow-xs'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Cards Touch */}
      <div className="p-3 space-y-2.5">
        {filteredClientes.length === 0 ? (
          <div className="bg-card rounded-2xl border p-8 text-center space-y-3 mt-4">
            <User className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
            <div className="font-semibold text-sm text-foreground">Nenhum cliente encontrado</div>
            <p className="text-xs text-muted-foreground">
              Não encontramos clientes com os filtros ou termo pesquisado.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setActiveFilter('todos');
              }}
              className="text-xs"
            >
              Limpar Filtros
            </Button>
          </div>
        ) : (
          filteredClientes.map((c) => {
            const isPF = c.tipo === 'Pessoa Física';
            const isInactive = c.status === 'Inativo' || c.status === 'inativo';
            const nomeExibicao = isPF ? (c.razaoSocial || c.nomeFantasia || 'Cliente') : (c.nomeFantasia || c.razaoSocial || 'Cliente');
            const subNome = isPF ? '' : c.razaoSocial !== c.nomeFantasia ? c.razaoSocial : '';
            const contato = c.contatos?.find((ct) => ct.principal) || c.contatos?.[0];
            const telefone = c.telefone || contato?.telefone || contato?.celular;
            const cleanPhone = getCleanPhone(telefone);

            return (
              <div
                key={c.id}
                onClick={() => {
                  setClientePerfil(c);
                  setPerfilOpen(true);
                }}
                className={`bg-card rounded-2xl border p-3.5 shadow-xs transition-all active:scale-[0.99] cursor-pointer flex flex-col gap-2.5 ${
                  isInactive ? 'opacity-70 border-dashed' : 'border-border/80'
                }`}
              >
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isInactive
                          ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                          : 'bg-[#FFF4EA] dark:bg-orange-950/40 text-[#FF6A00]'
                      }`}
                    >
                      {isPF ? <User className="w-4 h-4 text-[#FF6A00]" /> : <Building2 className="w-4 h-4 text-[#FF6A00]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-foreground truncate leading-snug">
                        {nomeExibicao}
                      </div>
                      {subNome && (
                        <div className="text-[10px] text-muted-foreground truncate">{subNome}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {c.documento || c.codigo || 'Sem doc'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 rounded-md font-semibold ${
                        isInactive
                          ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900 dark:text-slate-400'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}
                    >
                      {isInactive ? 'Inativo' : 'Ativo'}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs w-44">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setClienteParaEditar(c);
                            setNovoClienteOpen(true);
                          }}
                        >
                          Editar Cadastro
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleToggleStatus(c, e)}>
                          {isInactive ? 'Reativar Cliente' : 'Inativar Cliente'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Info Footer & Quick Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-dashed border-border/60 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2 truncate">
                    {c.endereco?.cidade && (
                      <span className="truncate">
                        {c.endereco.cidade}/{c.endereco.uf || 'BR'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {cleanPhone && (
                      <>
                        <a
                          href={`tel:${cleanPhone}`}
                          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          title="Ligar"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/55${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sheets / Modais */}
      <NovoClienteSheet
        open={novoClienteOpen}
        onOpenChange={(op) => {
          setNovoClienteOpen(op);
          if (!op) setClienteParaEditar(null);
        }}
        clienteParaEditar={clienteParaEditar}
      />

      <ClientePerfilSheet
        open={perfilOpen}
        onOpenChange={setPerfilOpen}
        cliente={clientePerfil}
        onEdit={(cli) => {
          setPerfilOpen(false);
          setClienteParaEditar(cli);
          setNovoClienteOpen(true);
        }}
      />
    </div>
  );
}
