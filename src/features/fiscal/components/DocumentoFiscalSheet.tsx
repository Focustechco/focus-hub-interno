import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Percent, 
  Scissors, 
  Paperclip, 
  Link2, 
  History, 
  Save, 
  UploadCloud, 
  Plus, 
  Trash2, 
  Eye, 
  Download, 
  Briefcase, 
  Users, 
  Wallet, 
  Building2, 
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

import { DocumentoFiscal, TipoDocumentoFiscal, StatusDocumentoFiscal, ImpostoDocumento, RetencaoDocumento, AnexoDocumento } from '../types';
import { useFiscalStore } from '../hooks/useFiscalStore';
import { useLocalStorageState } from '@/hooks/useDataStore';
import { Cliente } from '@/features/clientes/types';
import { Projeto } from '@/features/projetos/types';
import { Contrato } from '@/features/contratos/types';

interface DocumentoFiscalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoParaEditar?: DocumentoFiscal | null;
}

export function DocumentoFiscalSheet({ open, onOpenChange, documentoParaEditar }: DocumentoFiscalSheetProps) {
  const { saveDocumentoAndSyncDMS } = useFiscalStore();

  const { data: clientes } = useLocalStorageState<Cliente>('focus_clientes', []);
  const { data: projetos } = useLocalStorageState<Projeto>('focus_projetos', []);
  const { data: contratos } = useLocalStorageState<Contrato>('focus_contratos', []);

  // Form State
  const [tipo, setTipo] = useState<TipoDocumentoFiscal>('NFS-e');
  const [numero, setNumero] = useState('');
  const [serie, setSerie] = useState('1');
  const [chaveAcesso, setChaveAcesso] = useState('');
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
  
  const [entidadeTipo, setEntidadeTipo] = useState<'Cliente' | 'Fornecedor' | 'Interno'>('Cliente');
  const [entidadeId, setEntidadeId] = useState('');
  const [entidadeNome, setEntidadeNome] = useState('');
  const [entidadeCnpjCpf, setEntidadeCnpjCpf] = useState('');

  const [projetoId, setProjetoId] = useState('');
  const [contratoId, setContratoId] = useState('');
  const [centroCusto, setCentroCusto] = useState('Geral / Operações');

  const [valorTotal, setValorTotal] = useState<number>(0);
  const [status, setStatus] = useState<StatusDocumentoFiscal>('Emitido');
  const [observacoes, setObservacoes] = useState('');

  const [impostos, setImpostos] = useState<ImpostoDocumento[]>([]);
  const [retencoes, setRetencoes] = useState<RetencaoDocumento[]>([]);
  const [anexos, setAnexos] = useState<AnexoDocumento[]>([]);

  const [uploadedDataUrl, setUploadedDataUrl] = useState<string>('');

  // Carregar dados para edição ou resetar para novo
  useEffect(() => {
    if (documentoParaEditar) {
      setTipo(documentoParaEditar.tipo);
      setNumero(documentoParaEditar.numero);
      setSerie(documentoParaEditar.serie || '1');
      setChaveAcesso(documentoParaEditar.chaveAcesso || '');
      setDataEmissao(documentoParaEditar.dataEmissao ? documentoParaEditar.dataEmissao.split('T')[0] : new Date().toISOString().split('T')[0]);
      setDataEntrada(documentoParaEditar.dataEntrada ? documentoParaEditar.dataEntrada.split('T')[0] : new Date().toISOString().split('T')[0]);
      
      setEntidadeTipo(documentoParaEditar.entidade.tipo);
      setEntidadeId(documentoParaEditar.entidade.id);
      setEntidadeNome(documentoParaEditar.entidade.nome);
      setEntidadeCnpjCpf(documentoParaEditar.entidade.cnpjCpf);

      setProjetoId(documentoParaEditar.vinculos?.projetoId || '');
      setContratoId(documentoParaEditar.vinculos?.contratoId || '');
      setCentroCusto(documentoParaEditar.vinculos?.centroCusto || 'Geral / Operações');

      setValorTotal(documentoParaEditar.valorTotal);
      setStatus(documentoParaEditar.status);
      setObservacoes(documentoParaEditar.observacoes || '');

      setImpostos(documentoParaEditar.impostos || []);
      setRetencoes(documentoParaEditar.retencoes || []);
      setAnexos(documentoParaEditar.anexos || []);
    } else {
      // Form limpo para nova emissão
      setTipo('NFS-e');
      setNumero(`${Math.floor(1000 + Math.random() * 9000)}`);
      setSerie('1');
      setChaveAcesso(`3526${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`);
      setDataEmissao(new Date().toISOString().split('T')[0]);
      setDataEntrada(new Date().toISOString().split('T')[0]);
      
      if (clientes.length > 0) {
        setEntidadeTipo('Cliente');
        setEntidadeId(clientes[0].id);
        setEntidadeNome(clientes[0].nomeFantasia || clientes[0].razaoSocial);
        setEntidadeCnpjCpf(clientes[0].documento || '');
      } else {
        setEntidadeTipo('Cliente');
        setEntidadeId('cli-default');
        setEntidadeNome('TechServices Brasil Ltda');
        setEntidadeCnpjCpf('12.345.678/0001-90');
      }

      setProjetoId('');
      setContratoId('');
      setCentroCusto('Tecnologia / Operações');

      setValorTotal(2500.00);
      setStatus('Emitido');
      setObservacoes('');

      setImpostos([
        { id: 'imp-1', tipo: 'ISS', baseCalculo: 2500.00, aliquota: 5.0, valor: 125.00 }
      ]);
      setRetencoes([]);
      setAnexos([]);
      setUploadedDataUrl('');
    }
  }, [documentoParaEditar, open]);

  // Manipulador de upload de arquivo real (PDF / XML / Imagem)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeFormatted = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedDataUrl(dataUrl);

      const novoAnexo: AnexoDocumento = {
        id: `anx-${Date.now()}`,
        nome: file.name,
        extensao: fileExt,
        tamanho: sizeFormatted,
        dataUpload: new Date().toISOString(),
        usuario: 'Usuário Administrador',
        url: dataUrl
      };

      setAnexos(prev => [...prev, novoAnexo]);
      toast.success(`Arquivo ${file.name} anexado com sucesso!`);
    };

    reader.readAsDataURL(file);
  };

  const handleAddImposto = () => {
    const base = valorTotal || 1000;
    const novo: ImpostoDocumento = {
      id: `imp-${Date.now()}`,
      tipo: 'PIS',
      baseCalculo: base,
      aliquota: 0.65,
      valor: Number((base * 0.0065).toFixed(2))
    };
    setImpostos(prev => [...prev, novo]);
  };

  const handleRemoveImposto = (id: string) => {
    setImpostos(prev => prev.filter(i => i.id !== id));
  };

  const handleAddRetencao = () => {
    const base = valorTotal || 1000;
    const nova: RetencaoDocumento = {
      id: `ret-${Date.now()}`,
      tipo: 'IRRF',
      percentual: 1.5,
      valor: Number((base * 0.015).toFixed(2)),
      responsavel: 'Tomador'
    };
    setRetencoes(prev => [...prev, nova]);
  };

  const handleRemoveRetencao = (id: string) => {
    setRetencoes(prev => prev.filter(r => r.id !== id));
  };

  const handleRemoveAnexo = (id: string) => {
    setAnexos(prev => prev.filter(a => a.id !== id));
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleSave = () => {
    if (!numero) {
      toast.error('Por favor, informe o número da Nota Fiscal.');
      return;
    }

    const projetoSelecionado = projetos.find(p => p.id === projetoId);
    const contratoSelecionado = contratos.find(c => c.id === contratoId);

    const docFinal: DocumentoFiscal = {
      id: documentoParaEditar ? documentoParaEditar.id : crypto.randomUUID(),
      tipo,
      numero,
      serie,
      chaveAcesso,
      dataEmissao,
      dataEntrada,
      entidade: {
        tipo: entidadeTipo,
        id: entidadeId || 'cli-001',
        nome: entidadeNome || 'Cliente / Fornecedor',
        cnpjCpf: entidadeCnpjCpf || ''
      },
      vinculos: {
        projetoId: projetoId || undefined,
        projetoNome: projetoSelecionado?.nome,
        contratoId: contratoId || undefined,
        contratoNome: contratoSelecionado?.numero || contratoSelecionado?.titulo,
        centroCusto
      },
      valorTotal: Number(valorTotal),
      observacoes,
      impostos,
      retencoes,
      anexos,
      historico: [
        ...(documentoParaEditar?.historico || []),
        {
          id: `hist-${Date.now()}`,
          dataHora: new Date().toISOString(),
          usuario: 'Usuário Administrador',
          acao: documentoParaEditar ? 'Alteração de Registro' : 'Emissão e Registro Fiscal',
          detalhes: `Documento Fiscal ${tipo} nº ${numero} processado e enviado ao cofre DMS.`
        }
      ],
      status,
      dataAtualizacao: new Date().toISOString()
    };

    // Salvar localmente e enviar pro Módulo de Documentos (DMS)
    saveDocumentoAndSyncDMS(docFinal, uploadedDataUrl);

    toast.success(`Documento Fiscal ${tipo} nº ${numero} salvo e armazenado no Módulo de Documentos (DMS)!`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[850px] w-[92vw] p-0 flex flex-col h-full border-l shadow-2xl">
        
        {/* Header Corporativo */}
        <div className="px-6 py-4 border-b shrink-0 flex items-center justify-between bg-gradient-to-r from-orange-500/10 via-background to-background">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              {documentoParaEditar ? `Editar Documento Fiscal Nº ${documentoParaEditar.numero}` : 'Novo Documento / Emissão Fiscal'}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Cadastro centralizado de notas fiscais (NFS-e, NF-e, CT-e) com validação e arquivamento no DMS.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Abas de Configuração */}
        <Tabs defaultValue="gerais" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-3 shrink-0 border-b bg-muted/20">
            <TabsList className="w-full justify-start border-none h-auto p-0 bg-transparent gap-4 overflow-x-auto scrollbar-hide">
              <TabsTrigger value="gerais" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:text-orange-600 rounded-none px-2 pb-2.5 pt-0 gap-2 text-xs">
                <FileText className="w-3.5 h-3.5" /> Dados Gerais
              </TabsTrigger>
              <TabsTrigger value="impostos" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:text-orange-600 rounded-none px-2 pb-2.5 pt-0 gap-2 text-xs">
                <Percent className="w-3.5 h-3.5" /> Impostos ({impostos.length})
              </TabsTrigger>
              <TabsTrigger value="retencoes" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:text-orange-600 rounded-none px-2 pb-2.5 pt-0 gap-2 text-xs">
                <Scissors className="w-3.5 h-3.5" /> Retenções ({retencoes.length})
              </TabsTrigger>
              <TabsTrigger value="documentos" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:text-orange-600 rounded-none px-2 pb-2.5 pt-0 gap-2 text-xs">
                <Paperclip className="w-3.5 h-3.5" /> Anexos / Upload ({anexos.length})
              </TabsTrigger>
              <TabsTrigger value="vinculos" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:text-orange-600 rounded-none px-2 pb-2.5 pt-0 gap-2 text-xs">
                <Link2 className="w-3.5 h-3.5" /> Vínculos & Projetos
              </TabsTrigger>
              <TabsTrigger value="historico" className="data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:text-orange-600 rounded-none px-2 pb-2.5 pt-0 gap-2 text-xs">
                <History className="w-3.5 h-3.5" /> Auditoria
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            
            {/* 1. DADOS GERAIS */}
            <TabsContent value="gerais" className="mt-0 space-y-5 outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Tipo de Documento Fiscal</Label>
                  <Select value={tipo} onValueChange={(val: any) => setTipo(val)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NFS-e">NFS-e (Nota Fiscal de Serviço Eletrônica)</SelectItem>
                      <SelectItem value="NF-e">NF-e (Nota Fiscal de Produto / Mercadoria)</SelectItem>
                      <SelectItem value="CT-e">CT-e (Conhecimento de Transporte)</SelectItem>
                      <SelectItem value="Fatura">Fatura Commercial / Internacional</SelectItem>
                      <SelectItem value="Recibo">Recibo / Comprovante Fiscal</SelectItem>
                      <SelectItem value="Outro">Outro Documento Tributável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Número da Nota *</Label>
                    <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Ex: 45892" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Série</Label>
                    <Input value={serie} onChange={e => setSerie(e.target.value)} placeholder="1" />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-semibold">Chave de Acesso (44 dígitos NFe / CTe)</Label>
                  <Input value={chaveAcesso} onChange={e => setChaveAcesso(e.target.value)} className="font-mono text-xs" placeholder="35240112345678901234550010002024001123456789" />
                </div>

                <div className="space-y-2 md:col-span-2 border p-3 rounded-lg bg-muted/20">
                  <Label className="text-xs font-semibold text-primary">Entidade Vinculada (Cliente ou Fornecedor)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <Select value={entidadeId} onValueChange={(val) => {
                      const c = clientes.find(item => item.id === val);
                      if (c) {
                        setEntidadeId(c.id);
                        setEntidadeNome(c.nomeFantasia || c.razaoSocial);
                        setEntidadeCnpjCpf(c.documento || '');
                        setEntidadeTipo('Cliente');
                      } else {
                        setEntidadeId(val);
                      }
                    }}>
                      <SelectTrigger className="sm:col-span-2"><SelectValue placeholder="Selecione um Cliente registrado..." /></SelectTrigger>
                      <SelectContent>
                        {clientes.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            Cliente: {c.nomeFantasia || c.razaoSocial} ({c.documento || 'CNPJ'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input value={entidadeCnpjCpf} onChange={e => setEntidadeCnpjCpf(e.target.value)} placeholder="CNPJ / CPF" className="font-mono text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Data de Emissão</Label>
                    <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Data de Entrada / Competência</Label>
                    <Input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Valor Total Bruto (R$) *</Label>
                  <Input type="number" step="0.01" value={valorTotal} onChange={e => setValorTotal(parseFloat(e.target.value) || 0)} className="font-semibold text-emerald-600" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Status Fiscal</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Emitido">Emitido</SelectItem>
                      <SelectItem value="Recebido">Recebido</SelectItem>
                      <SelectItem value="Conferido">Conferido</SelectItem>
                      <SelectItem value="Vinculado">Vinculado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-semibold">Observações Internas / Descrição dos Serviços</Label>
                  <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações do documento fiscal, dados bancários ou retenções..." rows={3} className="resize-none text-xs" />
                </div>

              </div>
            </TabsContent>

            {/* 2. IMPOSTOS */}
            <TabsContent value="impostos" className="mt-0 space-y-4 outline-none">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold">Tributos Destacados na Nota</h4>
                  <p className="text-xs text-muted-foreground">Apuração de ISS, PIS, COFINS, ICMS, IRPJ e CSLL.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddImposto} className="gap-1.5 h-8 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Adicionar Imposto
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Tributo</TableHead>
                      <TableHead>Base de Cálculo (R$)</TableHead>
                      <TableHead>Alíquota (%)</TableHead>
                      <TableHead className="text-right">Valor Imposto (R$)</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {impostos.map((imp, idx) => (
                      <TableRow key={imp.id}>
                        <TableCell>
                          <Input 
                            value={imp.tipo} 
                            onChange={e => {
                              const val = e.target.value;
                              setImpostos(prev => prev.map((item, i) => i === idx ? { ...item, tipo: val } : item));
                            }} 
                            className="h-8 w-24 text-xs font-bold" 
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={imp.baseCalculo} 
                            onChange={e => {
                              const base = parseFloat(e.target.value) || 0;
                              setImpostos(prev => prev.map((item, i) => i === idx ? { ...item, baseCalculo: base, valor: Number((base * (item.aliquota / 100)).toFixed(2)) } : item));
                            }} 
                            className="h-8 text-xs font-mono" 
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            step="0.01" 
                            value={imp.aliquota} 
                            onChange={e => {
                              const aliq = parseFloat(e.target.value) || 0;
                              setImpostos(prev => prev.map((item, i) => i === idx ? { ...item, aliquota: aliq, valor: Number((item.baseCalculo * (aliq / 100)).toFixed(2)) } : item));
                            }} 
                            className="h-8 text-xs font-mono" 
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold text-amber-600 text-xs">
                          {formatCurrency(imp.valor)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveImposto(imp.id)} className="h-7 w-7 text-rose-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {impostos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                          Nenhum imposto destacado. Clique em "Adicionar Imposto".
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 3. RETENÇÕES */}
            <TabsContent value="retencoes" className="mt-0 space-y-4 outline-none">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold">Retenções na Fonte</h4>
                  <p className="text-xs text-muted-foreground">Retenção de IRRF, INSS, CSLL, PIS, COFINS pelo tomador.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddRetencao} className="gap-1.5 h-8 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Adicionar Retenção
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Tipo de Retenção</TableHead>
                      <TableHead>Alíquota (%)</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="text-right">Valor Retido (R$)</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retencoes.map((ret, idx) => (
                      <TableRow key={ret.id}>
                        <TableCell>
                          <Input 
                            value={ret.tipo} 
                            onChange={e => {
                              const val = e.target.value;
                              setRetencoes(prev => prev.map((item, i) => i === idx ? { ...item, tipo: val } : item));
                            }} 
                            className="h-8 w-24 text-xs font-bold" 
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            step="0.01" 
                            value={ret.percentual} 
                            onChange={e => {
                              const p = parseFloat(e.target.value) || 0;
                              setRetencoes(prev => prev.map((item, i) => i === idx ? { ...item, percentual: p, valor: Number((valorTotal * (p / 100)).toFixed(2)) } : item));
                            }} 
                            className="h-8 text-xs font-mono" 
                          />
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={ret.responsavel} 
                            onValueChange={(val: any) => {
                              setRetencoes(prev => prev.map((item, i) => i === idx ? { ...item, responsavel: val } : item));
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Tomador">Tomador (Cliente)</SelectItem>
                              <SelectItem value="Prestador">Prestador (Empresa)</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-rose-600 text-xs">
                          {formatCurrency(ret.valor)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveRetencao(ret.id)} className="h-7 w-7 text-rose-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {retencoes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                          Nenhuma retenção registrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 4. ANEXOS / UPLOAD DE NOTA FISCAL (COM SYNC AUTOMÁTICO COM DMS) */}
            <TabsContent value="documentos" className="mt-0 space-y-4 outline-none">
              <div className="border-2 border-dashed border-orange-500/40 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-orange-500/5 hover:bg-orange-500/10 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".pdf,.xml,.png,.jpg,.docx,.xlsx" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadCloud className="w-10 h-10 text-orange-600 mb-2" />
                <h4 className="text-sm font-bold text-foreground">Upload da Nota Fiscal (PDF / XML)</h4>
                <p className="text-xs text-muted-foreground mt-1">Arraste seu arquivo da nota fiscal física ou clique para procurar no computador.</p>
                <Badge variant="outline" className="mt-3 text-[10px] border-orange-500/30 text-orange-600 bg-white dark:bg-slate-900">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Sincronização Automática com Módulo Documentos (DMS)
                </Badge>
              </div>

              {anexos.length > 0 && (
                <div className="border rounded-lg overflow-hidden bg-background">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Arquivo Anexado</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead>Data / Usuário</TableHead>
                        <TableHead className="w-[100px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anexos.map((anx) => (
                        <TableRow key={anx.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Paperclip className="w-4 h-4 text-orange-600" />
                              <div>
                                <p className="text-xs font-semibold">{anx.nome}</p>
                                <Badge variant="secondary" className="text-[9px] py-0">{anx.extensao.toUpperCase()}</Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{anx.tamanho}</TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">
                            {new Date(anx.dataUpload).toLocaleDateString('pt-BR')} por {anx.usuario}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {anx.url && (
                                <a href={anx.url} download={anx.nome} target="_blank" rel="noreferrer">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600">
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                </a>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveAnexo(anx.id)} className="h-7 w-7 text-rose-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* 5. VÍNCULOS DE PROJETO E CONTRATO */}
            <TabsContent value="vinculos" className="mt-0 space-y-4 outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Projeto */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-600" /> Projeto Associado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Select value={projetoId} onValueChange={setProjetoId}>
                      <SelectTrigger><SelectValue placeholder="Selecione um projeto..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_projeto">Sem Vínculo com Projeto</SelectItem>
                        {projetos.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome} ({p.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Contrato */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-600" /> Contrato Vinculado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Select value={contratoId} onValueChange={setContratoId}>
                      <SelectTrigger><SelectValue placeholder="Selecione um contrato..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_contrato">Sem Vínculo com Contrato</SelectItem>
                        {contratos.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            Contrato {c.numero} - {c.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Centro de Custo */}
                <Card className="sm:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-600" /> Centro de Custo Fiscal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input value={centroCusto} onChange={e => setCentroCusto(e.target.value)} placeholder="Ex: Tecnologia, Comercial, Operações" />
                  </CardContent>
                </Card>

              </div>
            </TabsContent>

            {/* 6. AUDITORIA & HISTÓRICO */}
            <TabsContent value="historico" className="mt-0 space-y-4 outline-none">
              <div className="border rounded-lg overflow-hidden bg-background p-4 space-y-3">
                <h4 className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground">
                  <History className="w-4 h-4" /> Trilha de Auditoria Fiscal
                </h4>
                {documentoParaEditar?.historico && documentoParaEditar.historico.length > 0 ? (
                  <div className="space-y-2">
                    {documentoParaEditar.historico.map(h => (
                      <div key={h.id} className="p-2 border-b text-xs flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-foreground">{h.acao}</p>
                          <p className="text-muted-foreground">{h.detalhes}</p>
                        </div>
                        <div className="text-right text-[10px] text-muted-foreground">
                          <p>{new Date(h.dataHora).toLocaleString('pt-BR')}</p>
                          <p>por {h.usuario}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Documento novo. A trilha de auditoria será iniciada no salvamento.</p>
                )}
              </div>
            </TabsContent>

          </ScrollArea>
        </Tabs>

        {/* Rodapé de Ações */}
        <SheetFooter className="px-6 py-4 border-t bg-muted/10 shrink-0">
          <div className="flex w-full justify-between items-center">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold">
              <Save className="w-4 h-4" /> Salvar Nota Fiscal & Sync DMS
            </Button>
          </div>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
}
