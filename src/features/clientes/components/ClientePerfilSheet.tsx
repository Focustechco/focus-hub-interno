import React, { useState, useMemo, useRef } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, User, Mail, Phone, MapPin, DollarSign, FileText, 
  Calendar, RefreshCw, CheckCircle2, Clock, AlertTriangle, ShieldCheck, 
  Tag, Info, ExternalLink, Download, Eye, FolderOpen, Briefcase, 
  MessageSquare, Edit3, Globe, Check, ArrowUpRight, ArrowDownRight, Upload, Plus,
  Rocket, Code2, Bug, ArrowRight
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Cliente } from '../types';
import { useLocalStorageState } from '@/hooks/useDataStore';
import { TituloReceber } from '@/features/contas-receber/types';
import { RecorrenciaFinanceira } from '@/features/recorrencias/types';
import { Contrato } from '@/features/contratos/types';
import { calculateClienteFinanceiro, generateRecorrenciaDates } from '@/features/recorrencias/services/recorrenciaEngine';
import { dmsService } from '@/services/dmsService';
import { DocumentoDMS } from '@/features/documentos/types';
import { DmsPreviewModal } from '@/features/documentos/components/DmsPreviewModal';
import { Link } from '@tanstack/react-router';
import { formatDateBrasilia, formatDateTimeBrasilia } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { formatContactName } from '@/services/clienteService';

interface ClientePerfilSheetProps {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (cliente: Cliente) => void;
}

export interface ItemTituloCronograma {
  id: string;
  numero: string;
  descricao: string;
  dataEmissao?: string;
  dataVencimento: string;
  valor: number;
  status: 'Recebido' | 'Pendente' | 'Atrasado' | 'Programado';
  isRecorrenciaFutura?: boolean;
  cicloInfo?: string;
}

function formatCurrency(val: any): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val || 0)) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateSafe(dateVal: any): string {
  return formatDateBrasilia(dateVal);
}

function formatDateTimeSafe(dateVal: any): string {
  return formatDateTimeBrasilia(dateVal);
}

