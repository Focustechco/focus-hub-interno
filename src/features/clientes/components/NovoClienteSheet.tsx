import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, Trash2, FileText, Upload, RefreshCw, Calendar, DollarSign, 
  CheckCircle2, PauseCircle, XCircle, FolderOpen, UploadCloud, Download, 
  ExternalLink, Eye, ShieldCheck, Briefcase, Search, MapPin, Building, Globe, User, Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { useClientesQuery } from '../hooks/useClientesQuery';
import { Cliente } from '../types';
import { useLocalStorageState } from '@/hooks/useDataStore';
import { TituloReceber } from '@/features/contas-receber/types';
import { Contrato } from '@/features/contratos/types';
import { RecorrenciaFinanceira, FrequenciaRecorrencia, StatusRecorrencia } from '@/features/recorrencias/types';
import { calculateClienteFinanceiro, syncRecorrenciaTitulos } from '@/features/recorrencias/services/recorrenciaEngine';
import { useNotificacoesStore } from '@/features/notificacoes/useNotificacoesStore';
import { dmsService } from '@/services/dmsService';
import { consultarCnpj, formatarCnpj, formatarCep, formatarTelefone } from '@/services/cnpjService';
import { DocumentoDMS } from '@/features/documentos/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { getBrasiliaTodayIso, formatDateBrasilia } from '@/lib/dateUtils';

interface DocumentoAnexoLocal {
  id: string;
  nome: string;
  tamanho: string;
  tamanhoBytes?: number;
  dataUpload: string;
  urlConteudo?: string;
  categoria?: string;
}

