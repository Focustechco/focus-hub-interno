import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useClientesQuery } from "@/features/clientes/hooks/useClientesQuery";
import { ClienteDTO } from "@/schemas/clienteSchema";
import { TituloReceber } from "@/features/contas-receber/types";
import { RecorrenciaFinanceira } from "@/features/recorrencias/types";
import { Contrato } from "@/features/contratos/types";
import { calculateClienteFinanceiro } from "@/features/recorrencias/services/recorrenciaEngine";
import { useDocumentosStore } from "@/features/documentos/hooks/useDocumentosStore";
import { dmsService } from "@/services/dmsService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Building2, User, Mail, Phone, MapPin, DollarSign, 
  FileText, Activity, AlertCircle, RefreshCw, Calendar, CheckCircle2, 
  Clock, AlertTriangle, FolderOpen, UploadCloud, Download, Trash2, Eye, ExternalLink
} from "lucide-react";
import { NovoClienteSheet } from "@/features/clientes/components/NovoClienteSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes/$clienteId")({
  component: PerfilClientePage,
});

function PerfilClientePage() {
  const { clienteId } = Route.useParams();
  const { clientes = [] } = useClientesQuery();
  const { data: titulos = [] } = useLocalStorageState<TituloReceber>('focus_contas_receber');
  const { data: recorrencias = [] } = useLocalStorageState<RecorrenciaFinanceira>('focus_recorrencias');
  const { data: contratos = [] } = useLocalStorageState<Contrato>('focus_contratos');

  // Integração DMS (Gestão de Documentos)
  const { documentos, uploadFileFromModule, moveToTrash } = useDocumentosStore();
  const [isUploading, setIsUploading] = useState(false);

  const cliente = clientes.find(c => c.id === clienteId);

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <h2 className="text-2xl font-bold">Cliente não encontrado</h2>
        <Link to="/clientes">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes</Button>
        </Link>
      </div>
    );
  }

  const clienteNomeOficial = cliente.nomeFantasia || cliente.razaoSocial;
  const contatos = Array.isArray(cliente.contatos) ? cliente.contatos : [];
  const contatoPrincipal = contatos.find(c => c?.principal) || contatos[0];

  const financeiro = calculateClienteFinanceiro(clienteId, titulos, recorrencias, contratos);
  const recorrenciaAtiva = financeiro.recorrenciasDoCliente.find(r => r.status === 'Ativa');
  const proximoTitulo = financeiro.titulosDoCliente
    .filter(t => t.status !== 'Recebido' && t.status !== 'Cancelado')
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))[0];

  // Documentos vinculados a este cliente no DMS
  const clienteDocs = documentos.filter(
    (d) =>
      d.clienteId === clienteId ||
      d.caminhoPasta.toLowerCase().includes(clienteNomeOficial.toLowerCase()) ||
      d.pastaId === `p-cli-${clienteId}`
  );

  // Upload direto para o DMS na pasta do cliente
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;

      uploadFileFromModule({
        nome: file.name,
        tamanho: `${sizeInMb} MB`,
        tamanhoBytes: file.size,
        moduloOrigem: 'Clientes',
        clienteId: cliente.id,
        clienteNome: clienteNomeOficial,
        categoria: file.name.toLowerCase().includes('contrato') ? 'Contratos' : 'Documentos do Cliente',
        tags: ['Clientes', clienteNomeOficial],
        urlConteudo: dataUrl,
      });

      setIsUploading(false);
      toast.success(`Documento "${file.name}" anexado e salvo na pasta /Clientes/${clienteNomeOficial} do DMS!`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/clientes">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{clienteNomeOficial}</h1>
              <Badge variant={cliente.status === 'Ativo' ? 'default' : 'secondary'} className={cliente.status === 'Ativo' ? 'bg-emerald-500' : ''}>
                {cliente.status}
              </Badge>
              {recorrenciaAtiva && (
                <Badge variant="outline" className="border-orange-500/40 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/30 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Recorrência Ativa ({recorrenciaAtiva.frequencia})
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              {cliente.tipo === 'Pessoa Jurídica' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
              {cliente.documento} • {cliente.codigo}
            </p>
          </div>
        </div>
        <NovoClienteSheet clienteToEdit={cliente}>
          <Button>Editar Cliente</Button>
        </NovoClienteSheet>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6 flex flex-col gap-2">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4" /> Localização</div>
            <div className="font-medium">{cliente.endereco?.cidade ? `${cliente.endereco.cidade}${cliente.endereco.estado ? ` - ${cliente.endereco.estado}` : ''}` : 'Não informada'}</div>
            <div className="text-xs text-muted-foreground">{cliente.endereco?.logradouro ? `${cliente.endereco.logradouro}${cliente.endereco.numero ? `, ${cliente.endereco.numero}` : ''}` : 'Sem endereço cadastrado'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col gap-2">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><User className="w-4 h-4" /> Contato Principal</div>
            <div className="font-medium">{contatoPrincipal?.nome || 'N/D'}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {contatoPrincipal?.celular || 'N/D'}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {contatoPrincipal?.email || 'N/D'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col gap-2">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" /> Financeiro (Contas a Receber)</div>
            <div className="font-medium text-emerald-600">
              R$ {financeiro.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs text-muted-foreground font-normal">Recebido</span>
            </div>
            <div className="text-sm text-rose-600">
              R$ {financeiro.valorEmAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs text-muted-foreground font-normal">Em Aberto</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col gap-2">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4" /> Mensalidade & Atrasos</div>
            <div className="font-medium text-foreground">
              R$ {financeiro.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs text-muted-foreground font-normal">/mês</span>
            </div>
            <div className={`text-xs font-semibold ${financeiro.titulosAtrasados > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {financeiro.titulosAtrasados} {financeiro.titulosAtrasados === 1 ? 'título em atraso' : 'títulos em atraso'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visaogeral" className="space-y-6 mt-4">
        <div className="w-full overflow-x-auto scrollbar-hide border-b pb-1">
          <TabsList className="w-max min-w-full justify-start border-b-0 rounded-none h-auto p-0 bg-transparent gap-2">
            <TabsTrigger value="visaogeral" className="shrink-0 whitespace-nowrap data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2.5">Visão Geral</TabsTrigger>
            <TabsTrigger value="documentos" className="shrink-0 whitespace-nowrap data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2.5 font-semibold text-primary">
              <FolderOpen className="w-4 h-4 mr-1.5 inline" /> Documentos & Anexos ({clienteDocs.length})
            </TabsTrigger>
            <TabsTrigger value="titulos" className="shrink-0 whitespace-nowrap data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2.5">
              Títulos e Faturas ({financeiro.titulosDoCliente.length})
            </TabsTrigger>
            <TabsTrigger value="recorrencias" className="shrink-0 whitespace-nowrap data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2.5">
              Recorrência ({financeiro.recorrenciasDoCliente.length})
            </TabsTrigger>
            <TabsTrigger value="contratos" className="shrink-0 whitespace-nowrap data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2.5">Contratos</TabsTrigger>
            <TabsTrigger value="historico" className="shrink-0 whitespace-nowrap data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2.5">Timeline</TabsTrigger>
          </TabsList>
        </div>
        
        {/* ABA: VISÃO GERAL */}
        <TabsContent value="visaogeral" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Próximos Vencimentos</CardTitle>
              </CardHeader>
              <CardContent>
                {proximoTitulo ? (
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <div className="font-medium text-sm">{proximoTitulo.descricao}</div>
                      <div className="text-xs text-muted-foreground">
                        Vencimento: {new Date(proximoTitulo.dataVencimento + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div className="font-bold text-sm text-foreground">
                      R$ {proximoTitulo.valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum título pendente com vencimento próximo.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Pasta no DMS</CardTitle>
                <Link to="/documentos">
                  <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
                    Abrir DMS <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <FolderOpen className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-xs font-semibold">/Clientes/{clienteNomeOficial}</p>
                    <p className="text-[11px] text-muted-foreground">{clienteDocs.length} arquivo(s) indexados na nuvem</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA: DOCUMENTOS DMS INTEGRADOS */}
        <TabsContent value="documentos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-500" />
                  Repositório de Arquivos — /Clientes/{clienteNomeOficial}
                </CardTitle>
                <CardDescription className="text-xs">
                  Todos os arquivos enviados aqui são sincronizados automaticamente com o módulo <strong>Gestão de Documentação</strong>.
                </CardDescription>
              </div>
              <Link to="/documentos">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" /> Explorador Completo DMS
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Dropzone de Upload */}
              <div className="border-2 border-dashed border-primary/30 hover:border-primary/60 rounded-xl p-6 flex flex-col items-center justify-center bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer relative group text-center">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <div className="bg-primary/10 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {isUploading ? 'Enviando e indexando arquivo...' : 'Clique ou arraste arquivos para a pasta deste cliente'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, Imagens, Contratos, Comprovantes, XML, Planilhas (armazenamento ilimitado)
                </p>
              </div>

              {/* Lista de Documentos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arquivos na Pasta</span>
                  <Badge variant="secondary" className="text-xs">{clienteDocs.length} documento(s)</Badge>
                </div>

                {clienteDocs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Nenhum documento anexado ainda para este cliente. Faça o upload acima.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {clienteDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/40 bg-card transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="font-semibold text-xs truncate">{doc.nome}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px]">{doc.categoria}</span>
                              <span>{doc.tamanho}</span>
                              <span>• {new Date(doc.dataUpload).toLocaleDateString('pt-BR')}</span>
                              <span>• v{doc.versaoAtual}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {doc.urlConteudo && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              asChild
                              className="h-8 text-xs gap-1"
                            >
                              <a href={doc.urlConteudo} download={doc.nome}>
                                <Download className="w-3.5 h-3.5" /> Baixar
                              </a>
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => {
                              moveToTrash(doc.id);
                              toast.info(`Documento "${doc.nome}" movido para a Lixeira do DMS.`);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: TÍTULOS E FATURAS */}
        <TabsContent value="titulos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Títulos Financeiros do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              {financeiro.titulosDoCliente.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">Nenhum título gerado para este cliente.</p>
              ) : (
                <div className="space-y-2">
                  {financeiro.titulosDoCliente.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <div className="font-semibold text-sm">{t.descricao}</div>
                        <div className="text-xs text-muted-foreground">Vencimento: {new Date(t.dataVencimento + 'T12:00:00Z').toLocaleDateString('pt-BR')} • Status: {t.status}</div>
                      </div>
                      <div className="font-bold text-sm">R$ {t.valorOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: RECORRÊNCIAS */}
        <TabsContent value="recorrencias" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Configurações de Recorrência</CardTitle>
            </CardHeader>
            <CardContent>
              {financeiro.recorrenciasDoCliente.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center text-center">
                  <RefreshCw className="w-10 h-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma recorrência configurada</h3>
                  <p className="text-muted-foreground mt-2 max-w-md text-sm">
                    Você pode ativar uma recorrência financeira ao editar este cliente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {financeiro.recorrenciasDoCliente.map(rec => (
                    <div key={rec.id} className="border rounded-lg p-4 bg-card flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{rec.descricao}</span>
                          <Badge variant="outline" className="text-xs">
                            {rec.frequencia}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={
                              rec.status === 'Ativa' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20' : 
                              rec.status === 'Pausada' ? 'text-amber-600 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20' : 
                              'text-rose-600 border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20'
                            }
                          >
                            {rec.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Próxima cobrança: {new Date(rec.proximaCobranca + 'T12:00:00Z').toLocaleDateString('pt-BR')} • Vencimento: dia {rec.diaVencimento || 10}
                        </div>
                      </div>
                      <div className="font-bold text-base text-foreground">
                        R$ {rec.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: CONTRATOS */}
        <TabsContent value="contratos" className="space-y-4">
          <Card>
            <CardContent className="p-10 flex flex-col items-center justify-center text-center">
              <FileText className="w-10 h-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Contratos do Cliente</h3>
              {contratos.filter(c => c.clienteId === clienteId).length > 0 ? (
                <div className="w-full mt-4 space-y-2 text-left">
                  {contratos.filter(c => c.clienteId === clienteId).map(c => (
                    <div key={c.id} className="border rounded-md p-3 flex justify-between items-center bg-card">
                      <div>
                        <div className="font-semibold text-sm">{c.nome} ({c.numeroContrato || c.codigo})</div>
                        <div className="text-xs text-muted-foreground">Mensalidade: R$ {(c.valorMensalidade || 0).toLocaleString('pt-BR')} • Status: {c.status}</div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded">{c.tipoServico}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground mt-2 max-w-md text-sm">
                  Nenhum contrato ativo registrado para este cliente no módulo de Contratos.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: HISTÓRICO */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-muted ml-4 pl-6 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[31px] bg-blue-500 rounded-full w-4 h-4 border-4 border-background" />
                  <div className="text-sm font-medium">Cadastro Criado</div>
                  <div className="text-xs text-muted-foreground">Sistema • {new Date(cliente.dataCadastro).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] bg-emerald-500 rounded-full w-4 h-4 border-4 border-background" />
                  <div className="text-sm font-medium">Última Atualização</div>
                  <div className="text-xs text-muted-foreground">Admin • {new Date(cliente.ultimaAtualizacao).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