export function ClientePerfilSheet({ cliente, open, onOpenChange, onEdit }: ClientePerfilSheetProps) {
  const { data: titulos = [] } = useLocalStorageState<TituloReceber>('focus_contas_receber');
  const { data: contasPagar = [] } = useLocalStorageState<any>('focus_contas_pagar');
  const { data: recorrencias = [] } = useLocalStorageState<RecorrenciaFinanceira>('focus_recorrencias');
  const { data: contratos = [] } = useLocalStorageState<Contrato>('focus_contratos');
  const { data: projetos = [] } = useLocalStorageState<any>('focus_projetos', []);
  const { data: docsState = [] } = useLocalStorageState<DocumentoDMS>('focus_dms_documentos');
  const { data: devSprints = [] } = useLocalStorageState<any>('focus_dev_sprints', []);
  const { data: devBacklog = [] } = useLocalStorageState<any>('focus_dev_backlog', []);
  const { data: devBugs = [] } = useLocalStorageState<any>('focus_dev_bugs', []);

  const [selectedDocPreview, setSelectedDocPreview] = useState<DocumentoDMS | null>(null);
  const [financeiroSubTab, setFinanceiroSubTab] = useState<'entradas' | 'saidas'>('entradas');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nomeOficial = cliente?.nomeFantasia || cliente?.razaoSocial || 'Cliente';
  const contatos = Array.isArray(cliente?.contatos) ? cliente.contatos : [];

  const matchesClient = useMemo(() => {
    if (!cliente) return () => false;
    const normalize = (s: any) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const cliId = cliente.id || '';
    const cliCodigo = cliente.codigo || '';
    const cliRazao = normalize(cliente.razaoSocial);
    const cliFantasia = normalize(cliente.nomeFantasia);
    const cliDoc = (cliente.documento || '').replace(/\D/g, '');

    return (item: any) => {
      if (!item) return false;
      if (item.clienteId && (item.clienteId === cliId || item.clienteId === cliCodigo)) return true;
      if (item.clientId && (item.clientId === cliId || item.clientId === cliCodigo)) return true;
      if (item.fornecedorId && (item.fornecedorId === cliId || item.fornecedorId === cliCodigo)) return true;

      const itemDoc = (item.documento || item.cnpj || item.cpf || '').replace(/\D/g, '');
      if (itemDoc && cliDoc && itemDoc === cliDoc) return true;

      const itemNome = normalize(item.cliente || item.clienteNome || item.fornecedor || item.fornecedorNome || item.razaoSocial || item.nomeFantasia || item.nome || '');
      if (itemNome && (itemNome === cliRazao || itemNome === cliFantasia)) return true;
      if (cliFantasia && itemNome && (itemNome.includes(cliFantasia) || cliFantasia.includes(itemNome))) return true;
      if (cliRazao && itemNome && (itemNome.includes(cliRazao) || cliRazao.includes(itemNome))) return true;

      const itemDesc = normalize(item.descricao || '');
      if (itemDesc && cliFantasia && cliFantasia.length > 3 && itemDesc.includes(cliFantasia)) return true;
      if (itemDesc && cliRazao && cliRazao.length > 3 && itemDesc.includes(cliRazao)) return true;

      return false;
    };
  }, [cliente]);

  const financeiro = useMemo(() => {
    return calculateClienteFinanceiro(cliente?.id || '', titulos, recorrencias, contratos, cliente);
  }, [cliente, titulos, recorrencias, contratos]);

  const despesasDoCliente = useMemo(() => {
    if (!cliente) return [];
    return (contasPagar || []).filter(matchesClient);
  }, [cliente, contasPagar, matchesClient]);

  const totalDespesas = useMemo(() => {
    return despesasDoCliente.reduce((acc, p) => {
      const v = Number(p.valorOriginal ?? p.valor ?? p.valorPago ?? 0);
      return acc + (isNaN(v) ? 0 : v);
    }, 0);
  }, [despesasDoCliente]);

  const recorrenciaAtiva = (financeiro?.recorrenciasDoCliente || []).find(r => r.status === 'Ativa');

  const cronogramaRecebimentos = useMemo(() => {
    if (!cliente) return [];
    const titulosEfetivos: ItemTituloCronograma[] = (financeiro?.titulosDoCliente || []).map(t => ({
      id: t.id,
      numero: t.numero || `REC-${t.id.slice(0, 4).toUpperCase()}`,
      descricao: t.descricao || 'Recebimento de Cliente',
      dataEmissao: t.dataEmissao,
      dataVencimento: t.dataVencimento,
      valor: t.valorOriginal || (t as any).valor || 0,
      status: (t.status === 'Pago' ? 'Recebido' : t.status) as any,
      isRecorrenciaFutura: false,
    }));

    const recorrenciasCliente = (financeiro?.recorrenciasDoCliente || []).filter(r => r.status === 'Ativa');
    const hoje = new Date().toISOString().split('T')[0];

    const datasTitulosExistentes = new Set(
      titulosEfetivos.map(t => (t.dataVencimento || '').substring(0, 7))
    );

    const titulosFuturos: ItemTituloCronograma[] = [];
    recorrenciasCliente.forEach(rec => {
      const qtdCiclos = rec.quantidade && rec.quantidade > 0 ? rec.quantidade : 12;
      const datas = generateRecorrenciaDates(rec, qtdCiclos);
      datas.forEach((dataVencStr, idx) => {
        const mesAno = dataVencStr.substring(0, 7);
        if (!datasTitulosExistentes.has(mesAno) && dataVencStr >= hoje) {
          titulosFuturos.push({
            id: `proj-${rec.id}-${dataVencStr}`,
            numero: `REC-PROG-${dataVencStr.replace(/-/g, '').slice(2, 6)}`,
            descricao: `${rec.descricao} (Recorrência Programada)`,
            dataEmissao: dataVencStr,
            dataVencimento: dataVencStr,
            valor: rec.valor,
            status: 'Programado',
            isRecorrenciaFutura: true,
            cicloInfo: `Mês ${idx + 1}${rec.quantidade ? `/${rec.quantidade}` : ''}`,
          });
        }
      });
    });

    const listaUnificada = [...titulosEfetivos, ...titulosFuturos];
    listaUnificada.sort((a, b) => (a.dataVencimento || '').localeCompare(b.dataVencimento || ''));

    return listaUnificada;
  }, [cliente, financeiro]);

  const contratosDoCliente = useMemo(() => {
    if (!cliente) return [];
    return (contratos || []).filter(matchesClient);
  }, [cliente, contratos, matchesClient]);

  const documentosDoCliente = useMemo(() => {
    if (!cliente) return [];
    const todosDocumentos = dmsService.getDocumentos() || [];
    const docsFromClient: any[] = (cliente as any)?.documentos || (cliente as any)?.anexos || [];
    
    const mapDocs = new Map<string, DocumentoDMS>();
    docsFromClient.forEach((d: any) => { if (d?.id) mapDocs.set(d.id, d); });
    todosDocumentos.forEach((d: any) => { 
      if (d && (matchesClient(d) || d.clienteId === cliente.id || (Array.isArray(d.tags) && d.tags.includes(cliente.id)))) {
        mapDocs.set(d.id, d); 
      }
    });
    docsState.forEach((d: any) => {
      if (d && (matchesClient(d) || d.clienteId === cliente.id || (Array.isArray(d.tags) && d.tags.includes(cliente.id)))) {
        mapDocs.set(d.id, d);
      }
    });

    return Array.from(mapDocs.values());
  }, [cliente, docsState, matchesClient]);

  const projetosDoCliente = useMemo(() => {
    if (!cliente) return [];
    return (projetos || []).filter(matchesClient);
  }, [cliente, projetos, matchesClient]);

  const handleUploadDocumento = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cliente) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64 = reader.result as string;
        dmsService.uploadFileFromModule({
          nome: file.name,
          tamanho: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          tamanhoBytes: file.size,
          moduloOrigem: 'Clientes',
          clienteId: cliente.id,
          clienteNome: nomeOficial,
          categoria: 'Documento Anexo',
          urlConteudo: base64,
          tags: ['Cliente', nomeOficial, cliente.id],
          responsavelUpload: 'Módulo Clientes',
        });
        toast.success(`Documento "${file.name}" anexado e sincronizado no DMS com sucesso!`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        toast.error(`Erro ao anexar arquivo: ${err?.message || 'Falha no upload'}`);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!cliente) return null;

  const dataCadastroFormatada = formatDateTimeSafe(cliente.dataCadastro);
  const ultimaAtualizacaoFormatada = formatDateTimeSafe(cliente.ultimaAtualizacao || cliente.dataCadastro);

  const enderecoTexto = [
    cliente.endereco?.logradouro,
    cliente.endereco?.numero ? `nº ${cliente.endereco.numero}` : '',
    cliente.endereco?.complemento,
    cliente.endereco?.bairro,
    cliente.endereco?.cidade,
    cliente.endereco?.estado,
    cliente.endereco?.cep ? `CEP ${cliente.endereco.cep}` : ''
  ].filter(Boolean).join(', ');

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoTexto || `${cliente.endereco?.cidade || ''} ${cliente.endereco?.estado || ''}`)}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-4xl overflow-y-auto w-full">
        <SheetHeader className="pb-4 border-b space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                  {cliente.codigo}
                </span>
                <Badge 
                  variant={cliente.status === 'Ativo' ? 'default' : 'secondary'} 
                  className={cliente.status === 'Ativo' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  {cliente.status || 'Ativo'}
                </Badge>
                {recorrenciaAtiva && (
                  <Badge variant="outline" className="border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/30 flex items-center gap-1 text-xs">
                    <RefreshCw className="w-3 h-3" /> Recorrência {recorrenciaAtiva.frequencia}
                  </Badge>
                )}
                {cliente.segmento && (
                  <Badge variant="secondary" className="text-xs">
                    {cliente.segmento}
                  </Badge>
                )}
              </div>

              <SheetTitle className="text-2xl font-bold mt-2 flex items-center gap-2 text-foreground">
                {cliente.tipo === 'Pessoa Jurídica' ? <Building2 className="w-6 h-6 text-blue-500 shrink-0" /> : <User className="w-6 h-6 text-amber-500 shrink-0" />}
                <span>{nomeOficial}</span>
              </SheetTitle>

              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {cliente.tipo} • {cliente.documento} 
                {cliente.inscricaoEstadual && cliente.inscricaoEstadual !== 'Isento' ? ` • IE: ${cliente.inscricaoEstadual}` : ''}
              </SheetDescription>
            </div>

            {onEdit && (
              <Button 
                size="sm" 
                onClick={() => {
                  onOpenChange(false);
                  onEdit(cliente);
                }}
                className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar Cadastro
              </Button>
            )}
          </div>

          <div className="bg-muted/30 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-2 border">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Cadastrado em: <strong className="text-foreground">{dataCadastroFormatada}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Última atualização: <strong className="text-foreground">{ultimaAtualizacaoFormatada}</strong></span>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="dados" className="w-full mt-4">
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="w-max inline-flex p-1 h-auto gap-1">
              <TabsTrigger value="dados" className="text-xs">Dados Cadastrais</TabsTrigger>
              <TabsTrigger value="endereco" className="text-xs">Endereço</TabsTrigger>
              <TabsTrigger value="contatos" className="text-xs">Contatos ({contatos.length})</TabsTrigger>
              <TabsTrigger value="financeiro" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Financeiro ({cronogramaRecebimentos.length + despesasDoCliente.length})
              </TabsTrigger>
              <TabsTrigger value="contratos" className="text-xs font-semibold text-primary">
                Contratos ({contratosDoCliente.length})
              </TabsTrigger>
              <TabsTrigger value="documentos" className="text-xs font-semibold text-orange-600">
                Documentos ({documentosDoCliente.length})
              </TabsTrigger>
              <TabsTrigger value="projetos" className="text-xs">Projetos ({projetosDoCliente.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dados" className="space-y-4 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[11px] font-medium text-muted-foreground">Tipo de Cliente</div>
                <div className="font-semibold text-sm mt-0.5">{cliente.tipo}</div>
              </div>

              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[11px] font-medium text-muted-foreground">{cliente.tipo === 'Pessoa Jurídica' ? 'CNPJ' : 'CPF'}</div>
                <div className="font-semibold text-sm mt-0.5 font-mono">{cliente.documento}</div>
              </div>

              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[11px] font-medium text-muted-foreground">Situação Cadastral</div>
                <div className="font-semibold text-sm mt-0.5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cliente.status === 'Ativo' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                  {cliente.status || 'Ativo'}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border bg-card sm:col-span-2">
                <div className="text-[11px] font-medium text-muted-foreground">Razão Social / Nome Completo</div>
                <div className="font-semibold text-sm mt-0.5">{cliente.razaoSocial}</div>
              </div>

              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[11px] font-medium text-muted-foreground">Nome Fantasia</div>
                <div className="font-semibold text-sm mt-0.5">{cliente.nomeFantasia || '-'}</div>
              </div>

              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[11px] font-medium text-muted-foreground">Inscrição Estadual</div>
                <div className="font-semibold text-sm mt-0.5">{cliente.inscricaoEstadual || 'Isento'}</div>
              </div>

              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[11px] font-medium text-muted-foreground">Inscrição Municipal</div>
                <div className="font-semibold text-sm mt-0.5">{cliente.inscricaoMunicipal || 'Não informada'}</div>
              </div>

              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[11px] font-medium text-muted-foreground">Data Fundação / Nascimento</div>
                <div className="font-semibold text-sm mt-0.5">
                  {formatDateSafe(cliente.dataFundacaoNascimento)}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[11px] font-medium text-muted-foreground">Segmento de Atuação</div>
                <div className="font-semibold text-sm mt-0.5">{cliente.segmento || 'Geral'}</div>
              </div>

              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[11px] font-medium text-muted-foreground">Porte da Empresa</div>
                <div className="font-semibold text-sm mt-0.5">{cliente.porteEmpresa || 'Médio'}</div>
              </div>

              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[11px] font-medium text-muted-foreground">Website / Portal</div>
                <div className="font-semibold text-sm mt-0.5 truncate">
                  {cliente.site ? (
                    <a href={cliente.site.startsWith('http') ? cliente.site : `https://${cliente.site}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 truncate">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{cliente.site}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    'Não informado'
                  )}
                </div>
              </div>
            </div>

            {cliente.observacoes && (
              <div className="p-4 rounded-lg border bg-card space-y-1">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-primary" /> Observações Internas & Comerciais
                </div>
                <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed mt-1">{cliente.observacoes}</div>
              </div>
            )}
          </TabsContent>

          {/* 2. ENDEREÇO COMPLETO */}
          <TabsContent value="endereco" className="space-y-4 mt-3">
            <div className="p-5 rounded-lg border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  Localização e Endereço Físico
                </div>
                <Button variant="outline" size="sm" asChild className="text-xs gap-1.5 h-8">
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 text-primary" /> Ver no Google Maps
                  </a>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Logradouro / Rua</span>
                  <span className="font-semibold text-sm text-foreground">{cliente.endereco?.logradouro || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Número</span>
                  <span className="font-semibold text-sm text-foreground">{cliente.endereco?.numero || 'S/N'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Complemento</span>
                  <span className="font-semibold text-sm text-foreground">{cliente.endereco?.complemento || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Bairro</span>
                  <span className="font-semibold text-sm text-foreground">{cliente.endereco?.bairro || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Cidade / Estado</span>
                  <span className="font-semibold text-sm text-foreground">{cliente.endereco?.cidade ? `${cliente.endereco.cidade}${cliente.endereco.estado ? ` - ${cliente.endereco.estado}` : ''}` : 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">CEP</span>
                  <span className="font-semibold text-sm text-foreground font-mono">{cliente.endereco?.cep || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">País</span>
                  <span className="font-semibold text-sm text-foreground">{cliente.endereco?.pais || 'Brasil'}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 3. CONTATOS */}
          <TabsContent value="contatos" className="space-y-3 mt-3">
            {contatos.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Nenhum contato cadastrado para este cliente.
              </div>
            ) : (
              contatos.map((contato, idx) => {
                const cleanPhone = (contato.celular || contato.telefone || '').replace(/\D/g, '');
                const waLink = cleanPhone ? `https://wa.me/55${cleanPhone}` : undefined;

                return (
                  <div key={contato.id || idx} className="p-4 rounded-lg border bg-card space-y-3 relative">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {(contato.nome || 'CT').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                            {formatContactName(contato.nome, contato.email, nomeOficial)}
                            {contato.principal && (
                              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                                Contato Principal
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{contato.cargo || 'Responsável'} • {contato.departamento || 'Geral'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {waLink && (
                          <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1 text-emerald-600 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                            <a href={waLink} target="_blank" rel="noopener noreferrer">
                              <MessageSquare className="w-3 h-3" /> WhatsApp
                            </a>
                          </Button>
                        )}
                        {contato.email && (
                          <Button size="sm" variant="outline" asChild className="h-7 text-xs gap-1 text-blue-600 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                            <a href={`mailto:${contato.email}`}>
                              <Mail className="w-3 h-3" /> E-mail
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-2 border-t">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-foreground truncate">{contato.email || 'Não informado'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-foreground">{contato.celular || 'Não informado'}</span>
                      </div>
                      {contato.telefone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-foreground">{contato.telefone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* 4. FINANCEIRO & RECORRÊNCIA INTEGRADA (ENTRADAS E SAÍDAS) */}
          <TabsContent value="financeiro" className="space-y-4 mt-3">
            {/* Cards KPI Financeiros Completos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3 text-rose-500" /> A Receber (Aberto)
                </div>
                <div className="font-bold text-base text-rose-600 dark:text-rose-400 mt-1">
                  R$ {formatCurrency(financeiro?.valorEmAberto)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" /> Total Recebido
                </div>
                <div className="font-bold text-base text-emerald-600 dark:text-emerald-400 mt-1">
                  R$ {formatCurrency(financeiro?.totalRecebido)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3 text-amber-500" /> Total Despesas / Saídas
                </div>
                <div className="font-bold text-base text-amber-600 dark:text-amber-400 mt-1">
                  R$ {formatCurrency(totalDespesas)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border bg-card">
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-primary" /> Mensalidade (MRR)
                </div>
                <div className="font-bold text-base text-foreground mt-1">
                  R$ {formatCurrency(financeiro?.mensalidade)}
                </div>
              </div>
            </div>

            {/* Recorrência Ativa */}
            {(financeiro?.recorrenciasDoCliente || []).length > 0 && (
              <div className="p-4 rounded-lg border bg-card space-y-2">
                <div className="font-semibold text-xs flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Plano de Recorrência Configurado
                </div>
                {financeiro.recorrenciasDoCliente.map(rec => (
                  <div key={rec.id} className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs border-t">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Descrição</span>
                      <span className="font-medium text-foreground">{rec.descricao}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Valor</span>
                      <span className="font-bold text-foreground">R$ {formatCurrency(rec.valor)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Frequência / Vencimento</span>
                      <span className="font-medium text-foreground">{rec.frequencia} (Todo dia {rec.diaVencimento || 10})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Status</span>
                      <span className={`font-medium ${rec.status === 'Ativa' ? 'text-emerald-600' : 'text-amber-600'}`}>{rec.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Alternador de Visão: Entradas vs Saídas */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <div className="flex items-center gap-1">
                  <Button 
                    variant={financeiroSubTab === 'entradas' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setFinanceiroSubTab('entradas')}
                    className="h-7 text-xs gap-1.5"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                    Entradas & Títulos ({cronogramaRecebimentos.length})
                  </Button>
                  <Button 
                    variant={financeiroSubTab === 'saidas' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setFinanceiroSubTab('saidas')}
                    className="h-7 text-xs gap-1.5"
                  >
                    <ArrowDownRight className="w-3.5 h-3.5 text-amber-500" />
                    Saídas & Despesas ({despesasDoCliente.length})
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Link to="/contas-a-receber" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Contas a Receber <ExternalLink className="w-3 h-3" />
                  </Link>
                  <span className="text-muted-foreground text-xs">•</span>
                  <Link to="/contas-a-pagar" className="text-xs text-primary hover:underline flex items-center gap-1">
                    Contas a Pagar <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Sub-Aba de ENTRADAS */}
              {financeiroSubTab === 'entradas' && (
                <div>
                  {cronogramaRecebimentos.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                      Nenhum título ou recebimento programado para este cliente.
                    </div>
                  ) : (
                    <div className="divide-y border rounded-lg max-h-80 overflow-y-auto bg-card">
                      {cronogramaRecebimentos.map(titulo => (
                        <div key={titulo.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors">
                          <div className="space-y-0.5">
                            <div className="font-medium text-foreground flex items-center gap-2">
                              <span className={`font-mono font-bold ${titulo.isRecorrenciaFutura ? 'text-blue-600 dark:text-blue-400' : 'text-primary'}`}>
                                {titulo.numero}
                              </span>
                              <span>• {titulo.descricao}</span>
                              {titulo.cicloInfo && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                  {titulo.cicloInfo}
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {titulo.dataEmissao && `Emissão: ${formatDateSafe(titulo.dataEmissao)} • `}
                              Vencimento: <strong className="text-foreground">{formatDateSafe(titulo.dataVencimento)}</strong>
                              {titulo.isRecorrenciaFutura && (
                                <span className="text-blue-600 dark:text-blue-400 ml-2 font-medium">• Lançamento Futuro Programado</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-foreground">
                              R$ {formatCurrency(titulo.valor)}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] mt-0.5 ${
                                titulo.status === 'Recebido' || (titulo as any).status === 'Pago'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                  : titulo.status === 'Atrasado'
                                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                                  : titulo.status === 'Programado'
                                  ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              {titulo.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Aba de SAÍDAS */}
              {financeiroSubTab === 'saidas' && (
                <div>
                  {despesasDoCliente.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                      Nenhuma saída ou despesa vinculada diretamente a este cliente.
                    </div>
                  ) : (
                    <div className="divide-y border rounded-lg max-h-80 overflow-y-auto bg-card">
                      {despesasDoCliente.map((despesa: any) => (
                        <div key={despesa.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors">
                          <div className="space-y-0.5">
                            <div className="font-medium text-foreground flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                {despesa.numero || `PAG-${(despesa.id || '').slice(0, 4).toUpperCase()}`}
                              </span>
                              <span>• {despesa.descricao || 'Despesa Operacional'}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {despesa.categoria && <Badge variant="secondary" className="text-[10px] mr-1.5 px-1 py-0">{despesa.categoria}</Badge>}
                              Vencimento: <strong className="text-foreground">{formatDateSafe(despesa.dataVencimento || despesa.data_vencimento)}</strong>
                              {despesa.dataPagamento && ` • Pago em: ${formatDateSafe(despesa.dataPagamento)}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-foreground">
                              R$ {formatCurrency(despesa.valorOriginal || despesa.valor || despesa.valorPago)}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] mt-0.5 ${
                                despesa.status === 'Pago' || despesa.status === 'Liquidado'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : despesa.status === 'Atrasado'
                                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              {despesa.status || 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* 5. CONTRATOS */}
          <TabsContent value="contratos" className="space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contratos Homologados ({contratosDoCliente.length})
              </span>
              <Link to="/contratos" className="text-xs text-primary hover:underline flex items-center gap-1">
                Abrir Módulo de Contratos <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {contratosDoCliente.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Nenhum contrato ativo registrado para este cliente.
              </div>
            ) : (
              <div className="space-y-2">
                {contratosDoCliente.map(contrato => (
                  <div key={contrato.id} className="p-3.5 rounded-lg border bg-card flex items-center justify-between text-xs hover:border-primary/50 transition-colors">
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span>{contrato.nome || contrato.objetoContrato || 'Contrato de Prestação de Serviços'}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{contrato.numeroContrato || contrato.codigo || 'CTR'}</Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        {contrato.tipoServico || contrato.tipoContrato || 'Serviços'} • Vigência: {formatDateSafe(contrato.dataInicio)} até {contrato.dataFim ? formatDateSafe(contrato.dataFim) : 'Indeterminado'}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        Valor Total: <strong>R$ {formatCurrency(contrato.valorTotal || (contrato as any).valor)}</strong> • Mensal: R$ {formatCurrency(contrato.valorMensal || (contrato as any).valorMensalidade || (contrato as any).valor_mensal)}
                      </p>
                    </div>
                    <Badge className={contrato.status === 'Ativo' || contrato.status === 'Vigente' ? 'bg-emerald-600' : 'bg-slate-500'}>
                      {contrato.status || 'Ativo'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 6. DOCUMENTOS DMS */}
          <TabsContent value="documentos" className="space-y-3 mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Repositório de Documentos no DMS ({documentosDoCliente.length})
                </span>
                <p className="text-[11px] text-muted-foreground">Pasta central: <code>/Clientes/{nomeOficial}</code></p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleUploadDocumento} 
                  className="hidden" 
                />
                <Button 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="h-7 text-xs gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Plus className="w-3.5 h-3.5" /> Anexar Documento
                </Button>
                <Link to="/documentos" className="text-xs text-orange-600 hover:underline flex items-center gap-1 font-medium ml-1">
                  Explorador DMS <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {documentosDoCliente.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40 text-orange-500" />
                <p>Nenhum documento anexado ainda para este cliente.</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="mt-3 text-xs gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-orange-600" /> Fazer Upload de Documento
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {documentosDoCliente.map(doc => (
                  <div key={doc.id} className="p-3 rounded-lg border bg-card flex items-center justify-between text-xs hover:border-orange-500/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-6 h-6 text-orange-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{doc.nome}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <span>{doc.codigo}</span>
                          <span>• {doc.tamanho}</span>
                          <span>• {formatDateSafe(doc.dataUpload)}</span>
                          <span className="bg-secondary px-1 py-0.5 rounded text-[9px]">{doc.categoria || doc.moduloOrigem}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => setSelectedDocPreview(doc)} 
                        className="h-7 text-xs px-2 gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Visualizar
                      </Button>
                      {doc.urlConteudo && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" asChild>
                          <a href={doc.urlConteudo} download={doc.nome}>
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 7. PROJETOS & ENTREGAS */}
          <TabsContent value="projetos" className="space-y-4 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Projetos Vinculados ({projetosDoCliente.length})
              </span>
              <Link to="/projetos" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
                Ver Módulo Projetos <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {projetosDoCliente.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-2xl bg-card/40">
                <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
                Nenhum projeto vinculado a este cliente no momento.
              </div>
            ) : (
              <div className="space-y-4">
                {projetosDoCliente.map((proj: any) => {
                  const projBacklog = (devBacklog || []).filter((b: any) => b && b.projetoId === proj.id);
                  const projBugs = (devBugs || []).filter(
                    (b: any) => b && b.projetoId === proj.id && b.status !== 'Resolvido' && b.status !== 'Fechado'
                  );
                  const projSprints = (devSprints || []).filter((s: any) => s && s.projetoId === proj.id);
                  const activeSprint = projSprints.find((s: any) => s && s.status === 'Em Andamento') || projSprints[0];

                  const progressoNum = Math.min(
                    100,
                    Math.max(
                      0,
                      typeof proj.progressoGlobal === 'number'
                        ? proj.progressoGlobal
                        : typeof proj.progresso === 'number'
                        ? proj.progresso
                        : typeof proj.percentualConclusao === 'number'
                        ? proj.percentualConclusao
                        : proj.status === 'Concluído'
                        ? 100
                        : 0
                    )
                  );

                  const getProjetoStatusBadge = (status: string) => {
                    switch (status) {
                      case 'Concluído':
                        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">Concluído</Badge>;
                      case 'Em Desenvolvimento':
                        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-bold">Em Desenvolvimento</Badge>;
                      case 'Em Homologação':
                        return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px] font-bold">Em Homologação</Badge>;
                      case 'Kickoff':
                      case 'Planejamento':
                        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-bold">{status}</Badge>;
                      case 'Cancelado':
                        return <Badge variant="destructive" className="text-[10px] font-bold">Cancelado</Badge>;
                      default:
                        return <Badge variant="secondary" className="text-[10px] font-bold">{status || 'Em Andamento'}</Badge>;
                    }
                  };

                  return (
                    <div
                      key={proj.id}
                      className="group relative bg-card/80 hover:bg-card border border-border/70 hover:border-primary/50 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden flex flex-col space-y-3.5"
                    >
                      {/* Top Accent Gradient Bar */}
                      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-primary group-hover:from-primary group-hover:via-blue-500 group-hover:to-indigo-500 transition-all duration-500" />

                      <div className="p-4 space-y-3.5">
                        {/* Header do Card */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors">
                                {proj.nome || proj.title || 'Projeto'}
                              </span>
                              {proj.codigo && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-muted text-foreground border border-border/80">
                                  {proj.codigo}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                {proj.tipo || 'Software Sob Medida'}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Responsável: <span className="font-semibold text-foreground">{proj.responsavel || proj.responsavelPrincipal || proj.gerente || 'Tech Lead'}</span> • Prazo: {proj.dataFim ? formatDateSafe(proj.dataFim) : 'A definir'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {getProjetoStatusBadge(proj.status || 'Planejamento')}
                          </div>
                        </div>

                        {/* Card de Sprint Atual */}
                        <div className="p-3 rounded-xl bg-muted/40 backdrop-blur-sm border border-border/70 group-hover:border-primary/30 transition-colors space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Rocket className="h-3.5 w-3.5 text-primary" />
                              Sprint Atual
                            </span>
                            {activeSprint ? (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {activeSprint.status === 'Em Andamento' ? 'Em Andamento' : activeSprint.status}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-muted-foreground">Planejamento</span>
                            )}
                          </div>
                          <div className="text-xs font-extrabold text-foreground truncate">
                            {activeSprint ? activeSprint.nome : `Sprint 1 - Início & Arquitetura ${proj.codigo || ''}`}
                          </div>
                        </div>

                        {/* Barra de Progresso Refinada e Grossa */}
                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary/80" />
                              Progresso do Projeto:
                            </span>
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-foreground">
                              {progressoNum}%
                            </span>
                          </div>

                          {/* Barra de Progresso Customizada - Mais Grossa e Refinada */}
                          <div className="relative h-3.5 w-full rounded-full bg-muted/80 border border-border/80 p-0.5 overflow-hidden shadow-inner">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                              style={{ width: `${Math.max(progressoNum, 2)}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/30" />
                            </div>
                          </div>
                        </div>

                        {/* Micro-pills de Estatísticas (Tarefas & Bugs) */}
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400">
                            <Code2 className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                            <span className="font-bold text-foreground">{projBacklog.length || 4}</span>
                            <span className="text-[11px] text-muted-foreground">tarefas</span>
                          </div>

                          <div
                            className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                              projBugs.length > 0
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            <Bug className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-bold text-foreground">{projBugs.length}</span>
                            <span className="text-[11px] text-muted-foreground">bugs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer do Sheet */}
        <SheetFooter className="mt-6 pt-3 border-t flex flex-row items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Fechar
          </Button>
          {onEdit && (
            <Button 
              size="sm" 
              onClick={() => {
                onOpenChange(false);
                onEdit(cliente);
              }}
              className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
            >
              Editar Cadastro
            </Button>
          )}
        </SheetFooter>

        {/* Modal de Preview do Documento Selecionado */}
        {selectedDocPreview && (
          <DmsPreviewModal
            doc={selectedDocPreview}
            open={!!selectedDocPreview}
            onOpenChange={(op) => !op && setSelectedDocPreview(null)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
