import { supabase } from '@/lib/supabaseClient';
import { PastaDMS, DocumentoDMS, AuditLogDocumento, FormatoArquivo, ModuloOrigemDMS } from '@/features/documentos/types';
import { INITIAL_PASTAS, INITIAL_DOCUMENTOS } from '@/features/documentos/data/initialData';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { dmsBlobStore } from '@/lib/indexedDbStorage';

const DOCS_STORAGE_KEYS = ['focus_app_focus_dms_documentos', 'focus_dms_documentos'];
const PASTAS_STORAGE_KEYS = ['focus_app_focus_dms_pastas', 'focus_dms_pastas'];
const AUDIT_STORAGE_KEYS = ['focus_app_focus_dms_audit', 'focus_dms_audit'];

function triggerSyncEvent() {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('focus_storage_update'));
      window.dispatchEvent(new Event('focus_dms_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  }
}

/**
 * Service Central de Gestão Eletrônica de Documentos (DMS / ECM)
 * Integração universal com Clientes, CRM, Projetos, RH, Produtos, Relatórios, Contratos, Assinaturas, Fiscal e Financeiro.
 */
export const dmsService = {
  // ---------------------------------------------------------------------------
  // Pastas
  // ---------------------------------------------------------------------------
  getPastas(): PastaDMS[] {
    try {
      for (const key of PASTAS_STORAGE_KEYS) {
        const raw = safeGetItem(key);
        if (raw) {
          const list: PastaDMS[] = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) return list;
        }
      }
    } catch {}
    return INITIAL_PASTAS;
  },

  async savePastas(pastas: PastaDMS[]): Promise<void> {
    const serialized = JSON.stringify(pastas);
    for (const key of PASTAS_STORAGE_KEYS) {
      safeSetItem(key, serialized);
    }
    triggerSyncEvent();
  },

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function toValidUuid(idStr?: string | null): string {
  if (!idStr || typeof idStr !== 'string') return crypto.randomUUID();
  if (uuidRegex.test(idStr)) return idStr;
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < idStr.length; i++) {
    const char = idStr.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }
  const hex1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash1 ^ hash2).toString(16).padStart(8, '0');
  const hex4 = Math.abs(hash1 + hash2).toString(16).padStart(8, '0');
  const fullHex = (hex1 + hex2 + hex3 + hex4).slice(0, 32);
  return `${fullHex.slice(0, 8)}-${fullHex.slice(8, 12)}-4${fullHex.slice(13, 16)}-a${fullHex.slice(17, 20)}-${fullHex.slice(20, 32)}`;
}

  async savePasta(pasta: PastaDMS): Promise<void> {
    const list = this.getPastas();
    const filtered = list.filter((p) => p.id !== pasta.id);
    const updated = [...filtered, pasta];
    await this.savePastas(updated);

    try {
      const validId = toValidUuid(pasta.id);
      const validParentId = pasta.parentId && pasta.parentId !== pasta.id ? toValidUuid(pasta.parentId) : null;

      const { error } = await supabase.from('dms_pastas').upsert({
        id: validId,
        nome: pasta.nome || 'Pasta',
        pasta_pai_id: validParentId,
        caminho_completo: pasta.caminhoCompleto || `/${pasta.nome}`,
        modulo_vinculado: pasta.moduloVinculado || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (error) {
        await supabase.from('dms_pastas').upsert({
          id: validId,
          nome: pasta.nome || 'Pasta',
          pasta_pai_id: null,
          caminho_completo: pasta.caminhoCompleto || `/${pasta.nome}`,
          modulo_vinculado: pasta.moduloVinculado || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }
    } catch {}
  },

  async deletePasta(id: string): Promise<void> {
    const list = this.getPastas();
    const updated = list.filter((p) => p.id !== id);
    await this.savePastas(updated);

    try {
      await supabase.from('dms_pastas').delete().eq('id', id);
    } catch {}
  },

  async deletePastasBatch(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    const list = this.getPastas();
    const updated = list.filter((p) => !idSet.has(p.id));
    await this.savePastas(updated);

    try {
      await supabase.from('dms_pastas').delete().in('id', ids);
    } catch {}
  },

  // ---------------------------------------------------------------------------
  // Garantir Criação de Pasta Raiz ou Subpasta Específica de Entidade
  // ---------------------------------------------------------------------------
  ensureFolder(
    nome: string,
    parentId: string | null = null,
    moduloVinculado: ModuloOrigemDMS = 'Geral',
    entidadeId?: string,
    customId?: string
  ): PastaDMS {
    const pastas = this.getPastas();
    
    // Verificar se a pasta já existe
    const existing = pastas.find((p) => {
      if (customId && p.id === customId) return true;
      if (entidadeId && p.entidadeId === entidadeId && p.moduloVinculado === moduloVinculado) return true;
      if (p.parentId === parentId && p.nome.toLowerCase().trim() === nome.toLowerCase().trim()) return true;
      return false;
    });

    if (existing) return existing;

    let parentPath = '';
    if (parentId) {
      const parent = pastas.find((p) => p.id === parentId);
      if (parent) parentPath = parent.caminhoCompleto;
    }
    const caminhoCompleto = `${parentPath}/${nome}`.replace(/\/\/+/g, '/');

    const folderId = customId || (entidadeId ? `p-${moduloVinculado.toLowerCase().replace(/\s+/g, '-')}-${entidadeId}` : `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`);

    const newFolder: PastaDMS = {
      id: folderId,
      nome,
      parentId,
      caminhoCompleto,
      moduloVinculado,
      entidadeId,
      dataCriacao: new Date().toISOString(),
      criadoPor: 'Sistema Integrado Focus ERP',
    };

    const updated = [...pastas, newFolder];
    this.savePastas(updated);
    return newFolder;
  },

  // 1. Clientes: Cria automaticamente /Clientes e /Clientes/[Nome do Cliente]
  ensureClientFolder(cliente: { id: string; nome?: string; nomeFantasia?: string; razaoSocial?: string }): PastaDMS {
    const rootFolder = this.ensureFolder('Clientes', null, 'Clientes', undefined, 'p-cli');
    const nomeCliente = cliente.nomeFantasia || cliente.razaoSocial || cliente.nome || 'Cliente Sem Nome';
    const folderId = `p-cli-${cliente.id}`;
    return this.ensureFolder(nomeCliente, rootFolder.id, 'Clientes', cliente.id, folderId);
  },

  // 2. Fornecedores: Cria automaticamente /Fornecedores e /Fornecedores/[Nome do Fornecedor]
  ensureSupplierFolder(fornecedor: { id: string; nome?: string; nomeFantasia?: string; razaoSocial?: string }): PastaDMS {
    const rootFolder = this.ensureFolder('Fornecedores', null, 'Fornecedores', undefined, 'p-forn');
    const nomeForn = fornecedor.nomeFantasia || fornecedor.razaoSocial || fornecedor.nome || 'Fornecedor Sem Nome';
    const folderId = `p-forn-${fornecedor.id}`;
    return this.ensureFolder(nomeForn, rootFolder.id, 'Fornecedores', fornecedor.id, folderId);
  },

  // 3. Projetos: Cria automaticamente /Projetos e /Projetos/[Nome do Projeto]
  ensureProjectFolder(projeto: { id: string; nome?: string; codigo?: string }): PastaDMS {
    const rootFolder = this.ensureFolder('Projetos', null, 'Projetos', undefined, 'p-prj');
    const nomeProjeto = projeto.codigo ? `${projeto.codigo} - ${projeto.nome || 'Projeto'}` : projeto.nome || 'Projeto Sem Nome';
    const folderId = `p-prj-${projeto.id}`;
    return this.ensureFolder(nomeProjeto, rootFolder.id, 'Projetos', projeto.id, folderId);
  },

  // 4. RH: Cria automaticamente /RH e /RH/Colaboradores/[Nome do Colaborador]
  ensureRhFolder(colaborador: { id: string; nome?: string; nomeExibicao?: string; nomeCompleto?: string }): PastaDMS {
    const rootFolder = this.ensureFolder('RH', null, 'RH', undefined, 'p-rh');
    const colabRoot = this.ensureFolder('Colaboradores', rootFolder.id, 'RH', undefined, 'p-rh-colab');
    const nomeColaborador = colaborador.nome || colaborador.nomeExibicao || colaborador.nomeCompleto || 'Colaborador';
    const folderId = `p-rh-colab-${colaborador.id}`;
    return this.ensureFolder(nomeColaborador, colabRoot.id, 'RH', colaborador.id, folderId);
  },

  // 5. Produtos Focus: Cria automaticamente /Produtos Focus e /Produtos Focus/[Nome do Produto]
  ensureProductFolder(produto: { id: string; nome?: string }): PastaDMS {
    const rootFolder = this.ensureFolder('Produtos Focus', null, 'Produtos Focus', undefined, 'p-prod');
    const nomeProduto = produto.nome || 'Produto Focus';
    const folderId = `p-prod-${produto.id}`;
    return this.ensureFolder(nomeProduto, rootFolder.id, 'Produtos Focus', produto.id, folderId);
  },

  // 6. Relatórios: Cria automaticamente /Relatórios e subpastas temáticas
  ensureReportFolder(tipo: string = 'Geral'): PastaDMS {
    const rootFolder = this.ensureFolder('Relatórios', null, 'Relatórios', undefined, 'p-rel');
    
    if (tipo.includes('DRE') || tipo.includes('Demonstrativo')) {
      return this.ensureFolder('DRE Gerencial', rootFolder.id, 'Relatórios', undefined, 'p-rel-dre');
    }
    if (tipo.includes('Fluxo') || tipo.includes('Caixa')) {
      return this.ensureFolder('Fluxo de Caixa', rootFolder.id, 'Relatórios', undefined, 'p-rel-fluxo');
    }
    if (tipo.includes('Vendas') || tipo.includes('Faturamento') || tipo.includes('Comercial')) {
      return this.ensureFolder('Faturamento e Vendas', rootFolder.id, 'Relatórios', undefined, 'p-rel-faturam');
    }
    if (tipo.includes('Auditoria') || tipo.includes('Compliance') || tipo.includes('Fiscal')) {
      return this.ensureFolder('Auditoria e Compliance', rootFolder.id, 'Relatórios', undefined, 'p-rel-audit');
    }
    if (tipo.includes('RH') || tipo.includes('Pessoal')) {
      return this.ensureFolder('Recursos Humanos', rootFolder.id, 'Relatórios', undefined, 'p-rel-rh');
    }
    
    return this.ensureFolder('Geral', rootFolder.id, 'Relatórios', undefined, 'p-rel-geral');
  },

  // 7. Contratos: Cria automaticamente /Contratos e subpasta de contratos
  ensureContractsFolder(cliente?: { id: string; nome?: string }): PastaDMS {
    if (cliente && cliente.id) {
      const clientFolder = this.ensureClientFolder(cliente);
      return this.ensureFolder('Contratos', clientFolder.id, 'Contratos', `${cliente.id}-ctr`, `p-cli-${cliente.id}-ctr`);
    }
    const rootFolder = this.ensureFolder('Contratos', null, 'Contratos', undefined, 'p-ctr');
    return rootFolder;
  },

  // 8. Assinaturas Digitais: Cria automaticamente /Contratos/Assinaturas Digitais
  ensureSignaturesFolder(): PastaDMS {
    const rootFolder = this.ensureFolder('Contratos', null, 'Contratos', undefined, 'p-ctr');
    return this.ensureFolder('Assinaturas Digitais', rootFolder.id, 'Contratos', undefined, 'p-ass');
  },

  // 9. Fiscal: Cria automaticamente /Fiscal e subpastas de notas fiscais
  ensureFiscalFolder(tipo: 'NFS-e' | 'NF-e' | 'Geral' = 'Geral'): PastaDMS {
    const rootFolder = this.ensureFolder('Fiscal', null, 'Fiscal', undefined, 'p-fisc');
    if (tipo === 'NFS-e') {
      return this.ensureFolder('Serviços (NFS-e)', rootFolder.id, 'Fiscal', undefined, 'p-fisc-nfse');
    }
    if (tipo === 'NF-e') {
      return this.ensureFolder('Mercadorias (NF-e)', rootFolder.id, 'Fiscal', undefined, 'p-fisc-nfe');
    }
    return rootFolder;
  },

  // 10. Financeiro: Cria automaticamente /Financeiro e subpastas de comprovantes e extratos
  ensureFinancialFolder(tipo: 'Contas a Pagar' | 'Contas a Receber' | 'Extratos' | 'Comprovantes' = 'Comprovantes'): PastaDMS {
    const rootFolder = this.ensureFolder('Financeiro', null, 'Financeiro', undefined, 'p-fin');
    if (tipo === 'Extratos') {
      return this.ensureFolder('Extratos Bancários', rootFolder.id, 'Financeiro', undefined, 'p-fin-ext');
    }
    return this.ensureFolder('Comprovantes', rootFolder.id, 'Financeiro', undefined, 'p-fin-comp');
  },

  // 11. Comercial OS & CRM
  ensureComercialFolder(tipo: 'Propostas' | 'Ordens de Servico' | 'Geral' = 'Propostas'): PastaDMS {
    const rootFolder = this.ensureFolder('Comercial', null, 'Comercial', undefined, 'p-com');
    if (tipo === 'Propostas') {
      return this.ensureFolder('Propostas Comerciais', rootFolder.id, 'Comercial', undefined, 'p-com-prop');
    }
    if (tipo === 'Ordens de Servico') {
      return this.ensureFolder('Ordens de Serviço', rootFolder.id, 'Comercial', undefined, 'p-com-os');
    }
    return rootFolder;
  },

  // 12. Marketing
  ensureMarketingFolder(): PastaDMS {
    const rootFolder = this.ensureFolder('Marketing', null, 'Marketing', undefined, 'p-mkt');
    return this.ensureFolder('Campanhas', rootFolder.id, 'Marketing', undefined, 'p-mkt-camp');
  },

  // ---------------------------------------------------------------------------
  // Documentos
  // ---------------------------------------------------------------------------
  getDocumentos(): DocumentoDMS[] {
    try {
      for (const key of DOCS_STORAGE_KEYS) {
        const raw = safeGetItem(key);
        if (raw) {
          const list: DocumentoDMS[] = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) return list;
        }
      }
    } catch {}
    return INITIAL_DOCUMENTOS;
  },

  async saveDocumentos(docs: DocumentoDMS[]): Promise<void> {
    // Sanitizar documentos para nunca estourar cota do localStorage com Base64
    const sanitizedDocs = docs.map((doc) => {
      if (doc.urlConteudo && (doc.urlConteudo.startsWith('data:') || doc.urlConteudo.length > 2000)) {
        // Salvar blob pesado no IndexedDB em background
        dmsBlobStore.saveBlob(doc.id, doc.urlConteudo);
        return {
          ...doc,
          urlConteudo: `indexeddb:${doc.id}`,
          historicoVersoes: (doc.historicoVersoes || []).map((v) => ({
            ...v,
            urlDownload: v.urlDownload && v.urlDownload.startsWith('data:') ? `indexeddb:${doc.id}` : v.urlDownload,
          })),
        };
      }
      return doc;
    });

    const serialized = JSON.stringify(sanitizedDocs);
    for (const key of DOCS_STORAGE_KEYS) {
      safeSetItem(key, serialized);
    }
    triggerSyncEvent();
  },

  async saveDocumento(doc: DocumentoDMS): Promise<void> {
    // Se o documento contém Base64 pesado, salvar no IndexedDB
    let docToSave = doc;
    if (doc.urlConteudo && (doc.urlConteudo.startsWith('data:') || doc.urlConteudo.length > 2000)) {
      await dmsBlobStore.saveBlob(doc.id, doc.urlConteudo);
      docToSave = {
        ...doc,
        urlConteudo: `indexeddb:${doc.id}`,
        historicoVersoes: (doc.historicoVersoes || []).map((v) => ({
          ...v,
          urlDownload: v.urlDownload && v.urlDownload.startsWith('data:') ? `indexeddb:${doc.id}` : v.urlDownload,
        })),
      };
    }

    const list = this.getDocumentos();
    const filtered = list.filter((d) => d.id !== doc.id);
    const updated = [docToSave, ...filtered];
    await this.saveDocumentos(updated);

    // Auditoria
    this.logAction(doc.id, doc.nome, 'Upload', `Arquivo indexado na pasta ${doc.caminhoPasta}`);
  },

  // ---------------------------------------------------------------------------
  // Upload / Geração Integrada Direta a partir de Qualquer Módulo
  // ---------------------------------------------------------------------------
  uploadFileFromModule(params: {
    nome: string;
    extensao?: FormatoArquivo;
    tamanho?: string;
    tamanhoBytes?: number;
    urlConteudo?: string;
    moduloOrigem: ModuloOrigemDMS;
    categoria?: string;
    tags?: string[];
    // Vínculos
    clienteId?: string;
    clienteNome?: string;
    fornecedorId?: string;
    fornecedorNome?: string;
    projetoId?: string;
    projetoNome?: string;
    contratoId?: string;
    contratoNumero?: string;
    colaboradorId?: string;
    colaboradorNome?: string;
    produtoId?: string;
    produtoNome?: string;
    relatorioTipo?: string;
    responsavelUpload?: string;
    status?: 'Ativo' | 'Arquivado' | 'Em Revisão';
  }): DocumentoDMS {
    let targetFolder: PastaDMS;

    // Roteamento inteligente para a pasta correta da entidade
    if (params.clienteId) {
      if (params.moduloOrigem === 'Contratos') {
        targetFolder = this.ensureContractsFolder({ id: params.clienteId, nome: params.clienteNome });
      } else {
        targetFolder = this.ensureClientFolder({ id: params.clienteId, nome: params.clienteNome });
      }
    } else if (params.fornecedorId) {
      targetFolder = this.ensureSupplierFolder({ id: params.fornecedorId, nome: params.fornecedorNome });
    } else if (params.projetoId) {
      targetFolder = this.ensureProjectFolder({ id: params.projetoId, nome: params.projetoNome });
    } else if (params.colaboradorId) {
      targetFolder = this.ensureRhFolder({ id: params.colaboradorId, nome: params.colaboradorNome });
    } else if (params.produtoId) {
      targetFolder = this.ensureProductFolder({ id: params.produtoId, nome: params.produtoNome });
    } else if (params.moduloOrigem === 'Relatórios') {
      targetFolder = this.ensureReportFolder(params.relatorioTipo || 'Geral');
    } else if (params.moduloOrigem === 'Contratos') {
      targetFolder = this.ensureContractsFolder();
    } else if (params.moduloOrigem === 'Fiscal') {
      targetFolder = this.ensureFiscalFolder((params.categoria?.includes('NFS-e') ? 'NFS-e' : 'NF-e') as any);
    } else if (params.moduloOrigem === 'Financeiro') {
      targetFolder = this.ensureFinancialFolder();
    } else if (params.moduloOrigem === 'Comercial') {
      targetFolder = this.ensureComercialFolder();
    } else if (params.moduloOrigem === 'Marketing') {
      targetFolder = this.ensureMarketingFolder();
    } else {
      targetFolder = this.ensureFolder(params.moduloOrigem, null, params.moduloOrigem);
    }

    const rawExt = (params.extensao || params.nome.split('.').pop()?.toLowerCase() || 'pdf').toLowerCase();
    const ext = (rawExt === 'pdf' ? 'pdf' : rawExt === 'xlsx' || rawExt === 'xls' ? 'xlsx' : rawExt === 'csv' ? 'csv' : rawExt === 'docx' || rawExt === 'doc' ? 'docx' : rawExt === 'xml' ? 'xml' : rawExt === 'png' || rawExt === 'jpg' ? 'png' : 'outros') as FormatoArquivo;
    const codigo = `DOC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newDocId = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Se houver Base64, salvar no IndexedDB
    if (params.urlConteudo && (params.urlConteudo.startsWith('data:') || params.urlConteudo.length > 2000)) {
      dmsBlobStore.saveBlob(newDocId, params.urlConteudo);
    }

    const storedUrl = params.urlConteudo && (params.urlConteudo.startsWith('data:') || params.urlConteudo.length > 2000)
      ? `indexeddb:${newDocId}`
      : params.urlConteudo;

    const newDoc: DocumentoDMS = {
      id: newDocId,
      codigo,
      nome: params.nome,
      extensao: ext,
      tamanho: params.tamanho || '1.2 MB',
      tamanhoBytes: params.tamanhoBytes || 1258291,
      pastaId: targetFolder.id,
      caminhoPasta: targetFolder.caminhoCompleto,
      moduloOrigem: params.moduloOrigem,
      clienteId: params.clienteId,
      clienteNome: params.clienteNome,
      fornecedorId: params.fornecedorId,
      fornecedorNome: params.fornecedorNome,
      projetoId: params.projetoId,
      projetoNome: params.projetoNome,
      contratoId: params.contratoId,
      contratoNumero: params.contratoNumero,
      colaboradorId: params.colaboradorId,
      colaboradorNome: params.colaboradorNome,
      produtoId: params.produtoId,
      produtoNome: params.produtoNome,
      relatorioTipo: params.relatorioTipo,
      tags: params.tags || [params.moduloOrigem, 'Integrado'],
      categoria: params.categoria || `Documento ${params.moduloOrigem}`,
      responsavelUpload: params.responsavelUpload || 'Sistema Integrado Focus ERP',
      dataUpload: new Date().toISOString(),
      dataUltimaAlteracao: new Date().toISOString(),
      versaoAtual: '1.0',
      favorito: false,
      status: params.status || 'Ativo',
      urlConteudo: storedUrl,
      historicoVersoes: [
        {
          numeroVersao: '1.0',
          alteradoPor: params.responsavelUpload || 'Sistema Integrado Focus ERP',
          dataAlteracao: new Date().toISOString(),
          descricaoAlteracao: `Arquivo gerado e sincronizado automaticamente via módulo ${params.moduloOrigem}.`,
          tamanhoArquivo: params.tamanho || '1.2 MB',
          urlDownload: storedUrl,
        },
      ],
    };

    this.saveDocumento(newDoc);
    return newDoc;
  },

  async deleteDocumento(id: string): Promise<void> {
    const list = this.getDocumentos();
    const docToDelete = list.find((d) => d.id === id);
    const updated = list.filter((d) => d.id !== id);
    await this.saveDocumentos(updated);
    await dmsBlobStore.deleteBlob(id);

    try {
      await supabase.from('focus_dms_documentos').delete().eq('id', id);
    } catch {}

    if (docToDelete) {
      this.logAction(docToDelete.id, docToDelete.nome, 'Exclusão', `Documento excluído permanentemente.`);
    }
  },

  async deleteDocumentosBatch(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    const list = this.getDocumentos();
    const updated = list.filter((d) => !idSet.has(d.id));
    await this.saveDocumentos(updated);
    await dmsBlobStore.deleteBlobsBatch(ids);

    try {
      await supabase.from('focus_dms_documentos').delete().in('id', ids);
    } catch {}
  },

  // ---------------------------------------------------------------------------
  // Auditoria
  // ---------------------------------------------------------------------------
  logAction(docId: string, docName: string, acao: AuditLogDocumento['acao'], detalhes?: string): void {
    try {
      let list: AuditLogDocumento[] = [];
      for (const key of AUDIT_STORAGE_KEYS) {
        const raw = safeGetItem(key);
        if (raw) {
          list = JSON.parse(raw);
          break;
        }
      }
      const newLog: AuditLogDocumento = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        documentoId: docId,
        nomeDocumento: docName,
        usuario: 'Usuário do Sistema',
        acao,
        dataHora: new Date().toISOString(),
        ip: '127.0.0.1',
        detalhes,
      };
      const updated = [newLog, ...list.slice(0, 100)];
      const serialized = JSON.stringify(updated);
      for (const key of AUDIT_STORAGE_KEYS) {
        safeSetItem(key, serialized);
      }
    } catch {}
  },
};
