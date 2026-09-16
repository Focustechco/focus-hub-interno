import React, { useState, useMemo } from 'react';
import { useClientesQuery } from '../hooks/useClientesQuery';
import { Cliente } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Filter, Download, Plus, MoreHorizontal, User, 
  Building2, Eye, Edit3, LayoutGrid, List, MapPin, Mail, Phone,
  UserX, UserCheck, PowerOff, CheckCircle2, RotateCcw, Trash2
} from 'lucide-react';
import { NovoClienteSheet } from './NovoClienteSheet';
import { ClientePerfilSheet } from './ClientePerfilSheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { MobileClientesView } from './MobileClientesView';
import { formatContactName } from '@/services/clienteService';

export function ClientesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const { clientes, isLoading, saveCliente, deleteCliente } = useClientesQuery();

  // Estados para o Modal Lateral (Sheet) de Perfil Read-Only
  const [clientePerfil, setClientePerfil] = useState<Cliente | null>(null);
  const [perfilOpen, setPerfilOpen] = useState(false);

  // Estados para Criação e Edição de Cliente (controlados no topo)
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);

  const filteredData = useMemo(() => {
    return clientes.filter(c => 
      (c.razaoSocial || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.nomeFantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.documento || '').includes(searchTerm) ||
      (c.codigo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientes, searchTerm]);

  // Separação em Clientes Ativos e Clientes Inativos
  const { ativos, inativos } = useMemo(() => {
    const act: Cliente[] = [];
    const inact: Cliente[] = [];
    filteredData.forEach(c => {
      if (c.status === 'Inativo' || c.status === 'inativo') {
        inact.push(c);
      } else {
        act.push(c);
      }
    });
    return { ativos: act, inativos: inact };
  }, [filteredData]);

  // Alternar status Ativo / Inativo
  const handleToggleStatus = async (cliente: Cliente, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = cliente.status === 'Inativo' ? 'Ativo' : 'Inativo';
    try {
      await saveCliente({
        ...cliente,
        status: newStatus,
      });
      if (newStatus === 'Inativo') {
        toast.info(`Cliente "${cliente.nomeFantasia || cliente.razaoSocial}" inativado e movido para a lista de Inativos.`);
      } else {
        toast.success(`Cliente "${cliente.nomeFantasia || cliente.razaoSocial}" reativado com sucesso!`);
      }
    } catch (err: any) {
      toast.error(`Erro ao alterar status do cliente: ${err?.message || 'Falha na operação'}`);
    }
  };

  const renderClientCard = (cliente: Cliente, isInactiveSection = false) => {
    const isPF = cliente.tipo === 'Pessoa Física';
    const contatoPrincipal = cliente.contatos?.find(c => c.principal) || cliente.contatos?.[0];
    const nomeExibicao = isPF ? (cliente.razaoSocial || cliente.nomeFantasia || 'Cliente') : (cliente.nomeFantasia || cliente.razaoSocial || 'Cliente');
    const isInactive = cliente.status === 'Inativo' || isInactiveSection;

    return (
      <Card 
        key={cliente.id} 
        className={`border rounded-xl transition-all group flex flex-col justify-between overflow-hidden bg-card ${
          isInactive
            ? 'opacity-85 hover:opacity-100 border-slate-300 dark:border-slate-800 hover:border-slate-400'
            : isPF 
            ? 'hover:border-amber-500/50 hover:shadow-md border-amber-500/20' 
            : 'hover:border-blue-500/50 hover:shadow-md border-blue-500/20'
        }`}
      >
        <CardHeader className={`p-4 pb-3 border-b ${
          isInactive
            ? 'bg-slate-500/5 dark:bg-slate-900/40'
            : isPF 
            ? 'bg-amber-500/5 dark:bg-amber-950/20' 
            : 'bg-blue-500/5 dark:bg-blue-950/20'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                isInactive
                  ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                  : isPF 
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
              }`}>
                {isPF ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h3 
                  onClick={() => { setClientePerfil(cliente); setPerfilOpen(true); }}
                  className="font-bold text-sm text-foreground truncate hover:text-primary cursor-pointer transition-colors"
                  title={nomeExibicao}
                >
                  {nomeExibicao}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {isPF ? (cliente.segmento || 'Pessoa Física / Individual') : (cliente.segmento ? `${cliente.segmento} • PJ` : cliente.razaoSocial)}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge 
                variant={isInactive ? 'secondary' : 'default'} 
                onClick={(e) => handleToggleStatus(cliente, e)}
                className={`text-[10px] cursor-pointer transition-transform hover:scale-105 ${
                  isInactive 
                    ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-300' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
                title={isInactive ? 'Clique para reativar cliente' : 'Clique para inativar cliente'}
              >
                {isInactive ? 'Inativo' : 'Ativo'}
              </Badge>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${isPF ? 'border-amber-500/40 text-amber-600 dark:text-amber-400' : 'border-blue-500/40 text-blue-600 dark:text-blue-400'}`}>
                {isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-2.5 text-xs flex-1">
          <div className="flex items-center justify-between py-1 border-b border-dashed">
            <span className="text-muted-foreground">{isPF ? 'ID / Código:' : 'Código Corporativo:'}</span>
            <span className="font-mono font-semibold text-primary">{cliente.codigo || '-'}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-dashed">
            <span className="text-muted-foreground">{isPF ? 'CPF:' : 'CNPJ:'}</span>
            <span className="font-mono font-semibold text-foreground">{cliente.documento || '-'}</span>
          </div>

          {isPF ? (
            /* DETALHES DE PESSOA FÍSICA NO CARD */
            <div className="space-y-1.5 py-1 border-b border-dashed">
              {contatoPrincipal?.celular && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> WhatsApp:
                  </span>
                  <span className="font-medium text-foreground">{contatoPrincipal.celular}</span>
                </div>
              )}
              {contatoPrincipal?.email && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" /> E-mail:
                  </span>
                  <span className="font-medium text-foreground truncate max-w-[170px]">{contatoPrincipal.email}</span>
                </div>
              )}
              {cliente.dataFundacaoNascimento && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Nascimento:</span>
                  <span>{new Date(cliente.dataFundacaoNascimento).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          ) : (
            /* DETALHES DE PESSOA JURÍDICA NO CARD */
            contatoPrincipal && (
              <div className="space-y-1 py-1 border-b border-dashed">
                <span className="text-muted-foreground block text-[11px]">Interlocutor Principal:</span>
                <div className="flex items-center gap-1.5 text-foreground font-medium truncate">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{formatContactName(contatoPrincipal.nome, contatoPrincipal.email, cliente.nomeFantasia || cliente.razaoSocial)} {contatoPrincipal.cargo ? `(${contatoPrincipal.cargo})` : ''}</span>
                </div>
                {contatoPrincipal.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] truncate">
                    <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{contatoPrincipal.email}</span>
                  </div>
                )}
                {contatoPrincipal.celular && (
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] truncate">
                    <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span>{contatoPrincipal.celular}</span>
                  </div>
                )}
              </div>
            )
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> Localidade:
            </span>
            <span className="text-foreground font-medium truncate max-w-[170px]">
              {cliente.endereco?.cidade ? `${cliente.endereco.cidade}${cliente.endereco.estado ? ` - ${cliente.endereco.estado}` : ''}` : '-'}
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-3 border-t bg-muted/10 flex items-center justify-between gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { setClientePerfil(cliente); setPerfilOpen(true); }}
            className="w-full text-xs h-8 gap-1.5 font-medium hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver Perfil
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs w-48">
              <DropdownMenuItem 
                className="cursor-pointer font-medium"
                onSelect={(e) => {
                  e.preventDefault();
                  setClientePerfil(cliente);
                  setPerfilOpen(true);
                }}
              >
                <Eye className="w-4 h-4 mr-2 text-primary" />
                Ver Perfil Completo
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => setClienteParaEditar(cliente)}
              >
                <Edit3 className="w-4 h-4 mr-2 text-slate-500" />
                Editar Cadastro
              </DropdownMenuItem>

              <Link to="/contas-a-receber">
                <DropdownMenuItem className="cursor-pointer">Ver Financeiro</DropdownMenuItem>
              </Link>

              <DropdownMenuSeparator />

              {/* Botão de Inativar / Reativar Cliente */}
              {isInactive ? (
                <DropdownMenuItem
                  className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30 cursor-pointer font-medium"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleToggleStatus(cliente);
                  }}
                >
                  <UserCheck className="w-4 h-4 mr-2 text-emerald-600" />
                  Reativar Cliente
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-amber-600 focus:text-amber-600 focus:bg-amber-50 dark:focus:bg-amber-950/30 cursor-pointer font-medium"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleToggleStatus(cliente);
                  }}
                >
                  <UserX className="w-4 h-4 mr-2 text-amber-600" />
                  Inativar Cliente
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                className="text-red-600 cursor-pointer focus:bg-red-500/10 focus:text-red-600"
                onSelect={async (e) => {
                  e.preventDefault();
                  if (window.confirm(`Tem certeza que deseja excluir o cliente "${cliente.nomeFantasia || cliente.razaoSocial}"?`)) {
                    try {
                      await deleteCliente(cliente.id);
                    } catch (err) {
                      console.error('Erro ao excluir cliente:', err);
                    }
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
    );
  };

  const renderClientRow = (cliente: Cliente, isInactiveSection = false) => {
    const contatoPrincipal = cliente.contatos?.find(c => c.principal) || cliente.contatos?.[0];
    const isInactive = cliente.status === 'Inativo' || isInactiveSection;

    return (
      <TableRow key={cliente.id} className={`group transition-colors ${isInactive ? 'opacity-75 hover:opacity-100 bg-muted/20' : 'hover:bg-muted/50'}`}>
        <TableCell className="font-medium text-xs font-mono">{cliente.codigo}</TableCell>
        <TableCell>
          <div 
            className="flex items-center gap-2.5 cursor-pointer group-hover:text-primary transition-colors"
            onClick={() => {
              setClientePerfil(cliente);
              setPerfilOpen(true);
            }}
          >
            {cliente.tipo === 'Pessoa Jurídica' ? <Building2 className="w-4 h-4 text-blue-500 shrink-0" /> : <User className="w-4 h-4 text-amber-500 shrink-0" />}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">{cliente.nomeFantasia || cliente.razaoSocial}</span>
              {cliente.tipo === 'Pessoa Jurídica' && (
                <span className="text-xs text-muted-foreground truncate">{cliente.razaoSocial}</span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground text-xs font-mono">{cliente.documento}</TableCell>
        <TableCell>
          {contatoPrincipal ? (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">{formatContactName(contatoPrincipal.nome, contatoPrincipal.email, cliente.nomeFantasia || cliente.razaoSocial)}</span>
              <span className="text-[11px] text-muted-foreground">{contatoPrincipal.email || contatoPrincipal.celular || '-'}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">Sem contato</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex flex-col text-xs">
            <span className="text-foreground">
              {cliente.endereco?.cidade ? `${cliente.endereco.cidade}${cliente.endereco.estado ? ` - ${cliente.endereco.estado}` : ''}` : '-'}
            </span>
            {cliente.endereco?.bairro && (
              <span className="text-[11px] text-muted-foreground">{cliente.endereco.bairro}</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge 
            variant={isInactive ? 'secondary' : 'default'} 
            onClick={(e) => handleToggleStatus(cliente, e)}
            className={`text-[10px] cursor-pointer transition-transform hover:scale-105 ${
              isInactive 
                ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-300' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title={isInactive ? 'Clique para reativar cliente' : 'Clique para inativar cliente'}
          >
            {isInactive ? 'Inativo' : 'Ativo'}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs w-48">
              <DropdownMenuItem 
                className="cursor-pointer font-medium"
                onSelect={(e) => {
                  e.preventDefault();
                  setClientePerfil(cliente);
                  setPerfilOpen(true);
                }}
              >
                <Eye className="w-4 h-4 mr-2 text-primary" />
                Ver Perfil
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => setClienteParaEditar(cliente)}
              >
                <Edit3 className="w-4 h-4 mr-2 text-slate-500" />
                Editar Cadastro
              </DropdownMenuItem>

              <Link to="/contas-a-receber">
                <DropdownMenuItem className="cursor-pointer">Ver Financeiro</DropdownMenuItem>
              </Link>

              <DropdownMenuSeparator />

              {/* Inativar / Reativar */}
              {isInactive ? (
                <DropdownMenuItem
                  className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 dark:focus:bg-emerald-950/30 cursor-pointer font-medium"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleToggleStatus(cliente);
                  }}
                >
                  <UserCheck className="w-4 h-4 mr-2 text-emerald-600" />
                  Reativar Cliente
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-amber-600 focus:text-amber-600 focus:bg-amber-50 dark:focus:bg-amber-950/30 cursor-pointer font-medium"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleToggleStatus(cliente);
                  }}
                >
                  <UserX className="w-4 h-4 mr-2 text-amber-600" />
                  Inativar Cliente
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                className="text-red-600 cursor-pointer focus:bg-red-500/10 focus:text-red-600"
                onSelect={async (e) => {
                  e.preventDefault();
                  if (window.confirm(`Tem certeza que deseja excluir o cliente "${cliente.nomeFantasia || cliente.razaoSocial}"?`)) {
                    try {
                      await deleteCliente(cliente.id);
                    } catch (err) {
                      console.error('Erro ao excluir cliente:', err);
                    }
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <div className="md:hidden">
        <MobileClientesView />
      </div>
      <div className="hidden md:block space-y-6 animate-fade-in">
      {/* Toolbar / Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, documento ou código..." 
              className="pl-8 text-xs h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Alternador Lista / Cards */}
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-2.5 text-xs gap-1.5"
              title="Visualização em Lista / Tabela"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-2.5 text-xs gap-1.5"
              title="Visualização em Cards"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
          </div>

          <Button 
            size="sm" 
            onClick={() => setNovoClienteOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white h-8 text-xs font-semibold cursor-pointer"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Conteúdo: Tabela ou Cards */}
      {viewMode === 'table' ? (
        <div className="space-y-6">
          {/* Seção 1: Clientes Ativos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Clientes Ativos ({ativos.length})
                </h2>
              </div>
            </div>

            <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[100px] text-xs font-semibold">Código</TableHead>
                    <TableHead className="text-xs font-semibold">Cliente / Razão Social</TableHead>
                    <TableHead className="text-xs font-semibold">CPF / CNPJ</TableHead>
                    <TableHead className="text-xs font-semibold">Contato Principal</TableHead>
                    <TableHead className="text-xs font-semibold">Localização</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                        Carregando carteira de clientes...
                      </TableCell>
                    </TableRow>
                  ) : ativos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                        Nenhum cliente ativo encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ativos.map((cliente) => renderClientRow(cliente, false))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Seção 2: Clientes Inativos */}
          {inativos.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-dashed">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Clientes Inativos ({inativos.length})
                  </h2>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Clientes pausados ou desativados
                </span>
              </div>

              <div className="border rounded-xl bg-card overflow-hidden shadow-xs border-dashed">
                <Table>
                  <TableHeader className="bg-muted/20">
                    <TableRow>
                      <TableHead className="w-[100px] text-xs font-semibold">Código</TableHead>
                      <TableHead className="text-xs font-semibold">Cliente / Razão Social</TableHead>
                      <TableHead className="text-xs font-semibold">CPF / CNPJ</TableHead>
                      <TableHead className="text-xs font-semibold">Contato Principal</TableHead>
                      <TableHead className="text-xs font-semibold">Localização</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inativos.map((cliente) => renderClientRow(cliente, true))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Visualização em Cards */
        <div className="space-y-8">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              Carregando carteira de clientes...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="border rounded-xl p-12 text-center text-muted-foreground text-sm bg-card">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30 text-primary" />
              Nenhum cliente encontrado para os critérios de busca.
            </div>
          ) : (
            <>
              {/* Seção 1: Clientes Ativos em Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Clientes Ativos ({ativos.length})
                    </h2>
                  </div>
                </div>

                {ativos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl bg-card">
                    Nenhum cliente ativo no momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ativos.map((cliente) => renderClientCard(cliente, false))}
                  </div>
                )}
              </div>

              {/* Seção 2: Clientes Inativos em Cards */}
              {inativos.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-dashed">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Clientes Inativos ({inativos.length})
                      </h2>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Clique no badge ou no menu para reativar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inativos.map((cliente) => renderClientCard(cliente, true))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal Lateral / Sheet Read-Only de Ver Perfil 360 */}
      <ClientePerfilSheet
        cliente={clientePerfil}
        open={perfilOpen}
        onOpenChange={setPerfilOpen}
        onEdit={(cli) => {
          setClienteParaEditar(cli);
        }}
      />

      {/* Modais / Sheets de Criação e Edição (desacoplados para garantir foco e digitação 100% livres) */}
      <NovoClienteSheet 
        open={novoClienteOpen} 
        onOpenChange={setNovoClienteOpen} 
      />

      <NovoClienteSheet 
        clienteToEdit={clienteParaEditar}
        open={!!clienteParaEditar}
        onOpenChange={(open) => {
          if (!open) setClienteParaEditar(null);
        }}
      />
    </div>
    </>
  );
}
