import { useEffect, useMemo, useCallback } from 'react';
import { useLocalStorageState } from "@/hooks/useDataStore";
import { PastaDMS, DocumentoDMS, AuditLogDocumento, FormatoArquivo, ModuloOrigemDMS } from "../types";
import { INITIAL_PASTAS, INITIAL_DOCUMENTOS, ROOT_PASTAS_IDS } from "../data/initialData";
import { dmsService } from "@/services/dmsService";
import { dmsBlobStore } from "@/lib/indexedDbStorage";

export function useDocumentosStore() {
  const { data: rawPastas, addItem: addPastaItem, updateItem: updatePastaItem, removeItem: removePastaItem, save: savePastas } = useLocalStorageState<PastaDMS>('focus_dms_pastas', INITIAL_PASTAS);
  const { data: rawDocumentos, addItem: addDocItem, updateItem: updateDocItem, removeItem: removeDocItem, save: saveDocumentos } = useLocalStorageState<DocumentoDMS>('focus_dms_documentos', INITIAL_DOCUMENTOS);
  const { data: lixeira, addItem: addTrashItem, removeItem: removeTrashItem, save: saveLixeira } = useLocalStorageState<DocumentoDMS>('focus_dms_lixeira', []);
  const { data: auditLogs, addItem: addAuditItem } = useLocalStorageState<AuditLogDocumento>('focus_dms_audit', []);
  const { data: deletedDocIds, addItem: addDeletedId, save: saveDeletedIds } = useLocalStorageState<string>('focus_dms_deleted_ids', []);
  const { data: deletedFolderIds, addItem: addDeletedFolderId, save: saveDeletedFolderIds } = useLocalStorageState<string>('focus_dms_deleted_folder_ids', []);

  // Leitura de entidades para sincronização automática de pastas
  const { data: clientes } = useLocalStorageState<any>('focus_clientes', []);
  const { data: fornecedores } = useLocalStorageState<any>('focus_fornecedores', []);
  const { data: projetos } = useLocalStorageState<any>('focus_projetos', []);
  const { data: colaboradores } = useLocalStorageState<any>('focus_rh_colaboradores', []);
  const { data: produtos } = useLocalStorageState<any>('focus_produtos', []);

  // 1. Pastas Oficiais e Subpastas Consolidadas (Deduplicação Estrita por Caminho e ID)
  const pastas = useMemo(() => {
    const map = new Map<string, PastaDMS>();
    const pathMap = new Map<string, string>(); // caminhoNormalizado -> idOficial
    const nameMap = new Map<string, string>(); // nomeNormalizado -> idOficial

    // 1.1 Pastas Oficiais Raízes e Subpastas Padrão
    INITIAL_PASTAS.forEach((p) => {
      map.set(p.id, p);
      pathMap.set(p.caminhoCompleto.toLowerCase().trim(), p.id);
      if (p.parentId === null) {
        nameMap.set(p.nome.toLowerCase().trim(), p.id);
      }
    });

    // 1.2 Auto-sincronizar subpastas de Clientes Cadastrados
    (clientes || []).forEach((c: any) => {
      if (c && c.id) {
        const folderId = `00000000-0000-4000-b001-${String(c.id).slice(-12).padStart(12, '0')}`;
        const nomeCliente = c.nomeFantasia || c.razaoSocial || c.nome || 'Cliente';
        const caminhoCompleto = `/Clientes/${nomeCliente}`;
        const pastaCliente: PastaDMS = {
          id: folderId,
          nome: nomeCliente,
          parentId: ROOT_PASTAS_IDS.CLIENTES,
          caminhoCompleto,
          moduloVinculado: 'Clientes',
          entidadeId: c.id,
          dataCriacao: c.dataCadastro || new Date().toISOString(),
          criadoPor: 'Sistema Integrado (Clientes)',
        };
        map.set(folderId, pastaCliente);
        pathMap.set(caminhoCompleto.toLowerCase().trim(), folderId);
      }
    });

    // 1.3 Auto-sincronizar subpastas de Fornecedores Cadastrados
    (fornecedores || []).forEach((f: any) => {
      if (f && f.id) {
        const folderId = `00000000-0000-4000-b002-${String(f.id).slice(-12).padStart(12, '0')}`;
        const nomeForn = f.nomeFantasia || f.razaoSocial || f.nome || 'Fornecedor';
        const caminhoCompleto = `/Fornecedores/${nomeForn}`;
        const pastaForn: PastaDMS = {
          id: folderId,
          nome: nomeForn,
          parentId: ROOT_PASTAS_IDS.FORNECEDORES,
          caminhoCompleto,
          moduloVinculado: 'Fornecedores',
          entidadeId: f.id,
          dataCriacao: f.dataCadastro || new Date().toISOString(),
          criadoPor: 'Sistema Integrado (Fornecedores)',
        };
        map.set(folderId, pastaForn);
        pathMap.set(caminhoCompleto.toLowerCase().trim(), folderId);
      }
    });

    // 1.4 Auto-sincronizar subpastas de Projetos Cadastrados
    (projetos || []).forEach((prj: any) => {
      if (prj && prj.id) {
        const folderId = `00000000-0000-4000-b003-${String(prj.id).slice(-12).padStart(12, '0')}`;
        const nomePrj = prj.codigo ? `${prj.codigo} - ${prj.nome || 'Projeto'}` : prj.nome || 'Projeto';
        const caminhoCompleto = `/Projetos/${nomePrj}`;
        const pastaPrj: PastaDMS = {
          id: folderId,
          nome: nomePrj,
          parentId: ROOT_PASTAS_IDS.PROJETOS,
          caminhoCompleto,
          moduloVinculado: 'Projetos',
          entidadeId: prj.id,
          dataCriacao: prj.dataCriacao || new Date().toISOString(),
          criadoPor: 'Sistema Integrado (Projetos)',
        };
        map.set(folderId, pastaPrj);
        pathMap.set(caminhoCompleto.toLowerCase().trim(), folderId);
      }
    });

    // 1.5 Auto-sincronizar subpastas de RH (Colaboradores / Funcionários)
    (colaboradores || []).forEach((colab: any) => {
      if (colab && colab.id) {
        const folderId = `00000000-0000-4000-b004-${String(colab.id).slice(-12).padStart(12, '0')}`;
        const nomeColab = colab.nome || colab.nomeCompleto || colab.nomeExibicao || 'Colaborador';
        const caminhoCompleto = `/RH/Colaboradores/${nomeColab}`;
        const pastaColab: PastaDMS = {
          id: folderId,
          nome: nomeColab,
          parentId: ROOT_PASTAS_IDS.RH_COLAB,
          caminhoCompleto,
          moduloVinculado: 'RH',
          entidadeId: colab.id,
          dataCriacao: colab.dataAdmissao || new Date().toISOString(),
          criadoPor: 'Sistema Integrado (RH)',
        };
        map.set(folderId, pastaColab);
        pathMap.set(caminhoCompleto.toLowerCase().trim(), folderId);
      }
    });

    // 1.6 Auto-sincronizar subpastas de Produtos Focus
    (produtos || []).forEach((prod: any) => {
      if (prod && prod.id) {
        const folderId = `00000000-0000-4000-b005-${String(prod.id).slice(-12).padStart(12, '0')}`;
        const nomeProd = prod.nome || 'Produto Focus';
        const caminhoCompleto = `/Produtos Focus/${nomeProd}`;
        const pastaProd: PastaDMS = {
          id: folderId,
          nome: nomeProd,
          parentId: ROOT_PASTAS_IDS.PRODUTOS,
          caminhoCompleto,
          moduloVinculado: 'Produtos Focus',
          entidadeId: prod.id,
          dataCriacao: new Date().toISOString(),
          criadoPor: 'Sistema Integrado (Produtos)',
        };
        map.set(folderId, pastaProd);
        pathMap.set(caminhoCompleto.toLowerCase().trim(), folderId);
      }
    });

    // Mapeamento de subpastas conhecidas que nunca devem ficar soltas na raiz
    const KNOWN_SUBFOLDERS_PARENT_MAP: Record<string, { parentId: string; caminhoCompleto: string }> = {
      'extratos bancários': { parentId: ROOT_PASTAS_IDS.FINANCEIRO, caminhoCompleto: '/Financeiro/Extratos Bancários' },
      'extratos': { parentId: ROOT_PASTAS_IDS.FINANCEIRO, caminhoCompleto: '/Financeiro/Extratos Bancários' },
      'comprovantes': { parentId: ROOT_PASTAS_IDS.FINANCEIRO, caminhoCompleto: '/Financeiro/Comprovantes' },
      'comprovantes bancários': { parentId: ROOT_PASTAS_IDS.FINANCEIRO, caminhoCompleto: '/Financeiro/Comprovantes' },
      'assinaturas digitais': { parentId: ROOT_PASTAS_IDS.CONTRATOS, caminhoCompleto: '/Contratos/Assinaturas Digitais' },
      'colaboradores': { parentId: ROOT_PASTAS_IDS.RH, caminhoCompleto: '/RH/Colaboradores' },
      'serviços (nfs-e)': { parentId: ROOT_PASTAS_IDS.FISCAL, caminhoCompleto: '/Fiscal/Serviços (NFS-e)' },
      'mercadorias (nf-e)': { parentId: ROOT_PASTAS_IDS.FISCAL, caminhoCompleto: '/Fiscal/Mercadorias (NF-e)' },
      'propostas comerciais': { parentId: ROOT_PASTAS_IDS.COMERCIAL, caminhoCompleto: '/Comercial/Propostas Comerciais' },
      'ordens de serviço': { parentId: ROOT_PASTAS_IDS.COMERCIAL, caminhoCompleto: '/Comercial/Ordens de Serviço' },
      'ordens de serviço (os)': { parentId: ROOT_PASTAS_IDS.COMERCIAL, caminhoCompleto: '/Comercial/Ordens de Serviço' },
      'campanhas': { parentId: ROOT_PASTAS_IDS.MARKETING, caminhoCompleto: '/Marketing/Campanhas' },
      'dre gerencial': { parentId: ROOT_PASTAS_IDS.RELATORIOS, caminhoCompleto: '/Relatórios/DRE Gerencial' },
      'fluxo de caixa': { parentId: ROOT_PASTAS_IDS.RELATORIOS, caminhoCompleto: '/Relatórios/Fluxo de Caixa' },
      'faturamento e vendas': { parentId: ROOT_PASTAS_IDS.RELATORIOS, caminhoCompleto: '/Relatórios/Faturamento e Vendas' },
      'auditoria e compliance': { parentId: ROOT_PASTAS_IDS.RELATORIOS, caminhoCompleto: '/Relatórios/Auditoria e Compliance' },
      'recursos humanos': { parentId: ROOT_PASTAS_IDS.RELATORIOS, caminhoCompleto: '/Relatórios/Recursos Humanos' },
    };

    // 1.7 Pastas criadas pelo usuário (somente se não forem duplicatas de caminhos oficiais)
    (rawPastas || []).forEach((p) => {
      if (!p || !p.nome) return;
      const normNome = p.nome.toLowerCase().trim();
      const normalizedPath = (p.caminhoCompleto || `/${p.nome}`).toLowerCase().trim();

      // Se for subpasta conhecida que foi salva na raiz incorretamente
      if (KNOWN_SUBFOLDERS_PARENT_MAP[normNome]) {
        return;
      }

      // Se a pasta é oficial raiz ou já foi mapeada
      if (nameMap.has(normNome) && p.parentId === null) {
        return;
      }
      if (pathMap.has(normalizedPath)) {
        return;
      }

      // Se for uma pasta válida customizada criada pelo usuário
      if (!map.has(p.id)) {
        map.set(p.id, p);
        pathMap.set(normalizedPath, p.id);
      }
    });

    const deletedSet = new Set(deletedFolderIds || []);
    if (deletedSet.size === 0) {
      return Array.from(map.values());
    }

    // Filtrar pastas excluídas e recursivamente suas filhas
    const result: PastaDMS[] = [];
    const isExcluded = (folder: PastaDMS): boolean => {
      if (deletedSet.has(folder.id)) return true;
      let currentParentId = folder.parentId;
      while (currentParentId) {
        if (deletedSet.has(currentParentId)) return true;
        const parent = map.get(currentParentId);
        currentParentId = parent ? parent.parentId : null;
      }
      return false;
    };

    map.forEach((p) => {
      if (!isExcluded(p)) {
        result.push(p);
      }
    });

    return result;
  }, [rawPastas, clientes, fornecedores, projetos, colaboradores, produtos, deletedFolderIds]);

  // Persistir pastas sincronizadas se houver alteração
  useEffect(() => {
    if (pastas.length !== (rawPastas || []).length) {
      savePastas(pastas);
    }
  }, [pastas, rawPastas, savePastas]);

  // 2. Documentos Reais e Persistentes (Sem oscilações ou documentos fantasmas)
  const documentos = useMemo(() => {
    const deletedSet = new Set(deletedDocIds || []);
    const trashSet = new Set((lixeira || []).map((t) => t.id));
    const docMap = new Map<string, DocumentoDMS>();

    // Criar mapa de pastas canônicas para normalização de IDs
    const folderPathToId = new Map<string, string>();
    pastas.forEach((p) => {
      folderPathToId.set(p.caminhoCompleto.toLowerCase().trim(), p.id);
      folderPathToId.set(p.nome.toLowerCase().trim(), p.id);
    });

    (rawDocumentos || []).forEach((d) => {
      if (!d || !d.id || deletedSet.has(d.id) || trashSet.has(d.id)) return;

      // Normalizar pastaId se apontar para ID antigo ou duplicado
      let correctedPastaId = d.pastaId;
      if (d.caminhoPasta) {
        const canonicalId = folderPathToId.get(d.caminhoPasta.toLowerCase().trim());
        if (canonicalId) {
          correctedPastaId = canonicalId;
        }
      }

      docMap.set(d.id, {
        ...d,
        pastaId: correctedPastaId || d.pastaId,
      });
    });

    return Array.from(docMap.values());
  }, [rawDocumentos, lixeira, deletedDocIds, pastas]);

  const logAction = useCallback((docId: string, docName: string, acao: AuditLogDocumento['acao'], detalhes?: string) => {
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
    addAuditItem(newLog);
  }, [addAuditItem]);

  const createFolder = (nome: string, parentId: string | null = null, moduloVinculado: ModuloOrigemDMS = 'Geral') => {
    let parentPath = '';
    if (parentId) {
      const parentFolder = pastas.find((p) => p.id === parentId);
      if (parentFolder) parentPath = parentFolder.caminhoCompleto;
    }
    const caminhoCompleto = `${parentPath}/${nome}`.replace(/\/\/+/g, '/');

    const newFolder: PastaDMS = {
      id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nome,
      parentId,
      caminhoCompleto,
      moduloVinculado,
      dataCriacao: new Date().toISOString(),
      criadoPor: 'Usuário do Sistema',
    };

    addPastaItem(newFolder);
    dmsService.savePasta(newFolder);
  };

  const uploadDocument = (params: {
    nome: string;
    extensao: FormatoArquivo;
    tamanho: string;
    tamanhoBytes: number;
    pastaId: string;
    moduloOrigem: ModuloOrigemDMS;
    categoria: string;
    tags: string[];
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
    urlConteudo?: string;
  }) => {
    const targetFolder = pastas.find((p) => p.id === params.pastaId);
    const caminhoPasta = targetFolder ? targetFolder.caminhoCompleto : `/${params.moduloOrigem}`;
    const codigo = `DOC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newDocId = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const filePayload = params.urlConteudo || (params as any).conteudoDataUrl || (params as any).arquivoUrl;

    if (filePayload && (filePayload.startsWith('data:') || filePayload.length > 2000)) {
      dmsBlobStore.saveBlob(newDocId, filePayload);
    }

    const storedUrl = filePayload && (filePayload.startsWith('data:') || filePayload.length > 2000)
      ? `indexeddb:${newDocId}`
      : filePayload;

    const newDoc: DocumentoDMS = {
      id: newDocId,
      codigo,
      nome: params.nome,
      extensao: params.extensao,
      tamanho: params.tamanho,
      tamanhoBytes: params.tamanhoBytes,
      pastaId: params.pastaId,
      caminhoPasta,
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
      tags: params.tags,
      categoria: params.categoria,
      responsavelUpload: 'Usuário do Sistema',
      dataUpload: new Date().toISOString(),
      dataUltimaAlteracao: new Date().toISOString(),
      versaoAtual: '1.0',
      favorito: false,
      status: 'Ativo',
      urlConteudo: storedUrl,
      historicoVersoes: [
        {
          numeroVersao: '1.0',
          alteradoPor: 'Usuário do Sistema',
          dataAlteracao: new Date().toISOString(),
          descricaoAlteracao: 'Versão inicial enviada ao sistema.',
          tamanhoArquivo: params.tamanho,
          urlDownload: storedUrl,
        },
      ],
    };

    addDocItem(newDoc);
    dmsService.saveDocumento(newDoc);
    logAction(newDoc.id, newDoc.nome, 'Upload', `Arquivo indexado na pasta ${caminhoPasta}`);
    return newDoc;
  };

  const uploadFileFromModule = (params: Parameters<typeof dmsService.uploadFileFromModule>[0]) => {
    const doc = dmsService.uploadFileFromModule(params);
    addDocItem(doc);
    return doc;
  };

  const addVersion = (docId: string, descricaoAlteracao: string, novoTamanho: string) => {
    const doc = documentos.find((d) => d.id === docId);
    if (!doc) return;

    const currentMajor = parseInt(doc.versaoAtual.split('.')[0] || '1');
    const newVersion = `${currentMajor + 1}.0`;

    const updatedVersoes = [
      {
        numeroVersao: newVersion,
        alteradoPor: 'Usuário do Sistema',
        dataAlteracao: new Date().toISOString(),
        descricaoAlteracao,
        tamanhoArquivo: novoTamanho,
      },
      ...doc.historicoVersoes,
    ];

    updateDocItem(docId, {
      versaoAtual: newVersion,
      tamanho: novoTamanho,
      dataUltimaAlteracao: new Date().toISOString(),
      historicoVersoes: updatedVersoes,
    });

    logAction(doc.id, doc.nome, 'Versão Criada', `Nova versão ${newVersion} adicionada: ${descricaoAlteracao}`);
  };

  const renameDocument = (docId: string, novoNome: string) => {
    const doc = documentos.find((d) => d.id === docId);
    if (!doc) return;

    updateDocItem(docId, {
      nome: novoNome,
      dataUltimaAlteracao: new Date().toISOString(),
    });

    logAction(docId, novoNome, 'Renomeação', `Documento renomeado de '${doc.nome}' para '${novoNome}'`);
  };

  const toggleFavorite = (docId: string) => {
    const doc = documentos.find((d) => d.id === docId);
    if (!doc) return;

    updateDocItem(docId, {
      favorito: !doc.favorito,
    });
  };

  // Mover para Lixeira
  const moveToTrash = (docId: string) => {
    const doc = documentos.find((d) => d.id === docId);
    if (doc) {
      addTrashItem(doc);
      logAction(doc.id, doc.nome, 'Exclusão', 'Documento movido para a lixeira.');
    }

    removeDocItem(docId);
    if (!deletedDocIds.includes(docId)) {
      addDeletedId(docId);
    }
  };

  const moveToTrashBatch = (docIds: string[]) => {
    const docsToTrash = documentos.filter((d) => docIds.includes(d.id));
    saveLixeira([...(lixeira || []), ...docsToTrash]);
    saveDocumentos(rawDocumentos.filter((d) => !docIds.includes(d.id)));

    const newDeleted = Array.from(new Set([...(deletedDocIds || []), ...docIds]));
    saveDeletedIds(newDeleted);

    docsToTrash.forEach((d) => {
      logAction(d.id, d.nome, 'Exclusão', 'Documento movido para a lixeira (em lote).');
    });
  };

  // Restaurar da Lixeira
  const restoreFromTrash = (docId: string) => {
    const doc = (lixeira || []).find((d) => d.id === docId);
    if (!doc) return;

    removeTrashItem(docId);
    addDocItem(doc);
    saveDeletedIds((deletedDocIds || []).filter((id) => id !== docId));
    logAction(doc.id, doc.nome, 'Restauração', 'Documento restaurado da lixeira.');
  };

  // Excluir Permanentemente
  const deletePermanently = (docId: string) => {
    removeTrashItem(docId);
    removeDocItem(docId);
    if (!deletedDocIds.includes(docId)) {
      addDeletedId(docId);
    }
    dmsService.deleteDocumento(docId);
  };

  const deletePermanentlyBatch = (docIds: string[]) => {
    const idSet = new Set(docIds);
    saveLixeira((lixeira || []).filter((d) => !idSet.has(d.id)));
    saveDocumentos((rawDocumentos || []).filter((d) => !idSet.has(d.id)));

    const newDeleted = Array.from(new Set([...(deletedDocIds || []), ...docIds]));
    saveDeletedIds(newDeleted);

    dmsService.deleteDocumentosBatch(docIds);
  };

  const updateDocument = (docId: string, updates: Partial<DocumentoDMS>) => {
    updateDocItem(docId, updates);
  };

  // Exclusão de Pastas (individual e em lote)
  const deleteFolder = (folderId: string) => {
    const targetFolder = pastas.find((p) => p.id === folderId);
    if (!targetFolder) return;

    const allFolderIdsToDelete: string[] = [folderId];
    const findSubfolders = (parentId: string) => {
      const children = pastas.filter((p) => p.parentId === parentId);
      children.forEach((c) => {
        allFolderIdsToDelete.push(c.id);
        findSubfolders(c.id);
      });
    };
    findSubfolders(folderId);

    const folderIdSet = new Set(allFolderIdsToDelete);

    const docsInFolders = documentos.filter((d) => {
      if (folderIdSet.has(d.pastaId)) return true;
      if (d.caminhoPasta && (d.caminhoPasta === targetFolder.caminhoCompleto || d.caminhoPasta.startsWith(targetFolder.caminhoCompleto + '/'))) {
        return true;
      }
      return false;
    });

    if (docsInFolders.length > 0) {
      moveToTrashBatch(docsInFolders.map((d) => d.id));
    }

    const newDeletedFolders = Array.from(new Set([...(deletedFolderIds || []), ...allFolderIdsToDelete]));
    saveDeletedFolderIds(newDeletedFolders);

    savePastas((rawPastas || []).filter((p) => !folderIdSet.has(p.id)));
    dmsService.deletePastasBatch(allFolderIdsToDelete);

    logAction(targetFolder.id, targetFolder.nome, 'Exclusão', `Pasta '${targetFolder.nome}' e ${docsInFolders.length} documento(s) contidos foram excluídos.`);
  };

  const deleteFoldersBatch = (folderIds: string[]) => {
    if (folderIds.length === 0) return;

    const allFolderIdsToDelete: string[] = [];
    const findSubfolders = (parentId: string) => {
      const children = pastas.filter((p) => p.parentId === parentId);
      children.forEach((c) => {
        if (!allFolderIdsToDelete.includes(c.id)) {
          allFolderIdsToDelete.push(c.id);
          findSubfolders(c.id);
        }
      });
    };

    folderIds.forEach((fId) => {
      if (!allFolderIdsToDelete.includes(fId)) {
        allFolderIdsToDelete.push(fId);
        findSubfolders(fId);
      }
    });

    const folderIdSet = new Set(allFolderIdsToDelete);
    const targetFolders = pastas.filter((p) => folderIdSet.has(p.id));
    const targetPaths = targetFolders.map((p) => p.caminhoCompleto);

    const docsInFolders = documentos.filter((d) => {
      if (folderIdSet.has(d.pastaId)) return true;
      if (d.caminhoPasta && targetPaths.some((tp) => d.caminhoPasta === tp || d.caminhoPasta.startsWith(tp + '/'))) {
        return true;
      }
      return false;
    });

    if (docsInFolders.length > 0) {
      moveToTrashBatch(docsInFolders.map((d) => d.id));
    }

    const newDeletedFolders = Array.from(new Set([...(deletedFolderIds || []), ...allFolderIdsToDelete]));
    saveDeletedFolderIds(newDeletedFolders);

    savePastas((rawPastas || []).filter((p) => !folderIdSet.has(p.id)));
    dmsService.deletePastasBatch(allFolderIdsToDelete);

    logAction('batch-folder-delete', `${folderIds.length} Pastas`, 'Exclusão', `Exclusão em lote de ${folderIds.length} pasta(s) e ${docsInFolders.length} documento(s).`);
  };

  const downloadDocument = (doc: DocumentoDMS) => {
    if (!doc.urlConteudo) {
      return;
    }
    const a = document.createElement('a');
    a.href = doc.urlConteudo;
    a.download = doc.nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    logAction(doc.id, doc.nome, 'Download', `Download realizado pelo usuário`);
  };

  return {
    pastas,
    documentos,
    lixeira: lixeira || [],
    auditLogs: auditLogs || [],
    createFolder,
    deleteFolder,
    deleteFoldersBatch,
    uploadDocument,
    uploadFileFromModule,
    addVersion,
    renameDocument,
    toggleFavorite,
    moveToTrash,
    moveToTrashBatch,
    restoreFromTrash,
    deletePermanently,
    deletePermanentlyBatch,
    updateDocument,
    downloadDocument,
    logAction,
  };
}