function computeDataFinal(dataInicioStr: string, quantidadeStr: string, frequencia: FrequenciaRecorrencia): string {
  if (!dataInicioStr || !quantidadeStr) return '';
  const qtd = parseInt(quantidadeStr, 10);
  if (isNaN(qtd) || qtd <= 0) return '';

  const dataInicio = new Date(dataInicioStr + 'T12:00:00');
  if (isNaN(dataInicio.getTime())) return '';

  const ano = dataInicio.getFullYear();
  const mes = dataInicio.getMonth();
  const dia = dataInicio.getDate();

  let targetYear = ano;
  let targetMonth = mes;

  switch (frequencia) {
    case 'Semanal': {
      const fim = new Date(dataInicio.getTime() + qtd * 7 * 24 * 3600 * 1000);
      return fim.toISOString().split('T')[0];
    }
    case 'Quinzenal': {
      const fim = new Date(dataInicio.getTime() + qtd * 15 * 24 * 3600 * 1000);
      return fim.toISOString().split('T')[0];
    }
    case 'Trimestral': {
      targetMonth = mes + (qtd * 3);
      break;
    }
    case 'Semestral': {
      targetMonth = mes + (qtd * 6);
      break;
    }
    case 'Anual': {
      targetYear = ano + qtd;
      break;
    }
    case 'Mensal':
    default: {
      targetMonth = mes + qtd;
      break;
    }
  }

  const calculated = new Date(targetYear, targetMonth, 1);
  const finalYear = calculated.getFullYear();
  const finalMonth = calculated.getMonth();
  const lastDay = new Date(finalYear, finalMonth + 1, 0).getDate();
  const safeDay = Math.min(dia, lastDay);

  return `${finalYear}-${String(finalMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

function computeQuantidadeFromDates(dataInicioStr: string, dataFimStr: string, frequencia: FrequenciaRecorrencia): string {
  if (!dataInicioStr || !dataFimStr) return '';
  const inicio = new Date(dataInicioStr + 'T12:00:00');
  const fim = new Date(dataFimStr + 'T12:00:00');
  if (isNaN(inicio.getTime()) || isNaN(fim.getTime()) || fim <= inicio) return '';

  const months = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
  if (frequencia === 'Trimestral') return String(Math.max(1, Math.round(months / 3)));
  if (frequencia === 'Semestral') return String(Math.max(1, Math.round(months / 6)));
  if (frequencia === 'Anual') return String(Math.max(1, Math.round(months / 12)));
  if (frequencia === 'Semanal') {
    const days = Math.round((fim.getTime() - inicio.getTime()) / (7 * 24 * 3600 * 1000));
    return String(Math.max(1, days));
  }
  if (frequencia === 'Quinzenal') {
    const days = Math.round((fim.getTime() - inicio.getTime()) / (15 * 24 * 3600 * 1000));
    return String(Math.max(1, days));
  }
  return String(Math.max(1, months));
}

export interface NovoClienteSheetProps {
  children?: React.ReactNode;
  clienteToEdit?: Cliente | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NovoClienteSheet({ 
  children, 
  clienteToEdit,
  open: controlledOpen,
  onOpenChange: setControlledOpen
}: NovoClienteSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (setControlledOpen || (() => {})) : setInternalOpen;
  
  // Dados Gerais
  const [tipoPessoa, setTipoPessoa] = useState(clienteToEdit?.tipo === 'Pessoa Física' ? 'pf' : 'pj');
  const [documento, setDocumento] = useState(clienteToEdit?.documento || '');
  const [razaoSocial, setRazaoSocial] = useState(clienteToEdit?.razaoSocial || '');
  const [nomeFantasia, setNomeFantasia] = useState(clienteToEdit?.nomeFantasia || '');
  const [ie, setIe] = useState(clienteToEdit?.inscricaoEstadual || '');
  const [im, setIm] = useState(clienteToEdit?.inscricaoMunicipal || '');
  const [dataFundacao, setDataFundacao] = useState(clienteToEdit?.dataFundacaoNascimento || '');
  const [segmento, setSegmento] = useState(clienteToEdit?.segmento || 'Tecnologia');
  const [porte, setPorte] = useState(clienteToEdit?.porteEmpresa || 'Médio');
  const [site, setSite] = useState(clienteToEdit?.site || '');
  const [observacoes, setObservacoes] = useState(clienteToEdit?.observacoes || '');
  const [statusCliente, setStatusCliente] = useState(clienteToEdit?.status || 'Ativo');
  
  // Endereço Completo
  const [cep, setCep] = useState(clienteToEdit?.endereco?.cep || '');
  const [logradouro, setLogradouro] = useState(clienteToEdit?.endereco?.logradouro || '');
  const [numero, setNumero] = useState(clienteToEdit?.endereco?.numero || '');
  const [complemento, setComplemento] = useState(clienteToEdit?.endereco?.complemento || '');
  const [bairro, setBairro] = useState(clienteToEdit?.endereco?.bairro || '');
  const [cidade, setCidade] = useState(clienteToEdit?.endereco?.cidade || '');
  const [estado, setEstado] = useState(clienteToEdit?.endereco?.estado || '');
  const [pais, setPais] = useState(clienteToEdit?.endereco?.pais || 'Brasil');
  const [isBuscandoCep, setIsBuscandoCep] = useState(false);
  const [isConsultandoCnpj, setIsConsultandoCnpj] = useState(false);

  // Contatos
  const contatoPrincipal = clienteToEdit?.contatos?.find(c => c.principal) || clienteToEdit?.contatos?.[0];
  const [contatoNome, setContatoNome] = useState(contatoPrincipal?.nome || '');
  const [contatoCargo, setContatoCargo] = useState(contatoPrincipal?.cargo || 'Responsável Comercial');
  const [contatoDepartamento, setContatoDepartamento] = useState(contatoPrincipal?.departamento || 'Diretoria');
  const [contatoEmail, setContatoEmail] = useState(contatoPrincipal?.email || '');
  const [contatoCelular, setContatoCelular] = useState(contatoPrincipal?.celular || '');
  const [contatoTelefone, setContatoTelefone] = useState(contatoPrincipal?.telefone || '');
  const [contatoWhatsapp, setContatoWhatsapp] = useState(contatoPrincipal?.whatsapp ?? true);

  // Dados da Recorrência Financeira
  const [recorrenciaHabilitada, setRecorrenciaHabilitada] = useState(false);
  const [recorrenciaId, setRecorrenciaId] = useState('');
  const [recorrenciaDescricao, setRecorrenciaDescricao] = useState('');
  const [recorrenciaValor, setRecorrenciaValor] = useState('');
  const [recorrenciaFrequencia, setRecorrenciaFrequencia] = useState<FrequenciaRecorrencia>('Mensal');
  const [recorrenciaDataInicio, setRecorrenciaDataInicio] = useState('');
  const [recorrenciaDataFinal, setRecorrenciaDataFinal] = useState('');
  const [recorrenciaDiaVencimento, setRecorrenciaDiaVencimento] = useState('10');
  const [recorrenciaQuantidade, setRecorrenciaQuantidade] = useState('');
  const [recorrenciaStatus, setRecorrenciaStatus] = useState<StatusRecorrencia>('Ativa');
  const [recorrenciaObservacoes, setRecorrenciaObservacoes] = useState('');

  // Documentos Anexados (Integrados ao DMS)
  const [documentosAnexados, setDocumentosAnexados] = useState<DocumentoAnexoLocal[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Modal Rápido de Novo Contrato Vinculado
  const [modalNovoContratoOpen, setModalNovoContratoOpen] = useState(false);
  const [contratoNome, setContratoNome] = useState('');
  const [contratoTipo, setContratoTipo] = useState('Desenvolvimento de Software');
  const [contratoValorTotal, setContratoValorTotal] = useState('');
  const [contratoMensalidade, setContratoMensalidade] = useState('');
  const [contratoDataInicio, setContratoDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [contratoDataFim, setContratoDataFim] = useState(new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0]);

  // Stores Financeiros, Contratos e Clientes
  const { saveCliente } = useClientesQuery();
  const { notificar } = useNotificacoesStore();
  const { data: titulos = [], setAllItems: setAllTitulos } = useLocalStorageState<TituloReceber>('focus_contas_receber');
  const { data: recorrencias = [], setAllItems: setAllRecorrencias } = useLocalStorageState<RecorrenciaFinanceira>('focus_recorrencias');
  const { data: contratos = [], addItem: addContrato } = useLocalStorageState<Contrato>('focus_contratos');

  const clienteNomeOficial = nomeFantasia || razaoSocial || 'Cliente';
  const currentClienteId = clienteToEdit?.id || '';
  const hasInitializedRef = React.useRef(false);

  // Carregar dados e documentos existentes estritamente ao abrir o modal (evita sobrescrever campos enquanto o usuário digita)
  useEffect(() => {
    if (open) {
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        setTipoPessoa(clienteToEdit?.tipo === 'Pessoa Física' ? 'pf' : 'pj');
        setDocumento(clienteToEdit?.documento || '');
        setRazaoSocial(clienteToEdit?.razaoSocial || '');
        setNomeFantasia(clienteToEdit?.nomeFantasia || '');
        setIe(clienteToEdit?.inscricaoEstadual || '');
        setIm(clienteToEdit?.inscricaoMunicipal || '');
        setDataFundacao(clienteToEdit?.dataFundacaoNascimento || '');
        setSegmento(clienteToEdit?.segmento || 'Tecnologia');
        setPorte(clienteToEdit?.porteEmpresa || 'Médio');
        setSite(clienteToEdit?.site || '');
        setObservacoes(clienteToEdit?.observacoes || '');
        setStatusCliente(clienteToEdit?.status || 'Ativo');

        // Endereço
        setCep(clienteToEdit?.endereco?.cep || '');
        setLogradouro(clienteToEdit?.endereco?.logradouro || '');
        setNumero(clienteToEdit?.endereco?.numero || '');
        setComplemento(clienteToEdit?.endereco?.complemento || '');
        setBairro(clienteToEdit?.endereco?.bairro || '');
        setCidade(clienteToEdit?.endereco?.cidade || '');
        setEstado(clienteToEdit?.endereco?.estado || '');
        setPais(clienteToEdit?.endereco?.pais || 'Brasil');
        
        // Contatos
        const principal = clienteToEdit?.contatos?.find(c => c.principal) || clienteToEdit?.contatos?.[0];
        setContatoNome(principal?.nome || '');
        setContatoCargo(principal?.cargo || 'Responsável Comercial');
        setContatoDepartamento(principal?.departamento || 'Diretoria');
        setContatoEmail(principal?.email || '');
        setContatoCelular(principal?.celular || '');
        setContatoTelefone(principal?.telefone || '');
        setContatoWhatsapp(principal?.whatsapp ?? true);

        // Carregar documentos estritamente vinculados a este cliente (Isolamento por ID)
        if (clienteToEdit?.id) {
          const docsFromClient: DocumentoAnexoLocal[] = (clienteToEdit as any)?.documentos || [];
          const todosDocs = dmsService.getDocumentos() || [];
          
          const docsDMS: DocumentoAnexoLocal[] = todosDocs.filter(
            d => d && (
                 d.clienteId === clienteToEdit.id || 
                 (Array.isArray(d.tags) && d.tags.includes(clienteToEdit.id))
            )
          ).map(d => ({
            id: d.id,
            nome: d.nome,
            tamanho: d.tamanho,
            tamanhoBytes: d.tamanhoBytes,
            dataUpload: d.dataUpload,
            urlConteudo: d.urlConteudo,
            categoria: d.categoria
          }));

          const mapDocs = new Map<string, DocumentoAnexoLocal>();
          docsFromClient.forEach((d: DocumentoAnexoLocal) => {
            if (d && d.id) mapDocs.set(d.id, d);
          });
          docsDMS.forEach((d: DocumentoAnexoLocal) => {
            if (d && d.id && !mapDocs.has(d.id)) mapDocs.set(d.id, d);
          });

          setDocumentosAnexados(Array.from(mapDocs.values()));
        } else {
          // Novo cliente começa sempre limpo, sem documentos de outros clientes
          setDocumentosAnexados([]);
        }

        // Carregar recorrência existente se houver
        if (clienteToEdit?.id) {
          const recExistente = recorrencias.find(r => r.clientId === clienteToEdit.id);
          if (recExistente) {
            setRecorrenciaHabilitada(true);
            setRecorrenciaId(recExistente.id);
            setRecorrenciaDescricao(recExistente.descricao || '');
            setRecorrenciaValor(String(recExistente.valor || ''));
            setRecorrenciaFrequencia(recExistente.frequencia || 'Mensal');
            setRecorrenciaDataInicio(recExistente.dataInicio || '');
            const calculatedDataFinal = recExistente.dataFim || recExistente.dataFinal || computeDataFinal(recExistente.dataInicio || '', String(recExistente.quantidade || ''), recExistente.frequencia || 'Mensal');
            setRecorrenciaDataFinal(calculatedDataFinal);
            setRecorrenciaDiaVencimento(String(recExistente.diaVencimento || '10'));
            setRecorrenciaQuantidade(recExistente.quantidade ? String(recExistente.quantidade) : '');
            setRecorrenciaStatus(recExistente.status || 'Ativa');
            setRecorrenciaObservacoes(recExistente.observacoes || '');
          } else {
            resetRecorrenciaFields(clienteToEdit?.nomeFantasia || clienteToEdit?.razaoSocial || '');
          }
        } else {
          resetRecorrenciaFields('');
        }
      }
    } else {
      hasInitializedRef.current = false;
    }
  }, [open, clienteToEdit?.id]);

  const resetRecorrenciaFields = (nome: string) => {
    const hoje = getBrasiliaTodayIso();
    setRecorrenciaHabilitada(false);
    setRecorrenciaId('');
    setRecorrenciaDescricao(nome ? `Mensalidade - ${nome}` : '');
    setRecorrenciaValor('');
    setRecorrenciaFrequencia('Mensal');
    setRecorrenciaDataInicio(hoje);
    setRecorrenciaDataFinal('');
    setRecorrenciaDiaVencimento('10');
    setRecorrenciaQuantidade('');
    setRecorrenciaStatus('Ativa');
    setRecorrenciaObservacoes('');
  };

  const handleDataInicioChange = (newDate: string) => {
    setRecorrenciaDataInicio(newDate);
    if (recorrenciaQuantidade) {
      setRecorrenciaDataFinal(computeDataFinal(newDate, recorrenciaQuantidade, recorrenciaFrequencia));
    }
  };

  const handleQuantidadeChange = (newQtd: string) => {
    setRecorrenciaQuantidade(newQtd);
    if (newQtd.trim() === '') {
      setRecorrenciaDataFinal('');
    } else {
      setRecorrenciaDataFinal(computeDataFinal(recorrenciaDataInicio, newQtd, recorrenciaFrequencia));
    }
  };

  const handleDataFinalChange = (newFinalDate: string) => {
    setRecorrenciaDataFinal(newFinalDate);
    if (newFinalDate.trim() === '') {
      setRecorrenciaQuantidade('');
    } else {
      setRecorrenciaQuantidade(computeQuantidadeFromDates(recorrenciaDataInicio, newFinalDate, recorrenciaFrequencia));
    }
  };

  const handleFrequenciaChange = (newFreq: FrequenciaRecorrencia) => {
    setRecorrenciaFrequencia(newFreq);
    if (recorrenciaQuantidade) {
      setRecorrenciaDataFinal(computeDataFinal(recorrenciaDataInicio, recorrenciaQuantidade, newFreq));
    }
  };

  // Busca Inteligente de CEP (ViaCEP)
  const handleBuscarCep = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      toast.error('Informe um CEP válido com 8 dígitos.');
      return;
    }

    setIsBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        toast.error('CEP não localizado na base dos Correios.');
      } else {
        setLogradouro(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setEstado(data.uf || '');
        setPais('Brasil');
        toast.success(`Endereço localizado: ${data.localidade} - ${data.uf}`);
      }
    } catch {
      toast.error('Erro ao consultar CEP.');
    } finally {
      setIsBuscandoCep(false);
    }
  };

  // Consulta Inteligente de CNPJ na base da Receita Federal com Multi-provedor e Fallback
  const handleConsultarCnpj = async (cnpjParam?: string) => {
    const inputEl = document.getElementById('doc') as HTMLInputElement | null;
    const currentVal = (typeof cnpjParam === 'string' ? cnpjParam : (inputEl?.value || documento || '')).trim();
    let cleanCnpj = currentVal.replace(/\D/g, '');
    if (cleanCnpj.length === 13) {
      cleanCnpj = '0' + cleanCnpj;
    }

    if (cleanCnpj.length !== 14) {
      toast.error('Informe um CNPJ válido com 14 dígitos numéricos para consultar.');
      return;
    }

    setDocumento(currentVal);
    setIsConsultandoCnpj(true);
    const toastId = toast.loading('Buscando dados da empresa na Receita Federal...');
    try {
      const data = await consultarCnpj(cleanCnpj);

      // 1. Atualizar documento formatado e tipo de pessoa
      const docFmt = data.cnpjFormatado || cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
      setDocumento(docFmt);
      if (inputEl) inputEl.value = docFmt;
      setTipoPessoa('pj');

      // 2. Razão Social e Nome Fantasia
      if (data.razaoSocial) setRazaoSocial(data.razaoSocial);
      if (data.nomeFantasia) {
        setNomeFantasia(data.nomeFantasia);
      } else if (data.razaoSocial) {
        setNomeFantasia(data.razaoSocial);
      }

      // 3. Informações societárias e fiscais
      if (data.dataAbertura) {
        setDataFundacao(data.dataAbertura);
      }
      if (data.cnaeDescricao) {
        setSegmento(data.cnaeDescricao);
      }
      if (data.porte) {
        const porteUpper = String(data.porte).toUpperCase();
        if (porteUpper.includes('MEI')) setPorte('MEI');
        else if (porteUpper.includes('MICRO') || porteUpper === 'ME' || porteUpper.includes('01')) setPorte('Micro');
        else if (porteUpper.includes('PEQUENO') || porteUpper.includes('EPP') || porteUpper.includes('03')) setPorte('Pequeno');
        else if (porteUpper.includes('GRANDE') || porteUpper.includes('DEMAIS')) setPorte('Grande');
        else setPorte('Médio');
      }

      // 4. Endereço completo
      if (data.cep) {
        setCep(data.cepFormatado || data.cep);
        setLogradouro(data.logradouro || '');
        setNumero(data.numero || '');
        setComplemento(data.complemento || '');
        setBairro(data.bairro || '');
        setCidade(data.municipio || '');
        setEstado(data.uf || '');
        setPais(data.pais || 'Brasil');
      }

      // 5. Contatos principais
      if (data.email && (!contatoEmail || contatoEmail.includes('exemplo'))) {
        setContatoEmail(data.email);
      }
      if (data.telefone && !contatoTelefone) {
        setContatoTelefone(data.telefone);
      }
      if (data.qsa && data.qsa.length > 0 && !contatoNome) {
        setContatoNome(data.qsa[0].nome);
      }

      toast.success(`CNPJ localizado: ${data.razaoSocial}`, { id: toastId });
    } catch (err: any) {
      console.error('Erro na consulta CNPJ:', err);
      toast.error(err.message || 'Não foi possível consultar o CNPJ automaticamente.', { id: toastId });
    } finally {
      setIsConsultandoCnpj(false);
    }
  };

  // Upload de Documentos com Salvamento Direto no DMS
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingDoc(true);

    const targetId = clienteToEdit?.id || currentClienteId || crypto.randomUUID();
    const targetNome = clienteNomeOficial || 'Cliente';

    Array.from(files).forEach((file) => {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
      const reader = new FileReader();

      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;

        // 1. Salvar no módulo Gestão de Documentos (DMS) na pasta do cliente
        const savedDoc = dmsService.uploadFileFromModule({
          nome: file.name,
          tamanho: `${sizeInMb} MB`,
          tamanhoBytes: file.size,
          moduloOrigem: 'Clientes',
          clienteId: targetId,
          clienteNome: targetNome,
          categoria: file.name.toLowerCase().includes('contrato') ? 'Contratos' : 'Documentos do Cliente',
          tags: ['Clientes', targetNome, targetId],
          urlConteudo: dataUrl,
        });

        // 2. Adicionar na listagem da aba
        const newLocalDoc: DocumentoAnexoLocal = {
          id: savedDoc.id,
          nome: file.name,
          tamanho: `${sizeInMb} MB`,
          tamanhoBytes: file.size,
          dataUpload: new Date().toISOString(),
          urlConteudo: dataUrl,
          categoria: savedDoc.categoria
        };

        setDocumentosAnexados(prev => {
          const filtered = prev.filter(p => p.id !== newLocalDoc.id);
          return [newLocalDoc, ...filtered];
        });

        toast.success(`Documento "${file.name}" anexado e salvo com sucesso!`);
        setIsUploadingDoc(false);
      };

      reader.onerror = () => {
        toast.error(`Erro ao carregar o arquivo "${file.name}".`);
        setIsUploadingDoc(false);
      };

      reader.readAsDataURL(file);
    });

    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveDoc = (docId: string) => {
    setDocumentosAnexados(prev => prev.filter(d => d.id !== docId));
    toast.info("Documento removido da lista do cliente.");
  };

  // Criação Rápida de Contrato Vinculado
  const handleCriarContratoRapido = () => {
    if (!contratoNome.trim()) {
      toast.error("Informe o título do contrato.");
      return;
    }

    const valTotal = parseFloat(contratoValorTotal) || 0;
    const valMensal = parseFloat(contratoMensalidade) || 0;
    const targetCliId = currentClienteId || crypto.randomUUID();
    const targetCliNome = clienteNomeOficial || 'Cliente';

    const novoContrato: Contrato = {
      id: `cnt-${Date.now()}`,
      codigo: `CTR-${Math.floor(1000 + Math.random() * 9000)}`,
      numeroContrato: `CTR-2026/${Math.floor(100 + Math.random() * 900)}`,
      nome: contratoNome.trim(),
      categoria: 'Receita',
      tipoServico: contratoTipo as any,
      entidadeVinculo: 'Cliente',
      clienteId: targetCliId,
      clienteNome: targetCliNome,
      valorTotal: valTotal,
      valorMensal: valMensal,
      dataInicio: contratoDataInicio,
      dataFim: contratoDataFim,
      status: 'Ativo',
      objetoContrato: `Prestação de serviços contínuos para ${targetCliNome}.`,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    addContrato(novoContrato);

    // Integrar e espelhar cópia no DMS
    dmsService.uploadFileFromModule({
      nome: `Contrato_${novoContrato.numeroContrato.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      moduloOrigem: 'Clientes',
      clienteId: targetCliId,
      clienteNome: targetCliNome,
      categoria: 'Contratos',
      tags: ['Contratos', novoContrato.codigo, targetCliNome],
    });

    toast.success(`Contrato "${novoContrato.nome}" criado e vinculado ao cliente com sucesso!`);
    setModalNovoContratoOpen(false);
    setContratoNome('');
    setContratoValorTotal('');
    setContratoMensalidade('');
  };

  const handleSave = async () => {
    const docInputEl = document.getElementById('doc') as HTMLInputElement | null;
    const razaoInputEl = document.getElementById('razao') as HTMLInputElement | null;
    const fantasiaInputEl = document.getElementById('fantasia') as HTMLInputElement | null;

    const docFinal = (docInputEl?.value || documento || '').trim();
    const razaoFinalTyped = (razaoInputEl?.value || razaoSocial || '').trim();
    const fantasiaFinalTyped = (fantasiaInputEl?.value || nomeFantasia || '').trim();

    if (!docFinal) {
      toast.error(tipoPessoa === 'pj' ? "O CNPJ é obrigatório!" : "O CPF é obrigatório!");
      return;
    }

    const nomeFinal = fantasiaFinalTyped || razaoFinalTyped || `Cliente ${docFinal}`;
    const razaoFinal = razaoFinalTyped || fantasiaFinalTyped || nomeFinal;

    setDocumento(docFinal);
    setRazaoSocial(razaoFinal);
    setNomeFantasia(nomeFinal);

    // Validações da Recorrência se habilitada
    if (recorrenciaHabilitada) {
      if (!recorrenciaDescricao) {
        toast.error("Informe a descrição/referência da recorrência.");
        return;
      }
      const valorNum = parseFloat(recorrenciaValor);
      if (isNaN(valorNum) || valorNum <= 0) {
        toast.error("O valor da recorrência deve ser maior que zero.");
        return;
      }
      if (!recorrenciaDataInicio) {
        toast.error("Informe a data de início da recorrência.");
        return;
      }
    }

    const clienteId = clienteToEdit?.id || crypto.randomUUID();
    const cleanEmail = (contatoEmail || '').trim();

    const clienteData = {
      id: clienteId,
      codigo: clienteToEdit?.codigo || `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
      tipo: tipoPessoa === 'pj' ? ('Pessoa Jurídica' as const) : ('Pessoa Física' as const),
      razaoSocial: razaoFinal,
      nomeFantasia: nomeFinal,
      documento: docFinal,
      inscricaoEstadual: ie.trim() || 'Isento',
      inscricaoMunicipal: im.trim() || undefined,
      dataFundacaoNascimento: dataFundacao || undefined,
      status: (statusCliente === 'Inativo' ? 'Inativo' : 'Ativo') as 'Ativo' | 'Inativo',
      segmento: segmento.trim() || 'Geral',
      porteEmpresa: porte || 'Médio',
      site: site.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      documentos: documentosAnexados,
      ultimaAtualizacao: new Date().toISOString(),
      endereco: {
        cep: cep.trim(),
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        estado: estado.trim(),
        pais: pais.trim() || 'Brasil'
      },
      contatos: [
        {
          id: contatoPrincipal?.id || crypto.randomUUID(),
          nome: contatoNome.trim() || 'Contato Principal',
          cargo: contatoCargo.trim() || 'Responsável',
          departamento: contatoDepartamento.trim() || 'Geral',
          celular: contatoCelular.trim() || '',
          telefone: contatoTelefone.trim() || undefined,
          whatsapp: contatoWhatsapp,
          email: cleanEmail,
          principal: true
        }
      ]
    };

    try {
      // 1. Salvar ou Atualizar Cliente
      if (clienteToEdit) {
        await saveCliente({
          ...clienteToEdit,
          ...clienteData,
        } as any);
      } else {
        const novoCliente: Cliente = {
          ...clienteData,
          dataCadastro: new Date().toISOString(),
        } as any;
        await saveCliente(novoCliente as any);
        
        notificar({
          titulo: `Novo Cliente Cadastrado (${novoCliente.nomeFantasia || novoCliente.razaoSocial})`,
          descricao: `Cliente ${novoCliente.tipo} registrado na base com documento ${novoCliente.documento}.`,
          origem: 'CRM',
          tipo: 'Sucesso',
          prioridade: 'Normal',
          targetUrl: '/clientes'
        });
      }

      // Auto-gerar/Garantir pasta no DMS
      try {
        dmsService.ensureClientFolder({
          id: clienteId,
          nomeFantasia: nomeFinal,
          razaoSocial: razaoFinal,
        });
      } catch {}

      // 2. Salvar/Atualizar Recorrência e Sincronizar Títulos Financeiros
      if (recorrenciaHabilitada) {
        const recId = recorrenciaId || `rec_${crypto.randomUUID()}`;
        const recExistente = recorrencias.find(r => r.id === recId || r.clientId === clienteId);
        
        const novaRecorrencia: RecorrenciaFinanceira = {
          id: recExistente?.id || recId,
          clientId: clienteId,
          clienteNome: nomeFinal,
          descricao: recorrenciaDescricao,
          valor: parseFloat(recorrenciaValor) || 0,
          frequencia: recorrenciaFrequencia,
          dataInicio: recorrenciaDataInicio,
          dataFim: recorrenciaDataFinal || undefined,
          dataFinal: recorrenciaDataFinal || undefined,
          proximaCobranca: recorrenciaDataInicio,
          diaVencimento: parseInt(recorrenciaDiaVencimento) || 10,
          quantidade: recorrenciaQuantidade ? parseInt(recorrenciaQuantidade) : undefined,
          status: recorrenciaStatus,
          observacoes: recorrenciaObservacoes,
          criadoEm: recExistente?.criadoEm || new Date().toISOString(),
          atualizadoEm: new Date().toISOString()
        };

        const novasRecorrencias = recExistente 
          ? recorrencias.map(r => r.id === novaRecorrencia.id ? novaRecorrencia : r)
          : [...recorrencias, novaRecorrencia];
        
        setAllRecorrencias(novasRecorrencias);

        if (novaRecorrencia.status === 'Ativa') {
          const novosTitulos = syncRecorrenciaTitulos(novaRecorrencia, titulos);
          setAllTitulos(novosTitulos);
        }
      }

      toast.success(clienteToEdit ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
      setOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      toast.error(`Não foi possível salvar o cliente: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  // Contratos vinculados a este cliente
  const contratosDoCliente = contratos.filter(
    c => c.clienteId === currentClienteId || 
         (clienteToEdit && (
           String(c.nome || (c as any).objetoContrato || (c as any).numeroContrato || '').toLowerCase().includes(clienteNomeOficial.toLowerCase()) || 
           c.clienteId === clienteToEdit.id
         ))
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children && (
        <SheetTrigger asChild>
          {children}
        </SheetTrigger>
      )}
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>{clienteToEdit ? 'Editar Cliente' : 'Cadastro de Cliente'}</SheetTitle>
          <SheetDescription>
            {clienteToEdit 
              ? 'Atualize os dados mestres, endereço completo, contatos, recorrência e documentos.' 
              : 'Este é o cadastro mestre. As informações salvas aqui refletirão em todo o sistema.'}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="gerais" className="mt-4">
          <TabsList className="grid grid-cols-3 sm:grid-cols-7 mb-4 h-auto p-1 gap-1">
            <TabsTrigger value="gerais" className="text-xs">Dados Gerais</TabsTrigger>
            <TabsTrigger value="endereco" className="text-xs">Endereço</TabsTrigger>
            <TabsTrigger value="contatos" className="text-xs">Contatos</TabsTrigger>
            <TabsTrigger value="financeiro" className="text-xs">Financeiro</TabsTrigger>
            <TabsTrigger value="contratos" className="text-xs font-semibold text-primary">
              Contratos ({contratosDoCliente.length})
            </TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs font-semibold text-orange-600">
              Documentos ({documentosAnexados.length})
            </TabsTrigger>
            <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
          </TabsList>

          {/* 1. DADOS GERAIS */}
          <TabsContent value="gerais" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Tipo de Pessoa *</Label>
                <Select value={tipoPessoa} onValueChange={(val) => {
                  setTipoPessoa(val);
                  if (val === 'pf' && !contatoNome && (nomeFantasia || razaoSocial)) {
                    setContatoNome(nomeFantasia || razaoSocial);
                  }
                }}>
                  <SelectTrigger className="font-medium"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pj">🏢 Pessoa Jurídica (Empresa)</SelectItem>
                    <SelectItem value="pf">👤 Pessoa Física (Individual / CPF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc" className="font-semibold">{tipoPessoa === 'pj' ? 'CNPJ *' : 'CPF *'}</Label>
                <div className="flex gap-2">
                  <Input 
                    id="doc" 
                    placeholder={tipoPessoa === 'pj' ? "00.000.000/0000-00" : "000.000.000-00"} 
                    value={documento}
                    onChange={e => setDocumento(e.target.value)}
                    onInput={e => setDocumento((e.target as HTMLInputElement).value)}
                    onBlur={e => {
                      const v = (e.target as HTMLInputElement).value;
                      if (v) setDocumento(v);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && tipoPessoa === 'pj') {
                        e.preventDefault();
                        handleConsultarCnpj();
                      }
                    }}
                    className="font-mono"
                  />
                  {tipoPessoa === 'pj' && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      disabled={isConsultandoCnpj}
                      onClick={() => handleConsultarCnpj()}
                      className="text-xs gap-1 shrink-0 font-medium hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      {isConsultandoCnpj ? 'Buscando...' : 'Buscar'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Status do Cliente</Label>
                <Select value={statusCliente} onValueChange={(v: any) => setStatusCliente(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {tipoPessoa === 'pf' ? (
              /* CAMPOS ESPECÍFICOS DE PESSOA FÍSICA */
              <div className="space-y-4 p-4 rounded-xl border bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/20">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <User className="w-4 h-4" /> Dados Pessoais do Cliente (Pessoa Física)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="razao" className="font-semibold">Nome Completo *</Label>
                    <Input 
                      id="razao" 
                      placeholder="Ex: Carlos Eduardo da Silva" 
                      value={razaoSocial}
                      onChange={e => {
                        setRazaoSocial(e.target.value);
                        if (!nomeFantasia || nomeFantasia === razaoSocial) {
                          setNomeFantasia(e.target.value);
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fantasia">Apelido / Como prefere ser chamado (Opcional)</Label>
                    <Input 
                      id="fantasia" 
                      placeholder="Ex: Edu, Cadu" 
                      value={nomeFantasia}
                      onChange={e => setNomeFantasia(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ie">RG / Documento de Identidade</Label>
                    <Input 
                      id="ie" 
                      placeholder="Ex: 12.345.678-9 SSP/SP" 
                      value={ie}
                      onChange={e => setIe(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataFundacao">Data de Nascimento</Label>
                    <Input 
                      id="dataFundacao" 
                      type="date"
                      value={dataFundacao}
                      onChange={e => setDataFundacao(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="segmento">Profissão / Ocupação</Label>
                    <Input 
                      id="segmento" 
                      placeholder="Ex: Consultor, Arquiteto, Médico, Dev" 
                      value={segmento}
                      onChange={e => setSegmento(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* CAMPOS ESPECÍFICOS DE PESSOA JURÍDICA */
              <div className="space-y-4 p-4 rounded-xl border bg-blue-500/5 dark:bg-blue-950/20 border-blue-500/20">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                  <Building className="w-4 h-4" /> Dados Empresariais (Pessoa Jurídica)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="razao" className="font-semibold">Razão Social *</Label>
                    <Input 
                      id="razao" 
                      placeholder="Ex: Focus Tecnologia da Informação Ltda" 
                      value={razaoSocial}
                      onChange={e => setRazaoSocial(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fantasia">Nome Fantasia</Label>
                    <Input 
                      id="fantasia" 
                      placeholder="Ex: Focus ERP" 
                      value={nomeFantasia}
                      onChange={e => setNomeFantasia(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ie">Inscrição Estadual</Label>
                    <Input 
                      id="ie" 
                      placeholder="Isento ou Nº" 
                      value={ie}
                      onChange={e => setIe(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="im">Inscrição Municipal</Label>
                    <Input 
                      id="im" 
                      placeholder="Nº Inscrição Municipal" 
                      value={im}
                      onChange={e => setIm(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataFundacao">Data de Fundação</Label>
                    <Input 
                      id="dataFundacao" 
                      type="date"
                      value={dataFundacao}
                      onChange={e => setDataFundacao(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="segmento">Segmento / Ramo de Atividade</Label>
                    <Input 
                      id="segmento" 
                      placeholder="Ex: Tecnologia, Varejo, Serviços" 
                      value={segmento}
                      onChange={e => setSegmento(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="porte">Porte da Empresa</Label>
                    <Select value={porte} onValueChange={setPorte}>
                      <SelectTrigger id="porte"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEI">MEI</SelectItem>
                        <SelectItem value="Micro">Microempresa (ME)</SelectItem>
                        <SelectItem value="Pequeno">Pequeno Porte (EPP)</SelectItem>
                        <SelectItem value="Médio">Médio Porte</SelectItem>
                        <SelectItem value="Grande">Grande Porte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="site">Website / Domínio</Label>
                    <Input 
                      id="site" 
                      placeholder="https://suaempresa.com.br" 
                      value={site}
                      onChange={e => setSite(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="obs">Observações Internas / Comerciais</Label>
              <Textarea 
                id="obs"
                placeholder="Observações importantes, particularidades contratuais, canais de atendimento..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                className="min-h-[80px] text-xs"
              />
            </div>
          </TabsContent>

          {/* 2. ENDEREÇO COMPLETO */}
          <TabsContent value="endereco" className="space-y-4">
            <div className="p-4 border rounded-lg bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  {tipoPessoa === 'pf' ? 'Endereço Residencial / Cobrança' : 'Localização e Endereço Corporativo'}
                </h4>
                <Badge variant="outline" className="text-xs">Busca Automática via CEP</Badge>
              </div>

              {/* Linha 1: CEP + Busca */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP *</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="cep" 
                      placeholder="00000-000" 
                      value={cep}
                      onChange={e => setCep(e.target.value)}
                    />
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm" 
                      onClick={handleBuscarCep}
                      disabled={isBuscandoCep}
                      className="gap-1 px-3 text-xs"
                    >
                      <Search className="w-3.5 h-3.5" />
                      {isBuscandoCep ? 'Buscando...' : 'Buscar'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="logradouro">Logradouro / Rua *</Label>
                  <Input 
                    id="logradouro" 
                    placeholder="Ex: Avenida Paulista" 
                    value={logradouro}
                    onChange={e => setLogradouro(e.target.value)}
                  />
                </div>
              </div>

              {/* Linha 2: Número, Complemento, Bairro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número *</Label>
                  <Input 
                    id="numero" 
                    placeholder="Ex: 1000" 
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input 
                    id="complemento" 
                    placeholder={tipoPessoa === 'pf' ? "Ex: Apto 42, Bloco B" : "Ex: Sala 402, Andar 4"} 
                    value={complemento}
                    onChange={e => setComplemento(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input 
                    id="bairro" 
                    placeholder="Ex: Bela Vista" 
                    value={bairro}
                    onChange={e => setBairro(e.target.value)}
                  />
                </div>
              </div>

              {/* Linha 3: Cidade, UF, País */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input 
                    id="cidade" 
                    placeholder="Ex: São Paulo" 
                    value={cidade}
                    onChange={e => setCidade(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uf">Estado (UF) *</Label>
                  <Input 
                    id="uf" 
                    placeholder="Ex: SP" 
                    maxLength={2}
                    value={estado}
                    onChange={e => setEstado(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pais">País</Label>
                  <Input 
                    id="pais" 
                    placeholder="Brasil" 
                    value={pais}
                    onChange={e => setPais(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 3. CONTATOS */}
          <TabsContent value="contatos" className="space-y-4">
            <div className="p-4 border rounded-lg bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-600" />
                  {tipoPessoa === 'pf' ? 'Canais de Contato Direto do Cliente' : 'Contato Principal & Interlocutores Corporativos'}
                </h4>
                <Badge variant="outline" className="text-xs">{tipoPessoa === 'pf' ? 'Contato Individual' : 'Responsável'}</Badge>
              </div>

              {tipoPessoa === 'pf' ? (
                /* CONTATO DIRETO PESSOA FÍSICA */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="c-celular">Celular / WhatsApp *</Label>
                    <Input 
                      id="c-celular" 
                      placeholder="(11) 99999-9999" 
                      value={contatoCelular}
                      onChange={e => setContatoCelular(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="c-email">E-mail de Contato</Label>
                    <Input 
                      id="c-email" 
                      type="email" 
                      placeholder="seuemail@exemplo.com" 
                      value={contatoEmail}
                      onChange={e => setContatoEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="c-tel">Telefone Alternativo</Label>
                    <Input 
                      id="c-tel" 
                      placeholder="(11) 3000-0000" 
                      value={contatoTelefone}
                      onChange={e => setContatoTelefone(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                /* CONTATOS CORPORATIVOS PJ */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="c-nome">Nome Completo *</Label>
                      <Input 
                        id="c-nome" 
                        placeholder="Ex: João da Silva" 
                        value={contatoNome}
                        onChange={e => setContatoNome(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="c-cargo">Cargo / Função</Label>
                      <Input 
                        id="c-cargo" 
                        placeholder="Ex: Gerente de TI / Diretor" 
                        value={contatoCargo}
                        onChange={e => setContatoCargo(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="c-depto">Departamento</Label>
                      <Input 
                        id="c-depto" 
                        placeholder="Ex: Tecnologia, Financeiro" 
                        value={contatoDepartamento}
                        onChange={e => setContatoDepartamento(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="c-email">E-mail Corporativo</Label>
                      <Input 
                        id="c-email" 
                        type="email" 
                        placeholder="contato@empresa.com" 
                        value={contatoEmail}
                        onChange={e => setContatoEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="c-celular">Celular / WhatsApp *</Label>
                      <Input 
                        id="c-celular" 
                        placeholder="(11) 99999-9999" 
                        value={contatoCelular}
                        onChange={e => setContatoCelular(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="c-tel">Telefone Fixo</Label>
                      <Input 
                        id="c-tel" 
                        placeholder="(11) 3000-0000" 
                        value={contatoTelefone}
                        onChange={e => setContatoTelefone(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* 4. FINANCEIRO */}
          <TabsContent value="financeiro" className="space-y-4">
            <div className="border rounded-lg p-5 space-y-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-orange-600" />
                    Contrato Recorrente / Mensalidade
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Geração automática de títulos no Contas a Receber
                  </p>
                </div>
                <Switch 
                  checked={recorrenciaHabilitada}
                  onCheckedChange={setRecorrenciaHabilitada}
                />
              </div>

              {recorrenciaHabilitada && (
                <div className="space-y-4 pt-3 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rec-desc">Descrição do Serviço *</Label>
                      <Input 
                        id="rec-desc" 
                        placeholder="Ex: Mensalidade Software ERP" 
                        value={recorrenciaDescricao} 
                        onChange={e => setRecorrenciaDescricao(e.target.value)} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rec-val">Valor Recorrente (R$) *</Label>
                      <Input 
                        id="rec-val" 
                        type="number" 
                        step="0.01" 
                        placeholder="0,00" 
                        value={recorrenciaValor} 
                        onChange={e => setRecorrenciaValor(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rec-freq">Frequência *</Label>
                      <Select 
                        value={recorrenciaFrequencia} 
                        onValueChange={handleFrequenciaChange}
                      >
                        <SelectTrigger id="rec-freq">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mensal">Mensal</SelectItem>
                          <SelectItem value="Trimestral">Trimestral</SelectItem>
                          <SelectItem value="Semestral">Semestral</SelectItem>
                          <SelectItem value="Anual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rec-ini">Data de Início *</Label>
                      <Input 
                        id="rec-ini" 
                        type="date" 
                        value={recorrenciaDataInicio} 
                        onChange={e => handleDataInicioChange(e.target.value)} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rec-fim">Data Final</Label>
                      <Input 
                        id="rec-fim" 
                        type="date" 
                        value={recorrenciaDataFinal} 
                        onChange={e => handleDataFinalChange(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rec-dia">Dia do Vencimento</Label>
                      <Input 
                        id="rec-dia" 
                        type="number" 
                        min="1" 
                        max="31" 
                        placeholder="Ex: 10" 
                        value={recorrenciaDiaVencimento} 
                        onChange={e => setRecorrenciaDiaVencimento(e.target.value)} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rec-qtd">Quantidade de Meses (Vazia = Indefinida)</Label>
                      <Input 
                        id="rec-qtd" 
                        type="number" 
                        placeholder="Indefinida" 
                        value={recorrenciaQuantidade} 
                        onChange={e => handleQuantidadeChange(e.target.value)} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rec-status">Status *</Label>
                      <Select 
                        value={recorrenciaStatus} 
                        onValueChange={(v: StatusRecorrencia) => setRecorrenciaStatus(v)}
                      >
                        <SelectTrigger id="rec-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativa">Ativa</SelectItem>
                          <SelectItem value="Pausada">Pausada</SelectItem>
                          <SelectItem value="Encerrada">Encerrada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-md text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-xs text-blue-950 dark:text-blue-200">Regra de Faturamento Recorrente:</p>
                      <p className="text-[11px] text-blue-700/90 dark:text-blue-300/80 mt-0.5">
                        Este contrato programa cobranças e gera o título com status <strong>Pendente</strong> no Contas a Receber. O valor <strong>somente entrará no Fluxo de Caixa Realizado</strong> e no saldo após o registro da baixa do título.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 5. CONTRATOS INTEGRADOS */}
          <TabsContent value="contratos" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Contratos Vinculados</h4>
                <p className="text-xs text-muted-foreground">Espelhamento em tempo real com o módulo Contratos & DMS</p>
              </div>
              <Button 
                type="button" 
                size="sm" 
                onClick={() => setModalNovoContratoOpen(true)}
                className="gap-1.5 text-xs bg-primary text-primary-foreground"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Contrato
              </Button>
            </div>

            {contratosDoCliente.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Nenhum contrato ativo vinculado a este cliente.
              </div>
            ) : (
              <div className="space-y-2">
                {contratosDoCliente.map(c => (
                  <div key={c.id} className="p-3 border rounded-lg bg-card flex items-center justify-between text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">{c.nome}</span>
                        <Badge variant="outline" className="text-[10px]">{c.numeroContrato}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {c.tipoServico} • R$ {(c.valorTotal || (c as any).valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <Badge className={c.status === 'Ativo' ? 'bg-emerald-600' : 'bg-slate-500'}>
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 6. DOCUMENTOS ANEXADOS INTEGRADOS AO DMS */}
          <TabsContent value="documentos" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Documentos & Anexos</h4>
                <p className="text-xs text-muted-foreground">Salvos automaticamente na pasta <code className="text-primary">/Clientes/{clienteNomeOficial}</code> do DMS</p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  disabled={isUploadingDoc}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> 
                  {isUploadingDoc ? 'Enviando...' : 'Anexar Documento'}
                </Button>
              </div>
            </div>

            {documentosAnexados.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40 text-orange-500" />
                Nenhum documento anexado ainda. Anexe propostas, contratos assinados, documentos cadastrais ou fotos.
              </div>
            ) : (
              <div className="space-y-2">
                {documentosAnexados.map(d => (
                  <div key={d.id} className="p-3 border rounded-lg bg-card flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-orange-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{d.nome}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {d.tamanho} • {new Date(d.dataUpload).toLocaleDateString('pt-BR')} • {d.categoria || 'Geral'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {d.urlConteudo && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" asChild>
                          <a href={d.urlConteudo} download={d.nome}>
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => handleRemoveDoc(d.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 7. HISTÓRICO */}
          <TabsContent value="historico" className="space-y-4 text-xs">
            <div className="border rounded-lg p-4 bg-muted/10 space-y-2">
              <h4 className="font-semibold text-sm">Trilha de Auditoria</h4>
              <p className="text-muted-foreground">Registro automático de alterações e conformidade do cliente.</p>
              <div className="pt-2 text-muted-foreground space-y-1 font-mono text-[11px]">
                <div>• Cadastro Inicial: {clienteToEdit ? new Date(clienteToEdit.dataCadastro || '').toLocaleDateString('pt-BR') : 'Será gerado agora'}</div>
                <div>• Última Atualização: {clienteToEdit ? new Date(clienteToEdit.ultimaAtualizacao || '').toLocaleDateString('pt-BR') : 'Novo registro'}</div>
                <div>• Status Atual: <Badge variant="outline" className="text-[10px]">{statusCliente}</Badge></div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <SheetFooter className="mt-6 flex flex-row items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} className="text-xs">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="text-xs bg-orange-600 hover:bg-orange-700 text-white">
            {clienteToEdit ? 'Atualizar Cliente' : 'Salvar Cliente'}
          </Button>
        </SheetFooter>

        {/* Modal Rápido de Novo Contrato Vinculado */}
        <Dialog open={modalNovoContratoOpen} onOpenChange={setModalNovoContratoOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Novo Contrato para {clienteNomeOficial}</DialogTitle>
              <DialogDescription className="text-xs">
                O contrato será gerado e espelhado automaticamente no módulo DMS.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label>Título / Objeto do Contrato *</Label>
                <Input 
                  placeholder="Ex: Contrato de Manutenção e Suporte 2026"
                  value={contratoNome}
                  onChange={e => setContratoNome(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Tipo de Serviço</Label>
                  <Select value={contratoTipo} onValueChange={setContratoTipo}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Desenvolvimento de Software">Software</SelectItem>
                      <SelectItem value="Consultoria">Consultoria</SelectItem>
                      <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                      <SelectItem value="Licenciamento SaaS">SaaS</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Valor Total (R$)</Label>
                  <Input 
                    type="number"
                    placeholder="0,00"
                    value={contratoValorTotal}
                    onChange={e => setContratoValorTotal(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Data Início</Label>
                  <Input 
                    type="date"
                    value={contratoDataInicio}
                    onChange={e => setContratoDataInicio(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data Fim</Label>
                  <Input 
                    type="date"
                    value={contratoDataFim}
                    onChange={e => setContratoDataFim(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setModalNovoContratoOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCriarContratoRapido} className="text-xs bg-orange-600 hover:bg-orange-700 text-white">
                Vincular Contrato
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
