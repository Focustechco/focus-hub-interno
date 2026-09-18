import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { safeSetItem, safeGetItem, safeRemoveItem } from '@/lib/safeStorage';
import { userService } from '@/services/userService';
import { clienteService } from '@/services/clienteService';
import { realtimeManager } from '@/lib/realtimeManager';

/**
const LEGACY_PASTA_MAP: Record<string, string> = {
  'p-cli': '00000000-0000-4000-a000-000000000001',
  'p-forn': '00000000-0000-4000-a000-000000000002',
  'p-prj': '00000000-0000-4000-a000-000000000003',
  'p-rh': '00000000-0000-4000-a000-000000000004',
  'p-prod': '00000000-0000-4000-a000-000000000005',
  'p-rel': '00000000-0000-4000-a000-000000000006',
  'p-ctr': '00000000-0000-4000-a000-000000000007',
  'p-ass': '00000000-0000-4000-a000-000000000008',
  'p-fisc': '00000000-0000-4000-a000-000000000009',
  'p-fin': '00000000-0000-4000-a000-000000000010',
  'p-com': '00000000-0000-4000-a000-000000000011',
  'p-mkt': '00000000-0000-4000-a000-000000000012',
  'p-suporte': '00000000-0000-4000-a000-000000000013',
  'p-cs': '00000000-0000-4000-a000-000000000014',
  'p-dev': '00000000-0000-4000-a000-000000000015',
  'p-itam': '00000000-0000-4000-a000-000000000016',
  'p-centros': '00000000-0000-4000-a000-000000000017',
  'p-plano': '00000000-0000-4000-a000-000000000018',
  'p-bancos': '00000000-0000-4000-a000-000000000019',
  'p-extratos': '00000000-0000-4000-a000-000000000020',
  'p-cobrancas': '00000000-0000-4000-a000-000000000021',
  'p-usuarios': '00000000-0000-4000-a000-000000000022',
  'p-empresa': '00000000-0000-4000-a000-000000000023',
  'p-integracoes': '00000000-0000-4000-a000-000000000024',
  'p-seguranca': '00000000-0000-4000-a000-000000000025',
};

/**
 * Helper to ensure a string is a valid UUID for PostgreSQL uuid columns.
 */
function toValidUuid(idStr?: string | null): string {
  if (!idStr || typeof idStr !== 'string') return crypto.randomUUID();
  const trimmed = idStr.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return crypto.randomUUID();
  if (LEGACY_PASTA_MAP[trimmed]) return LEGACY_PASTA_MAP[trimmed];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) return trimmed;

  // Mapeamento determinístico para prefixos customizados (evita gerar novos UUIDs a cada sync)
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed.charCodeAt(i);
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

function toNullableValidUuid(idStr?: string | null): string | null {
  if (!idStr || typeof idStr !== 'string') return null;
  const trimmed = idStr.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  if (LEGACY_PASTA_MAP[trimmed]) return LEGACY_PASTA_MAP[trimmed];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed) ? trimmed : null;
}

function toSafeParentPastaId(parentIdVal?: any, currentId?: any): string | null {
  if (!parentIdVal || typeof parentIdVal !== 'string') return null;
  const trimmed = parentIdVal.trim().toLowerCase();
  if (
    !trimmed ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === 'none' ||
    trimmed === 'root' ||
    trimmed === 'raiz' ||
    trimmed === 'pasta-raiz' ||
    trimmed === '0' ||
    trimmed === 'false'
  ) {
    return null;
  }
  const parentUuid = LEGACY_PASTA_MAP[trimmed] || toValidUuid(parentIdVal);
  if (currentId && (parentUuid === toValidUuid(currentId) || trimmed === String(currentId).toLowerCase().trim())) {
    return null;
  }
  return parentUuid;
}

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach((item) => {
    if (item && item.id) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

const DMS_FOLDER_NAMES = [
  'Clientes',
  'Projetos',
  'RH',
  'Colaboradores',
  'Folha de Pagamento',
  'Contratos de Trabalho',
  'Atestados e Licenças',
  'Produtos Focus',
  'Manuais e Guias',
];

function isDmsFolderObject(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  // Categorias do Plano de Contas e Centros de Custo nunca são pastas do DMS
  if (
    item.codigo !== undefined || 
    item.natureza !== undefined || 
    item.tipo === 'Despesa' || 
    item.tipo === 'Receita' || 
    item.saldoAcumuladoMensal !== undefined || 
    item.departamento !== undefined ||
    item.responsavel !== undefined
  ) {
    return false;
  }
  if (item.caminhoCompleto || item.moduloVinculado) return true;
  if (item.nome && DMS_FOLDER_NAMES.includes(item.nome) && !item.codigo && !item.tipo && !item.clienteId && !item.valorContratado && !item.numeroContrato) {
    return true;
  }
  return false;
}

function isValidItem(table: string, item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  if (!item.id || typeof item.id !== 'string') return false;

  // Rejeitar pastas do DMS injetadas por colisão em outros módulos
  if (table !== 'focus_dms_pastas' && isDmsFolderObject(item)) {
    return false;
  }

  // Profile rows de usuário e colaborador pertencem aos seus respectivos serviços e não devem aparecer como clientes ou entidades gerais
  if (!table.includes('usuario') && !table.includes('user')) {
    if (item.name && typeof item.name === 'string' && item.name.startsWith('__')) return false;
    if (item.razaoSocial && typeof item.razaoSocial === 'string' && item.razaoSocial.startsWith('__')) return false;
    if (item.nomeFantasia && typeof item.nomeFantasia === 'string' && item.nomeFantasia.startsWith('__')) return false;
    if (item.status && typeof item.status === 'string' && (item.status.includes('profile') || item.status.includes('colaborador'))) return false;
  }

  if (table.includes('plano_contas') || table.includes('categorias')) {
    return Boolean(item.nome && typeof item.nome === 'string' && item.nome.trim().length > 0);
  }
  if (table.includes('centro_custos') || table.includes('centro-de-custos')) {
    return Boolean(item.nome && typeof item.nome === 'string' && item.nome.trim().length > 0);
  }

  if (table.includes('contas_receber') || table.includes('receber')) {
    const hasCliente = Boolean(item.cliente || item.clienteNome || item.cliente_nome);
    const hasDesc = Boolean(item.descricao);
    const hasValor = Number(item.valorOriginal ?? item.valor ?? 0) > 0;
    const hasNum = Boolean(item.numero && !item.numero.startsWith('REC-0000'));
    return hasCliente || hasDesc || hasValor || hasNum;
  }
  if (table.includes('contas_pagar') || table.includes('pagar')) {
    const hasForn = Boolean(item.fornecedor || item.fornecedorNome || item.fornecedor_nome);
    const hasDesc = Boolean(item.descricao);
    const hasValor = Number(item.valorOriginal ?? item.valor ?? 0) > 0;
    return hasForn || hasDesc || hasValor;
  }
  if (table.includes('fornecedores')) {
    const name = item.nomeFantasia || item.razaoSocial || item.name || item.nome;
    return Boolean(name && name.trim() !== '' && name !== 'Fornecedor Sem Nome');
  }
  if (table.includes('contratos')) {
    const hasContractData = Boolean(item.numeroContrato || item.objetoContrato || item.objeto || item.valorTotal || item.valorMensalidade || item.tipoContrato);
    if (!hasContractData && !item.nome) return false;
    if (DMS_FOLDER_NAMES.includes(item.nome)) return false;
    return true;
  }
  if (table.includes('projetos')) {
    if (DMS_FOLDER_NAMES.includes(item.nome) && !item.clienteId && !item.valorContratado) return false;
    return Boolean(item.nome && typeof item.nome === 'string' && item.nome.trim().length > 0);
  }
  if (table.includes('produtos')) {
    if (DMS_FOLDER_NAMES.includes(item.nome) && !item.preco && !item.categoria) return false;
    return Boolean((item.nome || item.name) && typeof (item.nome || item.name) === 'string');
  }
  if (table.includes('notificacoes')) {
    return Boolean(item.titulo && typeof item.titulo === 'string' && item.titulo.trim().length > 0);
  }
  if (table.includes('cobrancas') || table.includes('cobranca')) {
    return Boolean(item.id && (item.cliente || item.valor !== undefined || item.tituloReferencia));
  }

  if (table.includes('equipamento')) {
    return Boolean(item.id && (item.codigoPatrimonial || item.modelo || item.marca || item.categoria || item.nome));
  }
  if (table.includes('estoque') || table.includes('almoxarifado')) {
    return Boolean(item.id && (item.nome || item.descricao || item.codigo || item.categoria || item.localizacao || item.titulo || item.itemNome));
  }
  if (table.includes('licenca') || table.includes('software')) {
    return Boolean(item.id && (item.nome || item.fabricante || item.plano || item.software));
  }
  if (table.includes('patrimonio') || table.includes('ativo')) {
    return Boolean(item.id && (item.numeroPatrimonial || item.codigoInterno || item.categoria || item.nome || item.descricao));
  }
  if (table.includes('movimentac')) {
    return Boolean(item.id && (item.tipo || item.dataHora || item.equipamentoNome || item.estoqueItemNome || item.usuarioNome));
  }
  if (table.includes('inventario')) {
    return Boolean(item.id && (item.titulo || item.dataInicio || item.responsavelNome));
  }
  if (table.includes('manutenc')) {
    return Boolean(item.id && (item.equipamentoNome || item.equipamentoCodigo || item.descricao || item.tipo));
  }
  if (table.includes('fiscal')) {
    return Boolean(item.id && (item.numero || item.tipo || item.entidade || item.entidade_nome || item.entidadeNome));
  }
  if (table.includes('contas_bancarias') || table.includes('conta_bancaria')) {
    return Boolean(item.id && (item.banco || item.banco_nome || item.titular || item.nome_conta || item.conta || item.conta_corrente));
  }
  if (table.includes('extratos_bancarios') || table.includes('extrato')) {
    return Boolean(item.id && (item.historico || item.descricao_banco || item.descricao || item.valor !== undefined));
  }

  // Expurgar dados mockados residuais antigos em RH, Comercial e Assinaturas
  const LEGACY_MOCK_IDS = [
    'fer-1', 'fer-2', 'fer-3',
    'ben-1', 'ben-2', 'ben-3',
    'ciclo-1', 'ciclo-2',
    'doc-rh-1', 'doc-rh-2',
    'onb-1', 'onb-2', 'onb-3',
    'ponto-1', 'ponto-2', 'ponto-3',
    'treina-1', 'treina-2',
    'colab-1', 'colab-2', 'colab-3', 'colab-101', 'colab-102', 'colab-103', 'colab-104', 'colab-105', 'colab-106',
    'doc-sign-1', 'doc-sign-2', 'doc-sign-3',
    'mod-1', 'mod-2', 'mod-3',
    'cert-1', 'cert-2',
    'meta-1', 'meta-2', 'meta-3',
    'okr-1', 'okr-2',
    'prod-1', 'prod-2',
    'serv-1',
    'tab-1', 'tab-2',
    'prop-1', 'prop-2',
    'sc-1', 'sc-2',
    'pb-1', 'pb-2',
    'atv-1', 'atv-2', 'atv-3',
    'ag-1', 'ag-2', 'ag-3',
    'rc-1', 'rc-2',
    'reg-com-1', 'reg-com-2'
  ];

  if (item.id && LEGACY_MOCK_IDS.includes(item.id)) {
    return false;
  }

  // Verificar nomes de colaboradores mockados específicos do RH
  if (table.startsWith('focus_rh_') || table.includes('ferias') || table.includes('colaborador')) {
    const nomeColab = item.colaboradorNome || item.colaborador || item.nomeCompleto || item.nome || '';
    if (['Mariana Souza', 'Lucas Rodrigues', 'Carlos Eduardo Oliveira', 'TechCorp'].includes(nomeColab)) {
      return false;
    }
  }

  return true;
}

/**
 * Retorna todas as chaves candidatas de armazenamento local para uma dada tabela/módulo
 */
export function getCandidateKeysForTable(table: string): string[] {
  const keys = new Set<string>([`focus_app_${table}`, table, `focus_${table}`]);

  if (table.includes('equipamento')) {
    [
      'focus_itam_equipamentos',
      'focus_app_focus_itam_equipamentos',
      'focus_equipamentos',
      'focus_app_equipamentos',
      'equipamentos',
      'focus_itam_equipamento',
      'focus_equipamento',
      'focus_patrimonio_equipamentos',
      'focus_app_patrimonio_equipamentos',
      'focus_app_focus_equipamentos',
    ].forEach((k) => keys.add(k));
  }

  if (table.includes('estoque') || table.includes('almoxarifado')) {
    [
      'focus_itam_estoque_itens',
      'focus_app_focus_itam_estoque_itens',
      'focus_estoque_itens',
      'focus_app_estoque_itens',
      'focus_estoque',
      'focus_app_estoque',
      'estoque_itens',
      'estoque',
      'focus_itam_estoque',
      'focus_app_itam_estoque',
      'focus_almoxarifado',
      'focus_app_almoxarifado',
      'focus_itens_estoque',
      'focus_app_itens_estoque',
      'focus_app_focus_estoque_itens',
      'focus_app_focus_estoque',
    ].forEach((k) => keys.add(k));
  }

  if (table.includes('licenca') || table.includes('software')) {
    [
      'focus_itam_licencas',
      'focus_app_focus_itam_licencas',
      'focus_licencas',
      'focus_app_licencas',
      'licencas',
      'focus_licenca',
      'focus_app_licenca',
      'focus_softwares',
      'focus_software_licencas',
      'focus_app_focus_licencas',
    ].forEach((k) => keys.add(k));
  }

  if (table.includes('patrimonio') || table.includes('ativo')) {
    [
      'focus_itam_patrimonios',
      'focus_app_focus_itam_patrimonios',
      'focus_patrimonios',
      'focus_app_patrimonios',
      'focus_patrimonio',
      'focus_app_patrimonio',
      'patrimonios',
      'patrimonio',
      'focus_ativos',
      'focus_app_ativos',
      'focus_ativos_patrimonio',
      'focus_app_focus_patrimonios',
    ].forEach((k) => keys.add(k));
  }

  if (table.includes('movimentac')) {
    [
      'focus_itam_movimentacoes',
      'focus_app_focus_itam_movimentacoes',
      'focus_movimentacoes',
      'focus_app_movimentacoes',
      'movimentacoes',
      'focus_movimentacao',
      'focus_app_focus_movimentacoes',
    ].forEach((k) => keys.add(k));
  }

  if (table.includes('inventario')) {
    [
      'focus_itam_inventarios',
      'focus_app_focus_itam_inventarios',
      'focus_inventarios',
      'focus_app_inventarios',
      'inventarios',
      'focus_inventario',
      'focus_app_focus_inventarios',
    ].forEach((k) => keys.add(k));
  }

  if (table.includes('manutenc')) {
    [
      'focus_itam_manutencoes',
      'focus_app_focus_itam_manutencoes',
      'focus_manutencoes',
      'focus_app_manutencoes',
      'manutencoes',
      'focus_manutencao',
      'focus_app_focus_manutencoes',
    ].forEach((k) => keys.add(k));
  }

  if (table.includes('conta') && table.includes('bancari')) {
    [
      'focus_contas_bancarias',
      'focus_app_focus_contas_bancarias',
      'contas_bancarias',
      'focus_app_contas_bancarias',
    ].forEach((k) => keys.add(k));
  }

  if (table.includes('extrato')) {
    [
      'focus_extratos',
      'focus_app_focus_extratos',
      'extratos_bancarios',
      'focus_extratos_bancarios',
      'focus_app_extratos_bancarios',
      'extratos',
    ].forEach((k) => keys.add(k));
  }

  if (table.includes('fiscal')) {
    [
      'focus_fiscal_documentos',
      'focus_app_focus_fiscal_documentos',
      'fiscal_documentos',
      'focus_app_fiscal_documentos',
      'focus_documentos_fiscais',
    ].forEach((k) => keys.add(k));
  }

  if (table.includes('cobranca')) {
    [
      'focus_cobrancas',
      'focus_app_focus_cobrancas',
      'cobrancas',
      'focus_app_cobrancas',
      'focus_cobrancas_multicanal',
    ].forEach((k) => keys.add(k));
  }

  return Array.from(keys);
}

/**
 * Helper to safely read from localStorage and auto-heal contaminated cache with multi-key recovery
 */
function readLocalCache<T>(table: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const keysToTry = getCandidateKeysForTable(table);
    const aggregatedItems = new Map<string, any>();
    let foundAnyValidKey = false;
    let foundExplicitEmptyArray = false;

    for (const k of keysToTry) {
      const raw = safeGetItem(k);
      if (raw !== null && raw !== undefined) {
        foundAnyValidKey = true;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            if (parsed.length === 0) {
              foundExplicitEmptyArray = true;
            }
            // Auto-heal: se o cache foi contaminado por pastas do DMS, expurgar a chave
            if (table !== 'focus_dms_pastas' && parsed.some(isDmsFolderObject)) {
              safeRemoveItem(k);
              continue;
            }

            const valid = parsed.filter((it) => isValidItem(table, it)).map((it) => {
              if (table.includes('dms_pasta') || table === 'dms_pastas' || table === 'focus_dms_pastas') {
                const newId = toValidUuid(it.id);
                const newParent = toSafeParentPastaId(it.parentId ?? it.parent_id ?? it.pasta_pai_id, it.id);
                return {
                  ...it,
                  id: newId,
                  parentId: newParent,
                };
              }
              return it;
            });
            valid.forEach((it) => {
              if (it && it.id && !aggregatedItems.has(String(it.id))) {
                aggregatedItems.set(String(it.id), it);
              }
            });
          }
        } catch {}
      }
    }

    if (aggregatedItems.size > 0) {
      return Array.from(aggregatedItems.values());
    }

    if (foundExplicitEmptyArray || (foundAnyValidKey && aggregatedItems.size === 0)) {
      return [];
    }
  } catch {}
  return fallback;
}

/**
 * Helper to safely write to localStorage across all candidate aliases
 */
function writeLocalCache<T>(table: string, items: T[]) {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(items);
    const keys = getCandidateKeysForTable(table);
    for (const k of keys) {
      safeSetItem(k, serialized);
    }
  } catch {}
}

function toSnakeCasePayload(table: string, item: any): any {
  const validId = toValidUuid(item.id);
  const base: any = { id: validId, updated_at: new Date().toISOString() };

  if (table.includes('dms_pasta') || table === 'dms_pastas' || table === 'focus_dms_pastas') {
    const parentIdVal = item.parentId ?? item.parent_id ?? item.pasta_pai_id;
    const safeParentId = toSafeParentPastaId(parentIdVal, item.id);
    return {
      id: validId,
      nome: String(item.nome || 'Pasta'),
      pasta_pai_id: safeParentId,
      caminho_completo: String(item.caminhoCompleto || item.caminho_completo || `/${item.nome || 'Pasta'}`),
      modulo_vinculado: (item.moduloVinculado || item.modulo_vinculado) ? String(item.moduloVinculado || item.modulo_vinculado) : null,
      updated_at: new Date().toISOString(),
    };
  }

  if (table.includes('dms_doc') || table === 'dms_documentos' || table === 'focus_dms_documentos') {
    return {
      id: validId,
      pasta_id: toNullableValidUuid(item.pastaId || item.pasta_id),
      nome_arquivo: item.nomeArquivo || item.nome_arquivo || item.nome || `Doc_${validId.slice(0, 6)}`,
      extensao: item.extensao || item.nome?.split('.').pop() || 'pdf',
      tamanho_bytes: Number(item.tamanhoBytes ?? item.tamanho_bytes ?? 0) || 0,
      url_storage: (item.urlConteudo && item.urlConteudo.startsWith('data:') && item.urlConteudo.length > 2000)
        ? 'data:blob-stored-locally'
        : (item.urlStorage || item.url_storage || item.urlConteudo || item.url_conteudo || 'https://placeholder.dms'),
      tipo_documento: item.categoria || item.tipoDocumento || item.tipo_documento || item.moduloOrigem || 'Geral',
      entidade_tipo: item.entidadeTipo || item.entidade_tipo || item.moduloOrigem || item.modulo_origem || 'Geral',
      entidade_id: toNullableValidUuid(item.entidadeId || item.entidade_id || item.clienteId || item.projetoId || item.contratoId || item.colaboradorId),
      tags: Array.isArray(item.tags) ? item.tags : [],
      updated_at: new Date().toISOString(),
    };
  }

  if (table.includes('dev_git_repos') || table === 'dev_git_repos' || table === 'focus_dev_git') {
    return {
      id: validId,
      nome: item.nome || item.nomeRepositorio || item.nome_repositorio || 'Repositorio',
      url: item.url || item.urlRepositorio || item.url_repositorio || 'https://github.com/empresa/repo',
      provider: item.provider || item.provedor || 'github',
      branch_padrao: item.branchPadrao || item.branch_padrao || item.branchPrincipal || item.branch_principal || 'main',
      status: item.status || 'Ativo',
      updated_at: new Date().toISOString(),
    };
  }

  if (table.includes('dev_backlog') || table === 'dev_backlog' || table === 'focus_dev_backlog') {
    return {
      id: validId,
      produto_id: toNullableValidUuid(item.produtoId || item.produto_id || item.projetoId || item.projeto_id),
      titulo: item.titulo || item.nome || 'Item de Backlog',
      tipo: item.tipo || 'feature',
      prioridade: item.prioridade || 'media',
      status: item.status || 'backlog',
      estimativa_horas: Number(item.estimativaHoras ?? item.estimativa_horas ?? item.storyPoints ?? item.story_points ?? 0) || 0,
      responsavel_nome: item.responsavelNome || item.responsavel_nome || item.responsavel || 'Equipe Dev',
      descricao: item.descricao || '',
      updated_at: new Date().toISOString(),
    };
  }

  if (table.includes('dev_sprints') || table === 'dev_sprints' || table === 'focus_dev_sprints') {
    return {
      id: validId,
      nome: item.nome || 'Sprint',
      meta: item.meta || item.objetivo || '',
      data_inicio: item.dataInicio ? String(item.dataInicio).split('T')[0] : (item.data_inicio ? String(item.data_inicio).split('T')[0] : new Date().toISOString().split('T')[0]),
      data_fim: item.dataFim ? String(item.dataFim).split('T')[0] : (item.data_fim ? String(item.data_fim).split('T')[0] : new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]),
      status: item.status || 'planejada',
      velocity: Number(item.velocity ?? 0) || 0,
      pontos_planejados: Number(item.pontosPlanejados ?? item.pontos_planejados ?? item.totalPontosEstimados ?? item.total_pontos_estimados ?? 0) || 0,
      pontos_entregues: Number(item.pontosEntregues ?? item.pontos_entregues ?? item.totalPontosEntregues ?? item.total_pontos_entregues ?? 0) || 0,
      updated_at: new Date().toISOString(),
    };
  }

  if (table.includes('fornecedores') || table === 'fornecedores' || table === 'focus_fornecedores') {
    return {
      ...base,
      codigo: item.codigo || `FOR-${validId.slice(0, 4).toUpperCase()}`,
      razao_social: item.razaoSocial || item.razao_social || item.nomeFantasia || item.nome || 'Fornecedor',
      nome_fantasia: item.nomeFantasia || item.nome_fantasia || item.razaoSocial || item.razao_social || 'Fornecedor',
      cnpj: item.cnpj || item.documento || '',
      email: item.email || null,
      telefone: item.telefone || null,
      categoria: item.categoria || 'Geral',
      status: item.status === 'Inativo' ? 'Inativo' : 'Ativo',
      updated_at: new Date().toISOString(),
    };
  }

  if (table.includes('notificac')) {
    return {
      ...base,
      titulo: item.titulo || 'Notificação',
      mensagem: item.descricao || item.mensagem || '',
      descricao: item.descricao || item.mensagem || '',
      origem: item.origem || 'Sistema',
      tipo: item.tipo || 'Informação',
      prioridade: item.prioridade || 'Normal',
      lida: Boolean(item.lida),
      arquivada: Boolean(item.arquivada),
      data_criacao: item.dataCriacao || item.data_criacao || new Date().toISOString(),
      responsavel: item.responsavel || 'Sistema',
      usuario_destino: item.usuarioDestino || item.usuario_destino || 'Você',
      target_url: item.targetUrl || item.target_url || item.link_redirecionamento || '/',
      link_redirecionamento: item.targetUrl || item.target_url || item.link_redirecionamento || '/',
      entidade_id: toNullableValidUuid(item.entidadeId || item.entidade_id),
    };
  }

  if (table.includes('equipamento')) {
    return {
      ...base,
      codigo_patrimonial: item.codigoPatrimonial || item.codigo_patrimonial || `PAT-${validId.slice(0, 4).toUpperCase()}`,
      categoria: item.categoria || 'Outros',
      marca: item.marca || 'Genérico',
      modelo: item.modelo || item.nome || 'Equipamento',
      numero_serie: item.numeroSerie || item.numero_serie || null,
      data_aquisicao: item.dataAquisicao || item.data_aquisicao || new Date().toISOString().split('T')[0],
      valor_compra: Number(item.valorCompra ?? item.valor_compra ?? item.valor ?? 0) || 0,
      garantia_meses: Number(item.garantiaMeses ?? item.garantia_meses ?? 12) || 12,
      situacao: item.situacao || 'Disponível',
      departamento: item.departamento || null,
      colaborador_id: toNullableValidUuid(item.colaboradorId || item.colaborador_id),
      colaborador_nome: item.colaboradorNome || item.colaborador_nome || null,
      local_fisica: item.localFisica || item.local_fisica || 'Estoque Central',
      notebook_specs: item.notebookSpecs || item.notebook_specs || {},
      monitor_specs: item.monitorSpecs || item.monitor_specs || {},
      timeline: Array.isArray(item.timeline) ? item.timeline : [],
      observacoes: item.observacoes || null,
    };
  }

  if (table.includes('estoque') || table.includes('almoxarifado')) {
    return {
      ...base,
      codigo: item.codigo || `EST-${validId.slice(0, 4).toUpperCase()}`,
      nome: item.nome || item.titulo || item.itemNome || 'Item de Estoque',
      descricao: item.descricao || null,
      categoria: item.categoria || 'Geral',
      quantidade: Number(item.quantidade ?? 0) || 0,
      quantidade_minima: Number(item.quantidadeMinima ?? item.quantidade_minima ?? 0) || 0,
      valor_unitario: Number(item.valorUnitario ?? item.valor_unitario ?? 0) || 0,
      estado_conservacao: item.estadoConservacao || item.estado_conservacao || 'Bom',
      localizacao: item.localizacao || 'Almoxarifado Central',
      status: item.status || 'Disponível',
      responsavel_nome: item.responsavelNome || item.responsavel_nome || null,
      observacoes: item.observacoes || null,
    };
  }

  if (table.includes('licenca') || table.includes('software')) {
    return {
      ...base,
      nome: item.nome || item.software || 'Software',
      fabricante: item.fabricante || 'Fabricante',
      plano: item.plano || item.tipoLicenca || 'SaaS',
      tipo: item.tipo || 'Assinatura',
      quantidade_total: Number(item.quantidadeTotal ?? item.quantidadeContratada ?? item.quantidade ?? 1) || 1,
      quantidade_usada: Number(item.quantidadeUsada ?? item.quantidadeEmUso ?? 0) || 0,
      data_compra: item.dataCompra || new Date().toISOString().split('T')[0],
      vencimento: item.vencimento || item.dataExpiracao || item.dataRenovacao || null,
      valor: Number(item.valor ?? item.valorUnitario ?? 0) || 0,
      responsavel_nome: item.responsavelNome || item.responsavel || null,
      centro_custo_nome: item.centroCustoNome || null,
      observacoes: item.observacoes || null,
    };
  }

  if (table.includes('patrimonio') || table.includes('ativo')) {
    return {
      ...base,
      numero_patrimonial: item.numeroPatrimonial || item.codigoPatrimonial || `PAT-${validId.slice(0, 4).toUpperCase()}`,
      codigo_interno: item.codigoInterno || `AST-${validId.slice(0, 4).toUpperCase()}`,
      categoria: item.categoria || 'Geral',
      valor_compra: Number(item.valorCompra ?? item.valor ?? item.valorAquisicao ?? 0) || 0,
      valor_atual: Number(item.valorAtual ?? item.valorCompra ?? 0) || 0,
      vida_util_anos: Number(item.vidaUtilAnos ?? 5) || 5,
      depreciacao_acumulada: Number(item.depreciacaoAcumulada ?? 0) || 0,
      estado_conservacao: item.estadoConservacao || 'Bom',
      situacao: item.situacao || item.status || 'Ativo',
      centro_custo_nome: item.centroCustoNome || item.departamento || null,
    };
  }

  if (table.includes('movimentac')) {
    return {
      ...base,
      tipo: item.tipo || 'Transferência',
      equipamento_id: toNullableValidUuid(item.equipamentoId || item.equipamento_id),
      equipamento_nome: item.equipamentoNome || item.equipamento_nome || null,
      estoque_item_id: toNullableValidUuid(item.estoqueItemId || item.estoque_item_id),
      estoque_item_nome: item.estoqueItemNome || item.estoque_item_nome || null,
      usuario_id: toNullableValidUuid(item.usuarioId || item.usuario_id),
      usuario_nome: item.usuarioNome || item.usuario_nome || 'Administrador',
      data_hora: item.dataHora || item.data_hora || new Date().toISOString(),
      origem: item.origem || 'Estoque',
      destino: item.destino || 'Colaborador',
      responsavel_nome: item.responsavelNome || item.responsavel_nome || 'Responsável',
      observacoes: item.observacoes || item.motivo || null,
    };
  }

  if (table.includes('manutenc')) {
    return {
      ...base,
      equipamento_id: toNullableValidUuid(item.equipamentoId || item.equipamento_id),
      equipamento_codigo: item.equipamentoCodigo || item.equipamento_codigo || null,
      equipamento_nome: item.equipamentoNome || item.equipamento_nome || 'Equipamento',
      tipo: item.tipo || 'Preventiva',
      data_abertura: item.dataAbertura || item.data_abertura || item.data || new Date().toISOString().split('T')[0],
      data_conclusao: item.dataConclusao || item.data_conclusao || null,
      descricao: item.descricao || 'Manutenção de equipamento',
      valor: Number(item.valor ?? item.custoTotal ?? item.custo_total ?? 0) || 0,
      responsavel_nome: item.responsavelNome || item.responsavel_nome || 'Técnico',
      status: item.status || 'Em Execução',
      observacoes: item.observacoes || item.laudoTecnico || null,
    };
  }

  if (table.includes('inventario')) {
    return {
      ...base,
      titulo: item.titulo || item.nome || 'Inventário Periódico',
      data_inicio: item.dataInicio || item.data_inicio || new Date().toISOString().split('T')[0],
      data_fim: item.dataFim || item.dataConclusao || item.data_fim || null,
      status: item.status || 'Em Progresso',
      responsavel_nome: item.responsavelNome || item.responsavel_nome || 'Gestor de Patrimônio',
      localizacao: item.localizacao || 'Sede Principal',
      itens: Array.isArray(item.itens) ? item.itens : [],
      divergencias_count: Number(item.divergenciasCount ?? item.divergenciasEncontradas ?? item.divergencias_count ?? 0) || 0,
    };
  }

  if (table.includes('centros_custo') || table.includes('centro_custos')) {
    return {
      ...base,
      codigo: item.codigo || `CC-${validId.slice(0, 4).toUpperCase()}`,
      nome: item.nome || 'Centro de Custo',
      tipo: item.tipo || 'Despesa',
      categoria: item.categoria || 'Geral',
      departamento: item.departamento || 'Geral',
      responsavel_nome: item.responsavelNome || item.responsavel_nome || item.responsavel || 'Responsável',
      responsavel_email: item.responsavelEmail || item.responsavel_email || null,
      orcamento_mensal: Number(item.orcamentoMensal ?? item.orcamento_mensal ?? 0) || 0,
      orcamento_anual: Number(item.orcamentoAnual ?? item.orcamento_anual ?? 0) || 0,
      gasto_acumulado: Number(item.gastoAcumulado ?? item.gasto_acumulado ?? 0) || 0,
      status: item.status || 'Ativo',
      descricao: item.descricao || null,
      centro_pai_id: toNullableValidUuid(item.centroPaiId || item.centro_pai_id),
    };
  }

  if (table.includes('plano_contas') || table.includes('categorias')) {
    return {
      ...base,
      codigo: item.codigo || `PC-${validId.slice(0, 4).toUpperCase()}`,
      nome: item.nome || 'Categoria',
      tipo: item.tipo || 'Despesa',
      natureza: item.natureza || 'Operacional',
      status: item.status === 'Inativa' ? 'Inativo' : (item.status || 'Ativo'),
      cor: item.cor || '#64748B',
      descricao: item.descricao || null,
      categoria_pai_id: toNullableValidUuid(item.parentId || item.categoriaPaiId || item.categoria_pai_id),
    };
  }

  if (table.includes('cobrancas') || table.includes('cobranca')) {
    const canalList = Array.isArray(item.canal) ? item.canal : (item.canal ? [item.canal] : ['WhatsApp', 'E-mail']);
    const rawTimeline = Array.isArray(item.timeline) ? item.timeline : (Array.isArray(item.historicoInteracoes) ? item.historicoInteracoes : (Array.isArray(item.historico_interacoes) ? item.historico_interacoes : []));
    const rawStatus = item.statusCobranca || item.status || 'Pendente';
    const rawValor = Number(item.valor ?? item.valorTotal ?? item.valor_total ?? 0) || 0;
    const rawVenc = item.vencimento || item.dataVencimento || item.data_vencimento || new Date().toISOString().split('T')[0];

    const metaPayload = {
      canal: canalList,
      vencimento: rawVenc,
      data_vencimento: rawVenc,
      data_hora_envio: item.dataHoraEnvio || item.data_hora_envio || null,
      data_hora_pagamento: item.dataHoraPagamento || item.data_hora_pagamento || null,
      status_cobranca: item.statusCobranca || rawStatus,
      status_entrega: item.statusEntrega || item.status_entrega || 'Pendente',
      status_leitura: item.statusLeitura || item.status_leitura || 'Não lida',
      responsavel: item.responsavel || 'Usuário Focus',
      mensagem_personalizada: item.mensagemPersonalizada || item.mensagem_personalizada || item.mensagem || null,
      pix_copia_e_cola: item.pixCopiaECola || item.pix_copia_e_cola || null,
      qr_code_pix: item.qrCodePix || item.qr_code_pix || null,
      linha_digitavel: item.linhaDigitavel || item.linha_digitavel || null,
      link_boleto: item.linkBoleto || item.link_boleto || null,
      agendamento: item.agendamento || null,
      lembretes_programados: Array.isArray(item.lembretesProgramados) ? item.lembretesProgramados : (item.lembretes_programados || []),
      resposta_cliente: item.respostaCliente || item.resposta_cliente || null,
      classificacao_resposta: item.classificacaoResposta || item.classificacao_resposta || null,
      timeline: rawTimeline,
    };

    return {
      id: validId,
      cliente_id: toNullableValidUuid(item.clienteId || item.cliente_id),
      cliente_nome: item.cliente || item.clienteNome || item.cliente_nome || 'Cliente',
      titulo_id: toNullableValidUuid(item.tituloId || item.titulo_id),
      titulo_referencia: item.tituloReferencia || item.titulo_referencia || item.referencia || `REC-${validId.slice(0, 4).toUpperCase()}`,
      valor_total: rawValor,
      dias_atraso: Number(item.diasAtraso ?? item.dias_atraso ?? 0) || 0,
      etapa_atual: item.etapaAtual || item.etapa_atual || 'Lembrete Preventivo',
      status: rawStatus,
      historico_interacoes: metaPayload,
      updated_at: new Date().toISOString(),
    };
  }

  if (table.includes('produtos')) {
    return {
      ...base,
      codigo: item.codigo || `PRD-${validId.slice(0, 4).toUpperCase()}`,
      nome: item.nome || 'Produto Focus',
      categoria: item.categoria || 'SaaS',
      descricao_breve: item.descricaoBreve || item.descricao_breve || item.descricao || null,
      status: item.status || 'Ativo',
      versao_atual: item.versaoAtual || item.versao_atual || '1.0.0',
      planos: Array.isArray(item.planos) ? item.planos : [],
      roadmap: Array.isArray(item.roadmap) ? item.roadmap : [],
      releases: Array.isArray(item.releases) ? item.releases : [],
      funcionalidades: Array.isArray(item.funcionalidades) ? item.funcionalidades : [],
    };
  }

  if (table.includes('contas_bancarias') || table.includes('conta_bancaria')) {
    const rawConta = item.conta || item.contaCorrente || item.conta_corrente || '';
    const rawDigito = item.digito || item.bancoCodigo || item.banco_codigo || '';
    const rawBanco = item.banco || item.bancoNome || item.banco_nome || 'Banco';
    const rawTitular = item.titular || item.nomeConta || item.nome_conta || 'Conta Bancária';
    return {
      ...base,
      nome_conta: rawTitular,
      banco_nome: rawBanco,
      banco: rawBanco,
      banco_codigo: rawDigito || '000',
      agencia: item.agencia || '',
      conta: rawConta,
      digito: rawDigito,
      conta_corrente: rawConta.includes('-') ? rawConta : `${rawConta}${rawDigito ? `-${rawDigito}` : ''}`,
      tipo_conta: item.tipoConta || item.tipo_conta || 'Corrente',
      titular: rawTitular,
      cnpj: item.cnpj || '',
      chave_pix: item.chavePix || item.chave_pix || '',
      saldo_inicial: Number(item.saldoInicial ?? item.saldo_inicial ?? 0) || 0,
      saldo_atual: Number(item.saldoAtual ?? item.saldo_atual ?? 0) || 0,
      status: (item.status === 'Inativa' || item.status === 'Inativo') ? 'Inativa' : 'Ativa',
    };
  }

  if (table.includes('extratos_bancarios') || table.includes('extrato')) {
    const rawDesc = item.historico || item.descricaoBanco || item.descricao_banco || item.descricao || 'Movimentação Bancária';
    const rawDoc = item.documento || item.documentoRef || item.documento_ref || null;
    const rawData = item.data || item.dataMovimentacao || item.data_movimentacao || new Date().toISOString().split('T')[0];
    const rawStatus = item.status || item.statusConciliacao || item.status_conciliacao || 'Não Conciliado';
    return {
      ...base,
      conta_bancaria_id: toNullableValidUuid(item.contaBancariaId || item.conta_bancaria_id),
      data_movimentacao: String(rawData).split('T')[0],
      data: String(rawData).split('T')[0],
      descricao_banco: rawDesc,
      historico: rawDesc,
      documento_ref: rawDoc,
      documento: rawDoc,
      tipo: item.tipo || 'Crédito',
      valor: Number(item.valor ?? 0) || 0,
      status_conciliacao: rawStatus,
      status: rawStatus,
      conta_vinculada_id: toNullableValidUuid(item.lancamentoFinanceiroId || item.contaVinculadaId || item.conta_vinculada_id),
      lancamento_financeiro_id: toNullableValidUuid(item.lancamentoFinanceiroId || item.contaVinculadaId || item.conta_vinculada_id),
      conta_vinculada_tipo: item.contaVinculadaTipo || item.conta_vinculada_tipo || null,
    };
  }

  if (table.includes('fiscal_documentos') || table === 'fiscal_documentos' || table === 'focus_fiscal_documentos' || table === 'focus_documentos_fiscais') {
    const ent = item.entidade || {};
    const vinc = item.vinculos || {};
    const entNome = ent.nome || item.entidadeNome || item.entidade_nome || 'Cliente Fiscal';
    const numDoc = item.numero || `${validId.slice(0, 6).toUpperCase()}`;
    return {
      id: validId,
      tipo: item.tipo || 'NFS-e',
      numero: numDoc,
      serie: item.serie || '1',
      chave_acesso: item.chaveAcesso || item.chave_acesso || null,
      data_emissao: item.dataEmissao ? String(item.dataEmissao).split('T')[0] : (item.data_emissao ? String(item.data_emissao).split('T')[0] : new Date().toISOString().split('T')[0]),
      data_entrada: item.dataEntrada ? String(item.dataEntrada).split('T')[0] : (item.data_entrada ? String(item.data_entrada).split('T')[0] : null),
      entidade_tipo: ent.tipo || item.entidadeTipo || item.entidade_tipo || 'Cliente',
      entidade_id: toNullableValidUuid(ent.id || item.entidadeId || item.entidade_id),
      entidade_nome: entNome,
      entidade_cnpj_cpf: ent.cnpjCpf || item.entidadeCnpjCpf || item.entidade_cnpj_cpf || null,
      projeto_id: toNullableValidUuid(vinc.projetoId || item.projetoId || item.projeto_id),
      projeto_nome: vinc.projetoNome || item.projetoNome || item.projeto_nome || null,
      centro_custo: vinc.centroCusto || item.centroCusto || item.centro_custo || null,
      valor_total: Number(item.valorTotal ?? item.valor_total ?? item.valor ?? 0) || 0,
      impostos: Array.isArray(item.impostos) ? item.impostos : [],
      retencoes: Array.isArray(item.retencoes) ? item.retencoes : [],
      anexos: Array.isArray(item.anexos) ? item.anexos : [],
      status: item.status || 'Emitido',
      observacoes: item.observacoes || null,
      updated_at: new Date().toISOString(),
    };
  }

  // Conversão genérica automática camelCase -> snake_case para todas as novas tabelas
  const converted = objectToSnakeCase(item);
  return { ...converted, id: validId, updated_at: new Date().toISOString() };
}

function camelToSnakeKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function objectToSnakeCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(objectToSnakeCase);
  const result: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const snakeK = camelToSnakeKey(k);
    result[snakeK] = v;
  }
  return result;
}

function objectFromSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(objectFromSnakeCase);
  const result: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const camelK = snakeToCamelKey(k);
    result[camelK] = v;
  }
  return { ...result, ...obj };
}

function fromSnakeCaseRow(table: string, row: any): any {
  if (!row) return row;

  if (table.includes('dms_pasta') || table === 'dms_pastas' || table === 'focus_dms_pastas') {
    return {
      ...row,
      id: String(row.id),
      parentId: row.pasta_pai_id ?? row.parent_id ?? row.parentId ?? null,
      caminhoCompleto: row.caminho_completo || row.caminhoCompleto || `/${row.nome}`,
      moduloVinculado: row.modulo_vinculado || row.moduloVinculado,
      dataCriacao: row.data_criacao || row.created_at || row.dataCriacao || new Date().toISOString(),
      criadoPor: row.criado_por || row.criadoPor || 'Sistema Integrado',
    };
  }

  if (table.includes('dms_doc') || table === 'dms_documentos' || table === 'focus_dms_documentos') {
    return {
      ...row,
      id: String(row.id),
      nome: row.nome_arquivo || row.nome || 'Documento',
      tamanhoBytes: Number(row.tamanho_bytes ?? row.tamanhoBytes ?? 0),
      pastaId: row.pasta_id || row.pastaId,
      caminhoPasta: row.caminho_pasta || row.caminhoPasta || '/',
      moduloOrigem: row.tipo_documento || row.modulo_origem || row.moduloOrigem || 'Geral',
      categoria: row.tipo_documento || row.categoria || 'Geral',
      responsavelUpload: row.responsavel_upload || row.responsavelUpload || 'Sistema',
      dataUpload: row.created_at || row.data_upload || row.dataUpload || new Date().toISOString(),
      dataUltimaAlteracao: row.updated_at || row.data_upload || row.dataUpload || new Date().toISOString(),
      versaoAtual: row.versao_atual || row.versaoAtual || '1.0',
      urlConteudo: row.url_storage || row.url_conteudo || row.urlConteudo,
      historicoVersoes: Array.isArray(row.historico_versoes) ? row.historico_versoes : (row.historicoVersoes || []),
      clienteId: row.entidade_id || row.cliente_id || row.clienteId,
      projetoId: row.projeto_id || row.projetoId,
      contratoId: row.contrato_id || row.contratoId,
      colaboradorId: row.colaborador_id || row.colaboradorId,
    };
  }

  if (table.includes('dev_git_repos') || table === 'dev_git_repos' || table === 'focus_dev_git') {
    return {
      ...row,
      id: String(row.id),
      nomeRepositorio: row.nome || row.nome_repositorio || row.nomeRepositorio || 'Repositorio',
      urlRepositorio: row.url || row.url_repositorio || row.urlRepositorio || 'https://github.com',
      provedor: row.provider || row.provedor || 'github',
      branchPrincipal: row.branch_padrao || row.branch_principal || row.branchPrincipal || 'main',
      status: row.status || 'Ativo',
    };
  }

  if (table.includes('dev_backlog') || table === 'dev_backlog' || table === 'focus_dev_backlog') {
    return {
      ...row,
      id: String(row.id),
      produtoId: row.produto_id || row.produtoId,
      titulo: row.titulo || row.nome || 'Item de Backlog',
      tipo: row.tipo || 'feature',
      prioridade: row.prioridade || 'media',
      status: row.status || 'backlog',
      storyPoints: Number(row.estimativa_horas ?? row.storyPoints ?? 0),
      responsavel: row.responsavel_nome || row.responsavel || 'Equipe Dev',
      descricao: row.descricao || '',
      codigo: `DEV-${String(row.id).slice(0, 4).toUpperCase()}`,
      criadoEm: row.created_at || new Date().toISOString(),
      atualizadoEm: row.updated_at || new Date().toISOString(),
    };
  }

  if (table.includes('dev_sprints') || table === 'dev_sprints' || table === 'focus_dev_sprints') {
    return {
      ...row,
      id: String(row.id),
      nome: row.nome || 'Sprint',
      objetivo: row.meta || row.objetivo || '',
      dataInicio: row.data_inicio || row.dataInicio || new Date().toISOString().split('T')[0],
      dataFim: row.data_fim || row.dataFim || new Date().toISOString().split('T')[0],
      status: row.status || 'planejada',
      totalPontosEstimados: Number(row.pontos_planejados ?? row.totalPontosEstimados ?? 0),
      totalPontosEntregues: Number(row.pontos_entregues ?? row.totalPontosEntregues ?? 0),
    };
  }

  if (table.includes('notificac')) {
    return {
      ...row,
      id: String(row.id),
      titulo: row.titulo || 'Notificação',
      descricao: row.descricao || row.mensagem || '',
      origem: row.origem || 'Sistema',
      tipo: row.tipo || 'Informação',
      prioridade: row.prioridade || 'Normal',
      lida: Boolean(row.lida),
      arquivada: Boolean(row.arquivada),
      dataCriacao: row.data_criacao || row.created_at || new Date().toISOString(),
      responsavel: row.responsavel || 'Sistema',
      usuarioDestino: row.usuario_destino || 'Você',
      targetUrl: row.target_url || row.link_redirecionamento || '/',
      entidadeId: row.entidade_id || undefined,
    };
  }

  if (table.includes('equipamento')) {
    return {
      ...objectFromSnakeCase(row),
      id: String(row.id),
      codigoPatrimonial: row.codigo_patrimonial || row.codigoPatrimonial || '',
      categoria: row.categoria || 'Notebook',
      marca: row.marca || '',
      modelo: row.modelo || '',
      numeroSerie: row.numero_serie || row.numeroSerie || '',
      valorCompra: Number(row.valor_compra ?? row.valorCompra ?? 0) || 0,
      garantiaMeses: Number(row.garantia_meses ?? row.garantiaMeses ?? 12),
      dataAquisicao: row.data_aquisicao || row.dataAquisicao || '',
      situacao: row.situacao || 'Disponível',
      departamento: row.departamento || '',
      localFisica: row.local_fisica || row.localFisica || 'Estoque Central',
      colaboradorNome: row.colaborador_nome || row.colaboradorNome || undefined,
      colaboradorId: row.colaborador_id || row.colaboradorId || undefined,
      notebookSpecs: row.notebook_specs || row.notebookSpecs || {},
      monitorSpecs: row.monitor_specs || row.monitorSpecs || {},
      timeline: Array.isArray(row.timeline) ? row.timeline : [],
      observacoes: row.observacoes || '',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  if (table.includes('estoque') || table.includes('almoxarifado')) {
    return {
      ...objectFromSnakeCase(row),
      id: String(row.id),
      codigo: row.codigo || `EST-${String(row.id).slice(0, 4).toUpperCase()}`,
      nome: row.nome || 'Item de Estoque',
      descricao: row.descricao || '',
      categoria: row.categoria || 'Geral',
      quantidade: Number(row.quantidade ?? 0) || 0,
      quantidadeMinima: Number(row.quantidade_minima ?? row.quantidadeMinima ?? 0) || 0,
      valorUnitario: Number(row.valor_unitario ?? row.valorUnitario ?? 0) || 0,
      estadoConservacao: row.estado_conservacao || row.estadoConservacao || 'Bom',
      localizacao: row.localizacao || 'Almoxarifado Central',
      status: row.status || 'Disponível',
      responsavelNome: row.responsavel_nome || row.responsavelNome || undefined,
      observacoes: row.observacoes || '',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  if (table.includes('licenca') || table.includes('software')) {
    const qtdTotal = Number(row.quantidade_total ?? row.quantidadeTotal ?? 1) || 1;
    const qtdUsada = Number(row.quantidade_usada ?? row.quantidadeUsada ?? row.quantidade_em_uso ?? 0) || 0;
    return {
      ...objectFromSnakeCase(row),
      id: String(row.id),
      nome: row.nome || row.software || 'Software',
      fabricante: row.fabricante || 'Fabricante',
      plano: row.plano || row.tipo_licenca || 'SaaS',
      tipo: row.tipo || 'Assinatura',
      quantidadeTotal: qtdTotal,
      quantidadeUsada: qtdUsada,
      quantidadeDisponivel: Number(row.quantidade_disponivel ?? (qtdTotal - qtdUsada)),
      dataCompra: row.data_compra || row.dataCompra || '',
      vencimento: row.vencimento || row.data_expiracao || '',
      valor: Number(row.valor ?? row.valor_unitario ?? 0) || 0,
      responsavelNome: row.responsavel_nome || row.responsavelNome || undefined,
      centroCustoNome: row.centro_custo_nome || row.centroCustoNome || undefined,
      observacoes: row.observacoes || '',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  if (table.includes('patrimonio') || table.includes('ativo')) {
    return {
      ...objectFromSnakeCase(row),
      id: String(row.id),
      numeroPatrimonial: row.numero_patrimonial || row.codigo_patrimonial || row.numeroPatrimonial || '',
      codigoInterno: row.codigo_interno || row.codigoInterno || '',
      categoria: row.categoria || 'Geral',
      valorCompra: Number(row.valor_compra ?? row.valorCompra ?? row.valor ?? 0) || 0,
      valorAtual: Number(row.valor_atual ?? row.valorAtual ?? 0) || 0,
      vidaUtilAnos: Number(row.vida_util_anos ?? row.vidaUtilAnos ?? 5) || 5,
      depreciacaoAcumulada: Number(row.depreciacao_acumulada ?? row.depreciacaoAcumulada ?? 0) || 0,
      estadoConservacao: row.estado_conservacao || row.estadoConservacao || 'Bom',
      situacao: row.situacao || row.status || 'Ativo',
      centroCustoNome: row.centro_custo_nome || row.centroCustoNome || null,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  if (table.includes('movimentac')) {
    return {
      ...objectFromSnakeCase(row),
      id: String(row.id),
      tipo: row.tipo || 'Transferência',
      equipamentoId: row.equipamento_id || row.equipamentoId || undefined,
      equipamentoNome: row.equipamento_nome || row.equipamentoNome || undefined,
      estoqueItemId: row.estoque_item_id || row.estoqueItemId || undefined,
      estoqueItemNome: row.estoque_item_nome || row.estoqueItemNome || undefined,
      usuarioId: row.usuario_id || row.usuarioId || 'usr-admin',
      usuarioNome: row.usuario_nome || row.usuarioNome || 'Administrador',
      dataHora: row.data_hora || row.dataHora || row.created_at || new Date().toLocaleString('pt-BR'),
      origem: row.origem || undefined,
      destino: row.destino || undefined,
      responsavelNome: row.responsavel_nome || row.responsavelNome || undefined,
      observacoes: row.observacoes || row.motivo || undefined,
    };
  }
  if (table.includes('manutenc')) {
    return {
      ...objectFromSnakeCase(row),
      id: String(row.id),
      equipamentoId: row.equipamento_id || row.equipamentoId || '',
      equipamentoCodigo: row.equipamento_codigo || row.equipamentoCodigo || '',
      equipamentoNome: row.equipamento_nome || row.equipamentoNome || 'Equipamento',
      tipo: row.tipo || 'Preventiva',
      data: row.data_abertura || row.dataAbertura || row.data || new Date().toISOString().split('T')[0],
      dataAbertura: row.data_abertura || row.dataAbertura || new Date().toISOString().split('T')[0],
      dataConclusao: row.data_conclusao || row.dataConclusao || undefined,
      descricao: row.descricao || 'Manutenção',
      valor: Number(row.valor ?? row.custo_total ?? row.custoTotal ?? 0) || 0,
      custoTotal: Number(row.valor ?? row.custo_total ?? row.custoTotal ?? 0) || 0,
      responsavelNome: row.responsavel_nome || row.responsavelNome || 'Técnico',
      status: row.status || 'Em Execução',
      observacoes: row.observacoes || row.laudo_tecnico || '',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  if (table.includes('inventario')) {
    return {
      ...objectFromSnakeCase(row),
      id: String(row.id),
      titulo: row.titulo || row.nome || 'Inventário',
      dataInicio: row.data_inicio || row.dataInicio || new Date().toISOString().split('T')[0],
      dataFim: row.data_fim || row.dataFim || row.data_conclusao || undefined,
      status: row.status || 'Em Progresso',
      responsavelNome: row.responsavel_nome || row.responsavelNome || 'Gestor de Patrimônio',
      localizacao: row.localizacao || 'Sede Principal',
      divergenciasCount: Number(row.divergencias_count ?? row.divergenciasCount ?? 0) || 0,
      itens: Array.isArray(row.itens) ? row.itens : [],
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
  if (table.includes('centros_custo') || table.includes('centro_custos')) {
    return {
      ...objectFromSnakeCase(row),
      id: String(row.id),
      codigo: row.codigo || `CC-${String(row.id).slice(0, 4).toUpperCase()}`,
      nome: row.nome || 'Centro de Custo',
      tipo: row.tipo || 'Despesa',
      categoria: row.categoria || 'Geral',
      departamento: row.departamento || 'Geral',
      responsavel: row.responsavel_nome || row.responsavel || row.responsavelNome || 'Responsável',
      responsavelNome: row.responsavel_nome || row.responsavelNome || row.responsavel || 'Responsável',
      orcamentoMensal: Number(row.orcamento_mensal ?? row.orcamentoMensal ?? 0) || 0,
      orcamentoAnual: Number(row.orcamento_anual ?? row.orcamentoAnual ?? 0) || 0,
      gastoAcumulado: Number(row.gasto_acumulado ?? row.gastoAcumulado ?? 0) || 0,
      status: (row.status === 'Inativo' ? 'Inativo' : 'Ativo'),
      descricao: row.descricao || '',
      centroPaiId: row.centro_pai_id || row.centroPaiId || undefined,
      rateios: Array.isArray(row.rateios) ? row.rateios : [],
      projetosVinculados: Array.isArray(row.projetos_vinculados) ? row.projetos_vinculados : [],
      contratosVinculados: Array.isArray(row.contratos_vinculados) ? row.contratos_vinculados : [],
      totalReceitaClassificada: Number(row.total_receita_classificada || 0),
      totalDespesaClassificada: Number(row.total_despesa_classificada || 0),
      quantidadeLancamentos: Number(row.quantidade_lancamentos || 0),
      dataCadastro: row.created_at || row.data_cadastro || new Date().toISOString(),
      ultimaAtualizacao: row.updated_at || row.ultima_atualizacao || new Date().toISOString(),
      historico: Array.isArray(row.historico) ? row.historico : [],
    };
  }
  if (table.includes('plano_contas') || table.includes('categorias')) {
    return {
      ...objectFromSnakeCase(row),
      id: String(row.id),
      codigo: row.codigo || `PC-${String(row.id).slice(0, 4).toUpperCase()}`,
      nome: row.nome || 'Categoria',
      tipo: row.tipo || 'Despesa',
      natureza: row.natureza || 'Operacional',
      parentId: row.categoria_pai_id || row.categoriaPaiId || row.parent_id || row.parentId || undefined,
      categoriaPaiId: row.categoria_pai_id || row.categoriaPaiId || row.parent_id || row.parentId || undefined,
      status: (row.status === 'Inativo' || row.status === 'Inativa') ? 'Inativa' : 'Ativa',
      cor: row.cor || '#64748B',
      descricao: row.descricao || '',
      dataAtualizacao: row.updated_at || row.data_atualizacao || new Date().toISOString(),
      qtdLancamentos: Number(row.qtd_lancamentos || 0),
      saldoAcumuladoMensal: Number(row.saldo_acumulado_mensal || 0),
    };
  }
  if (table.includes('cobrancas') || table.includes('cobranca')) {
    const meta = (row.historico_interacoes && typeof row.historico_interacoes === 'object' && !Array.isArray(row.historico_interacoes)) ? row.historico_interacoes : {};
    const rawCanal = Array.isArray(row.canal) ? row.canal : (Array.isArray(meta.canal) ? meta.canal : (typeof row.canal === 'string' ? [row.canal] : ['WhatsApp', 'E-mail']));
    const rawTimeline = Array.isArray(row.timeline) ? row.timeline : (Array.isArray(meta.timeline) ? meta.timeline : (Array.isArray(row.historico_interacoes) ? row.historico_interacoes : (Array.isArray(row.historicoInteracoes) ? row.historicoInteracoes : [])));
    const rawStatus = meta.status_cobranca || row.status_cobranca || row.statusCobranca || row.status || 'Pendente';
    const rawStatusEntrega = meta.status_entrega || row.status_entrega || row.statusEntrega || 'Pendente';
    const rawStatusLeitura = meta.status_leitura || row.status_leitura || row.statusLeitura || 'Não lida';
    const rawValor = Number(row.valor ?? row.valor_total ?? row.valorTotal ?? 0) || 0;
    const rawVencimento = meta.vencimento || meta.data_vencimento || row.vencimento || row.data_vencimento || row.dataVencimento || row.created_at || new Date().toISOString().split('T')[0];
    const clienteName = row.cliente || row.cliente_nome || row.clienteNome || 'Cliente';
    const tituloRef = row.titulo_referencia || row.tituloReferencia || row.referencia || `REC-${String(row.id).slice(0, 4).toUpperCase()}`;

    return {
      ...row,
      id: String(row.id),
      cliente: clienteName,
      clienteNome: clienteName,
      clienteId: row.cliente_id || row.clienteId || undefined,
      tituloId: row.titulo_id || row.tituloId || undefined,
      tituloReferencia: tituloRef,
      valor: rawValor,
      valorTotal: rawValor,
      vencimento: String(rawVencimento).split('T')[0],
      dataVencimento: String(rawVencimento).split('T')[0],
      canal: rawCanal,
      dataHoraEnvio: meta.data_hora_envio || row.data_hora_envio || row.dataHoraEnvio || undefined,
      dataHoraPagamento: meta.data_hora_pagamento || row.data_hora_pagamento || row.dataHoraPagamento || undefined,
      statusCobranca: rawStatus,
      status: rawStatus,
      statusEntrega: rawStatusEntrega,
      statusLeitura: rawStatusLeitura,
      diasAtraso: Number(row.dias_atraso ?? row.diasAtraso ?? 0) || 0,
      etapaAtual: row.etapa_atual || row.etapaAtual || 'Lembrete Preventivo',
      responsavel: meta.responsavel || row.responsavel || 'Usuário Focus',
      mensagemPersonalizada: meta.mensagem_personalizada || row.mensagem_personalizada || row.mensagemPersonalizada || undefined,
      pixCopiaECola: meta.pix_copia_e_cola || row.pix_copia_e_cola || row.pixCopiaECola || undefined,
      qrCodePix: meta.qr_code_pix || row.qr_code_pix || row.qrCodePix || undefined,
      linhaDigitavel: meta.linha_digitavel || row.linha_digitavel || row.linhaDigitavel || undefined,
      linkBoleto: meta.link_boleto || row.link_boleto || row.linkBoleto || undefined,
      agendamento: meta.agendamento || row.agendamento || undefined,
      lembretesProgramados: Array.isArray(meta.lembretes_programados) ? meta.lembretes_programados : (Array.isArray(row.lembretes_programados) ? row.lembretes_programados : (Array.isArray(row.lembretesProgramados) ? row.lembretesProgramados : [])),
      respostaCliente: meta.resposta_cliente || row.resposta_cliente || row.respostaCliente || undefined,
      classificacaoResposta: meta.classificacao_resposta || row.classificacao_resposta || row.classificacaoResposta || undefined,
      timeline: rawTimeline,
      historicoInteracoes: rawTimeline,
    };
  }
  if (table.includes('produtos')) {
    return {
      ...row,
      id: String(row.id),
      descricaoBreve: row.descricao_breve || row.descricaoBreve,
      versaoAtual: row.versao_atual || row.versaoAtual,
    };
  }
  if (table.includes('contas_bancarias') || table.includes('conta_bancaria')) {
    const rawConta = row.conta || row.conta_corrente || row.contaCorrente || '';
    const rawDigito = row.digito || row.banco_codigo || row.bancoCodigo || '';
    const parts = rawConta.includes('-') ? rawConta.split('-') : [rawConta, rawDigito];
    return {
      ...row,
      id: String(row.id),
      banco: row.banco || row.banco_nome || row.bancoNome || 'Banco',
      agencia: row.agencia || '',
      conta: parts[0] || rawConta,
      digito: parts[1] || rawDigito || '0',
      tipoConta: row.tipo_conta || row.tipoConta || 'Corrente',
      titular: row.titular || row.nome_conta || row.nomeConta || '',
      cnpj: row.cnpj || '',
      chavePix: row.chave_pix || row.chavePix || '',
      saldoInicial: Number(row.saldo_inicial ?? row.saldoInicial ?? 0) || 0,
      saldoAtual: Number(row.saldo_atual ?? row.saldoAtual ?? 0) || 0,
      status: (row.status === 'Inativa' || row.status === 'Inativo') ? 'Inativa' : 'Ativa',
    };
  }
  if (table.includes('extratos_bancarios') || table.includes('extrato')) {
    return {
      ...row,
      id: String(row.id),
      contaBancariaId: row.conta_bancaria_id || row.contaBancariaId || '',
      data: row.data || row.data_movimentacao || row.dataMovimentacao || row.created_at || new Date().toISOString().split('T')[0],
      historico: row.historico || row.descricao_banco || row.descricaoBanco || 'Movimentação Bancária',
      documento: row.documento || row.documento_ref || row.documentoRef || '',
      valor: Number(row.valor ?? 0) || 0,
      tipo: row.tipo || 'Crédito',
      status: row.status || row.status_conciliacao || row.statusConciliacao || 'Não Conciliado',
      lancamentoFinanceiroId: row.lancamento_financeiro_id || row.conta_vinculada_id || row.lancamentoFinanceiroId || undefined,
    };
  }
  if (table.includes('fiscal_documentos') || table === 'fiscal_documentos' || table === 'focus_fiscal_documentos' || table === 'focus_documentos_fiscais') {
    return {
      ...row,
      id: String(row.id),
      tipo: row.tipo || 'NFS-e',
      numero: row.numero || '',
      serie: row.serie || '1',
      chaveAcesso: row.chave_acesso || row.chaveAcesso || '',
      dataEmissao: row.data_emissao ? String(row.data_emissao).split('T')[0] : (row.dataEmissao ? String(row.dataEmissao).split('T')[0] : (row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0])),
      dataEntrada: row.data_entrada ? String(row.data_entrada).split('T')[0] : (row.dataEntrada ? String(row.dataEntrada).split('T')[0] : undefined),
      entidade: {
        tipo: row.entidade_tipo || row.entidade?.tipo || 'Cliente',
        id: row.entidade_id || row.entidade?.id || '',
        nome: row.entidade_nome || row.entidade?.nome || 'Entidade',
        cnpjCpf: row.entidade_cnpj_cpf || row.entidade?.cnpjCpf || '',
      },
      vinculos: {
        projetoId: row.projeto_id || row.vinculos?.projetoId,
        projetoNome: row.projeto_nome || row.vinculos?.projetoNome,
        centroCusto: row.centro_custo || row.vinculos?.centroCusto,
      },
      valorTotal: Number(row.valor_total ?? row.valorTotal ?? 0) || 0,
      impostos: Array.isArray(row.impostos) ? row.impostos : [],
      retencoes: Array.isArray(row.retencoes) ? row.retencoes : [],
      anexos: Array.isArray(row.anexos) ? row.anexos : [],
      historico: Array.isArray(row.historico) ? row.historico : [],
      status: row.status || 'Emitido',
      observacoes: row.observacoes || '',
      dataAtualizacao: row.updated_at || row.dataAtualizacao || new Date().toISOString(),
    };
  }
  return objectFromSnakeCase(row);
}

/**
 * Mapeamento completo e determinístico de chaves de estado para tabelas relacionais do Supabase
 */
const TABLE_MAP: Record<string, string> = {
  // 1. Comercial
  'focus_comercial_equipe': 'comercial_equipe',
  'comercial_equipe': 'comercial_equipe',
  'focus_comercial_metas': 'comercial_metas',
  'comercial_metas': 'comercial_metas',
  'focus_comercial_okrs': 'comercial_okrs',
  'comercial_okrs': 'comercial_okrs',
  'focus_comercial_regras_comissao': 'comercial_regras_comissao',
  'comercial_regras_comissao': 'comercial_regras_comissao',
  'focus_comercial_registros_comissao': 'comercial_registros_comissao',
  'comercial_registros_comissao': 'comercial_registros_comissao',
  'focus_comercial_propostas': 'propostas_comerciais',
  'propostas_comerciais': 'propostas_comerciais',
  'focus_comercial_servicos': 'comercial_servicos',
  'comercial_servicos': 'comercial_servicos',
  'focus_comercial_tabelas': 'comercial_tabelas_preco',
  'comercial_tabelas_preco': 'comercial_tabelas_preco',
  'focus_comercial_scripts': 'comercial_scripts',
  'comercial_scripts': 'comercial_scripts',
  'focus_comercial_estrategias': 'comercial_estrategias',
  'comercial_estrategias': 'comercial_estrategias',
  'focus_comercial_playbooks': 'comercial_playbooks',
  'comercial_playbooks': 'comercial_playbooks',
  'focus_comercial_atividades': 'comercial_atividades',
  'comercial_atividades': 'comercial_atividades',
  'focus_comercial_agenda': 'comercial_agenda',
  'comercial_agenda': 'comercial_agenda',

  // 2. CRM
  'focus_crm_oportunidades': 'crm_oportunidades',
  'crm_oportunidades': 'crm_oportunidades',
  'focus_crm_empresas': 'crm_empresas',
  'crm_empresas': 'crm_empresas',
  'focus_crm_contatos': 'crm_contatos',
  'crm_contatos': 'crm_contatos',
  'focus_crm_interacoes': 'crm_interacoes',
  'crm_interacoes': 'crm_interacoes',
  'focus_crm_atividades': 'crm_atividades',
  'crm_atividades': 'crm_atividades',
  'focus_crm_clickup_config': 'crm_clickup_config',
  'crm_clickup_config': 'crm_clickup_config',
  'focus_crm_sync_logs': 'crm_sync_logs',
  'crm_sync_logs': 'crm_sync_logs',
  'focus_crm_leads': 'crm_leads',
  'crm_leads': 'crm_leads',

  // 3. Customer Success
  'focus_cs_customers': 'cs_customers',
  'cs_customers': 'cs_customers',
  'focus_cs_onboardings': 'cs_onboardings',
  'cs_onboardings': 'cs_onboardings',
  'focus_cs_health_factors': 'cs_health_factors',
  'cs_health_factors': 'cs_health_factors',
  'focus_cs_nps_surveys': 'cs_nps_surveys',
  'cs_nps_surveys': 'cs_nps_surveys',
  'focus_cs_renewals': 'cs_renewals',
  'cs_renewals': 'cs_renewals',
  'focus_cs_expansions': 'cs_expansions',
  'cs_expansions': 'cs_expansions',
  'focus_cs_churn_records': 'cs_churn_records',
  'cs_churn_records': 'cs_churn_records',
  'focus_cs_action_plans': 'cs_action_plans',
  'cs_action_plans': 'cs_action_plans',
  'focus_cs_timelines': 'cs_timelines',
  'cs_timelines': 'cs_timelines',
  'focus_cs_tasks_meetings': 'cs_tasks_meetings',
  'cs_tasks_meetings': 'cs_tasks_meetings',

  // 4. Desenvolvimento & Engenharia
  'focus_dev_backlog': 'dev_backlog',
  'dev_backlog': 'dev_backlog',
  'focus_dev_sprints': 'dev_sprints',
  'dev_sprints': 'dev_sprints',
  'focus_dev_versions': 'dev_versions',
  'dev_versions': 'dev_versions',
  'focus_dev_git': 'dev_git_repos',
  'dev_git_repos': 'dev_git_repos',
  'focus_dev_branches': 'dev_git_branches',
  'dev_git_branches': 'dev_git_branches',
  'focus_dev_deploys': 'dev_deploys',
  'dev_deploys': 'dev_deploys',
  'focus_dev_qa_tests': 'dev_qa_tests',
  'dev_qa_tests': 'dev_qa_tests',
  'focus_dev_bugs': 'dev_bugs',
  'dev_bugs': 'dev_bugs',
  'focus_dev_cicd': 'dev_cicd_pipelines',
  'dev_cicd_pipelines': 'dev_cicd_pipelines',

  // 5. Suporte & Helpdesk
  'focus_suporte_chamados': 'suporte_tickets',
  'suporte_tickets': 'suporte_tickets',
  'focus_suporte_mensagens': 'suporte_mensagens',
  'suporte_mensagens': 'suporte_mensagens',
  'focus_suporte_kb': 'suporte_kb_artigos',
  'suporte_kb_artigos': 'suporte_kb_artigos',
  'focus_suporte_timeline': 'suporte_timeline',
  'suporte_timeline': 'suporte_timeline',

  // 6. RH Avançado
  'focus_rh_folha_pagamento': 'rh_folha_pagamento',
  'rh_folha_pagamento': 'rh_folha_pagamento',
  'focus_rh_ferias': 'rh_ferias',
  'rh_ferias': 'rh_ferias',
  'focus_rh_beneficios': 'rh_beneficios',
  'rh_beneficios': 'rh_beneficios',
  'focus_rh_ponto': 'rh_ponto_registros',
  'rh_ponto_registros': 'rh_ponto_registros',
  'focus_rh_desempenho': 'rh_desempenho_ciclos',
  'rh_desempenho_ciclos': 'rh_desempenho_ciclos',
  'focus_rh_onboarding': 'rh_onboarding_processos',
  'rh_onboarding_processos': 'rh_onboarding_processos',
  'focus_rh_treinamentos': 'rh_treinamentos',
  'rh_treinamentos': 'rh_treinamentos',

  // 7. Fiscal
  'focus_fiscal_documentos': 'fiscal_documentos',
  'fiscal_documentos': 'fiscal_documentos',

  // 8. Integrações
  'focus_integracoes_conectores': 'integracoes_conectores',
  'integracoes_conectores': 'integracoes_conectores',
  'focus_integracoes_webhooks': 'integracoes_webhooks',
  'integracoes_webhooks': 'integracoes_webhooks',
  'focus_integracoes_keys': 'integracoes_api_keys',
  'integracoes_api_keys': 'integracoes_api_keys',
  'focus_integracoes_logs': 'integracoes_logs',
  'integracoes_logs': 'integracoes_logs',

  // 9. Assinaturas
  'focus_assinaturas_modelos': 'assinaturas_modelos',
  'assinaturas_modelos': 'assinaturas_modelos',
  'focus_assinaturas_certificados': 'assinaturas_certificados',
  'assinaturas_certificados': 'assinaturas_certificados',

  // 10. Marketing
  'focus_marketing_editorial': 'marketing_posts_editorial',
  'marketing_posts_editorial': 'marketing_posts_editorial',
  'focus_marketing_midia': 'marketing_ativos_midia',
  'marketing_ativos_midia': 'marketing_ativos_midia',
  'focus_marketing_ads': 'marketing_anuncios_ads',
  'marketing_anuncios_ads': 'marketing_anuncios_ads',
  'focus_marketing_planejamento': 'marketing_planejamento_seo',
  'marketing_planejamento_seo': 'marketing_planejamento_seo',

  // 11. Permissões, Agenda & Cobranças
  'focus_cobrancas': 'cobrancas',
  'cobrancas': 'cobrancas',
  'focus_app_cobrancas': 'cobrancas',
  'focus_cobrancas_multicanal': 'cobrancas',
  'focus_permissoes_perfis': 'permissoes_roles',
  'permissoes_roles': 'permissoes_roles',
  'focus_agenda_custom': 'agenda_eventos',
  'agenda_eventos': 'agenda_eventos',
  'focus_cobrancas_regua': 'cobrancas_reguas_templates',
  'cobrancas_reguas_templates': 'cobrancas_reguas_templates',

  // 12. Estoque e Patrimônio (ITAM)
  'focus_itam_equipamentos': 'equipamentos',
  'equipamentos': 'equipamentos',
  'focus_equipamentos': 'equipamentos',
  'focus_itam_estoque_itens': 'estoque_itens',
  'estoque_itens': 'estoque_itens',
  'focus_estoque_itens': 'estoque_itens',
  'focus_itam_licencas': 'licencas_software',
  'licencas_software': 'licencas_software',
  'focus_licencas': 'licencas_software',
  'focus_itam_patrimonios': 'patrimonios',
  'patrimonios': 'patrimonios',
  'focus_patrimonios': 'patrimonios',
  'focus_itam_movimentacoes': 'movimentacoes_patrimonio',
  'movimentacoes_patrimonio': 'movimentacoes_patrimonio',
  'focus_movimentacoes': 'movimentacoes_patrimonio',
  'focus_itam_inventarios': 'inventarios',
  'inventarios': 'inventarios',
  'focus_inventarios': 'inventarios',
  'focus_itam_manutencoes': 'manutencoes',
  'manutencoes': 'manutencoes',
  'focus_manutencoes': 'manutencoes',

  // 13. Centros de Custo & Plano de Contas (Categorias)
  'focus_centro_custos': 'centros_custo',
  'focus_centros_custo': 'centros_custo',
  'centros_custo': 'centros_custo',
  'centro_custos': 'centros_custo',
  'focus_plano_contas': 'plano_contas',
  'plano_contas': 'plano_contas',
  'categorias': 'plano_contas',
  'focus_categorias': 'plano_contas',
};

/**
 * Hook de Persistência 100% Relacional com Isolamento Estrito de Tabelas no Supabase / PostgreSQL.
 * Sincronização em tempo real entre Desktop e Mobile (iOS/Android).
 */
export function useLocalStorageState<T extends { id: string }>(
  table: string,
  initialValue: T[] = []
) {
  const [data, setData] = useState<T[]>(() => readLocalCache(table, initialValue));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isClientsTable = table === 'clients' || table === 'clientes' || table === 'focus_clientes';
  const isUsersTable = table === 'focus_usuarios' || table === 'users' || table === 'usuarios';
  const isContasReceber = table === 'focus_contas_receber' || table === 'contas_receber';
  const isContasPagar = table === 'focus_contas_pagar' || table === 'contas_pagar';
  const isContratos = table === 'focus_contratos' || table === 'contratos';
  const isProjetos = table === 'focus_projetos' || table === 'projetos';
  const isFornecedores = table === 'focus_fornecedores' || table === 'fornecedores';
  const isColaboradores = table === 'focus_colaboradores' || table === 'colaboradores' || table === 'focus_rh_colaboradores';
  const isCentrosCusto = table === 'focus_centro_custos' || table === 'centros_custo' || table === 'centro_custos' || table === 'focus_centros_custo';
  const isPlanoContas = table === 'focus_plano_contas' || table === 'plano_contas' || table === 'categorias' || table === 'focus_categorias';
  const isCobrancas = table === 'focus_cobrancas' || table === 'cobrancas' || table === 'focus_app_cobrancas' || table === 'focus_cobrancas_multicanal';
  const isFiscal = table === 'focus_fiscal_documentos' || table === 'fiscal_documentos' || table === 'focus_documentos_fiscais' || table.includes('fiscal');
  const isContasBancarias = table === 'focus_contas_bancarias' || table === 'contas_bancarias' || table === 'focus_app_contas_bancarias' || table.includes('conta_bancaria');
  const isExtratosBancarios = table === 'focus_extratos' || table === 'extratos_bancarios' || table === 'extratos' || table === 'focus_app_extratos' || table === 'focus_extratos_bancarios' || table.includes('extrato');

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  // Determinar a tabela primária real no PostgreSQL do Supabase
  const primaryDbTable = isContasReceber
    ? 'contas_receber'
    : isContasPagar
    ? 'contas_pagar'
    : isContratos
    ? 'contratos'
    : isProjetos
    ? 'projetos'
    : isFornecedores
    ? 'fornecedores'
    : isColaboradores
    ? 'colaboradores'
    : isClientsTable
    ? 'clientes'
    : isUsersTable
    ? 'users'
    : isCobrancas
    ? 'cobrancas'
    : isFiscal
    ? 'fiscal_documentos'
    : TABLE_MAP[table]
    ? TABLE_MAP[table]
    : table === 'focus_cobrancas' || table === 'cobrancas'
    ? 'cobrancas'
    : table === 'focus_fiscal_documentos' || table === 'fiscal_documentos'
    ? 'fiscal_documentos'
    : table === 'focus_centro_custos' || table === 'centros_custo' || table === 'centro_custos'
    ? 'centros_custo'
    : table === 'focus_plano_contas' || table === 'plano_contas' || table === 'categorias'
    ? 'plano_contas'
    : table.includes('equipamento')
    ? 'equipamentos'
    : table.includes('estoque') || table.includes('almoxarifado')
    ? 'estoque_itens'
    : table.includes('licenca') || table.includes('software')
    ? 'licencas_software'
    : table.includes('patrimonio') || table.includes('ativo')
    ? 'patrimonios'
    : table.includes('movimentac')
    ? 'movimentacoes_patrimonio'
    : table.includes('manutenc')
    ? 'manutencoes'
    : table.includes('inventario')
    ? 'inventarios'
    : table === 'focus_produtos' || table === 'produtos_focus' || table === 'produtos'
    ? 'produtos_focus'
    : table === 'focus_agenda_entregas' || table === 'agenda_entregas'
    ? 'agenda_entregas'
    : table === 'focus_crm_leads' || table === 'crm_leads'
    ? 'crm_leads'
    : table === 'focus_marketing_campanhas' || table === 'marketing_campanhas'
    ? 'marketing_campanhas'
    : table === 'focus_dms_documentos' || table === 'dms_documentos'
    ? 'dms_documentos'
    : table === 'focus_dms_pastas' || table === 'dms_pastas'
    ? 'dms_pastas'
    : table === 'focus_assinaturas' || table === 'assinaturas_digitais'
    ? 'assinaturas_digitais'
    : table === 'focus_empresa_config' || table === 'empresa_config'
    ? 'empresa_config'
    : table === 'focus_notificacoes' || table === 'notificacoes'
    ? 'notificacoes'
    : table === 'focus_contas_bancarias' || table === 'contas_bancarias'
    ? 'contas_bancarias'
    : table === 'focus_extratos' || table === 'extratos_bancarios' || table === 'extratos'
    ? 'extratos_bancarios'
    : null;

  // ---------------------------------------------------------------------------
  // Sincronizar com o Banco de Dados Real no Supabase
  // ---------------------------------------------------------------------------
  const syncToCloud = useCallback(
    async (items: T[]) => {
      try {
        if (isUsersTable) {
          await userService.saveAllUsers(items as any);
          return;
        }

        // 1. Gravação direta e isolada na tabela relacional correspondente no PostgreSQL
        if (isContasReceber) {
          const payload = items.map((item: any) => {
            const validId = toValidUuid(item.id);
            item.id = validId;
            return {
              id: validId,
              numero: item.numero || item.codigo || `REC-${validId.slice(0, 4).toUpperCase()}`,
              cliente_nome: item.cliente || item.clienteNome || 'Cliente',
              cliente_id: toNullableValidUuid(item.clienteId),
              descricao: item.descricao || 'Recebimento de título',
              categoria: item.categoria || 'Receita Operacional',
              valor_original: Number(item.valorOriginal ?? item.valor ?? 0) || 0,
              valor_recebido: Number(item.valorRecebido ?? 0) || 0,
              data_emissao: item.dataEmissao || new Date().toISOString().split('T')[0],
              data_vencimento: item.dataVencimento || item.vencimento || new Date().toISOString().split('T')[0],
              data_recebimento: item.dataRecebimento || null,
              forma_pagamento: item.formaPagamento || 'PIX',
              status: item.status || 'Pendente',
              responsavel: item.responsavel || 'Administrador',
              updated_at: new Date().toISOString(),
            };
          });
          const dedupedPayload = deduplicateById(payload);
          if (dedupedPayload.length > 0) {
            const { error: upsertErr } = await supabase.from('contas_receber').upsert(dedupedPayload, { onConflict: 'id' });
            if (upsertErr) {
              const safePayload = dedupedPayload.map(p => ({ ...p, cliente_id: null }));
              await supabase.from('contas_receber').upsert(safePayload, { onConflict: 'id' });
            }
          }
        } else if (isContasPagar) {
          const payload = items.map((item: any) => {
            const validId = toValidUuid(item.id);
            item.id = validId;
            return {
              id: validId,
              numero: item.numero || item.codigo || `PAG-${validId.slice(0, 4).toUpperCase()}`,
              fornecedor_nome: item.fornecedor || item.fornecedorNome || 'Fornecedor',
              fornecedor_id: toNullableValidUuid(item.fornecedorId),
              descricao: item.descricao || 'Despesa operacional',
              categoria: item.categoria || 'Despesa Operacional',
              valor_original: Number(item.valorOriginal ?? item.valor ?? 0) || 0,
              valor_pago: Number(item.valorPago ?? 0) || 0,
              data_emissao: item.dataEmissao || new Date().toISOString().split('T')[0],
              data_vencimento: item.dataVencimento || item.vencimento || new Date().toISOString().split('T')[0],
              data_pagamento: item.dataPagamento || null,
              forma_pagamento: item.formaPagamento || 'Boleto',
              status: item.status || 'Pendente',
              responsavel: item.responsavel || 'Administrador',
              updated_at: new Date().toISOString(),
            };
          });
          const dedupedPayload = deduplicateById(payload);
          if (dedupedPayload.length > 0) {
            const { error: upsertErr } = await supabase.from('contas_pagar').upsert(dedupedPayload, { onConflict: 'id' });
            if (upsertErr) {
              const safePayload = dedupedPayload.map(p => ({ ...p, fornecedor_id: null }));
              await supabase.from('contas_pagar').upsert(safePayload, { onConflict: 'id' });
            }
          }
        } else if (isContratos) {
          const payload = items.map((item: any) => {
            const validId = toValidUuid(item.id);
            item.id = validId;
            return {
              id: validId,
              numero_contrato: item.numeroContrato || item.numero || `CTR-${validId.slice(0, 4).toUpperCase()}`,
              cliente_id: toNullableValidUuid(item.clienteId),
              objeto_contrato: item.objetoContrato || item.nome || 'Prestação de Serviços',
              tipo_contrato: item.tipoContrato || 'Recorrente',
              valor_total: Number(item.valorTotal ?? item.valor ?? 0) || 0,
              data_inicio: item.dataInicio || new Date().toISOString().split('T')[0],
              data_fim: item.dataFim || null,
              status: item.status || 'Ativo',
              updated_at: new Date().toISOString(),
            };
          });
          const dedupedPayload = deduplicateById(payload);
          if (dedupedPayload.length > 0) {
            const { error: upsertErr } = await supabase.from('contratos').upsert(dedupedPayload, { onConflict: 'id' });
            if (upsertErr) {
              const safePayload = dedupedPayload.map(p => ({ ...p, cliente_id: null }));
              await supabase.from('contratos').upsert(safePayload, { onConflict: 'id' });
            }
          }
        } else if (isProjetos) {
          const payload = items.map((item: any) => {
            const validId = toValidUuid(item.id);
            item.id = validId;
            return {
              id: validId,
              codigo: item.codigo || `PRJ-${validId.slice(0, 4).toUpperCase()}`,
              nome: item.nome || item.titulo || 'Novo Projeto',
              cliente_id: toNullableValidUuid(item.clienteId),
              tipo: item.tipo || 'Desenvolvimento',
              categoria: item.categoria || 'Geral',
              prioridade: item.prioridade || 'Média',
              status: item.status || 'Planejamento',
              valor_recebido: Number(item.valorRecebido ?? item.valorContratado ?? item.valor ?? 0) || 0,
              data_inicio: item.dataInicio || new Date().toISOString().split('T')[0],
              descricao: item.descricao || item.descricaoGeral || '',
              updated_at: new Date().toISOString(),
            };
          });
          const dedupedPayload = deduplicateById(payload);
          if (dedupedPayload.length > 0) {
            const { error: upsertErr } = await supabase.from('projetos').upsert(dedupedPayload, { onConflict: 'id' });
            if (upsertErr) {
              const safePayload = dedupedPayload.map(p => ({ ...p, cliente_id: null }));
              await supabase.from('projetos').upsert(safePayload, { onConflict: 'id' });
            }
          }
        } else if (isFornecedores) {
          const payload = items.map((item: any) => {
            const validId = toValidUuid(item.id);
            item.id = validId;
            return {
              id: validId,
              razao_social: item.razaoSocial || item.nome || 'Fornecedor',
              nome_fantasia: item.nomeFantasia || item.razaoSocial || item.nome || 'Fornecedor',
              codigo: item.codigo || `FOR-${validId.slice(0, 4).toUpperCase()}`,
              cnpj: item.cnpj || item.documento || '',
              email: item.email || item.contatos?.[0]?.email || null,
              telefone: item.telefone || item.contatos?.[0]?.celular || null,
              categoria: item.categoria || 'Geral',
              status: item.status === 'Inativo' ? 'Inativo' : 'Ativo',
              updated_at: new Date().toISOString(),
            };
          });
          const dedupedPayload = deduplicateById(payload);
          if (dedupedPayload.length > 0) {
            await supabase.from('fornecedores').upsert(dedupedPayload, { onConflict: 'id' });
          }
        } else if (isColaboradores) {
          const payload = items.map((item: any) => {
            const validId = toValidUuid(item.id);
            item.id = validId;
            const photo = item.foto || item.fotoUrl || item.avatarUrl || item.fotoBase64 || null;
            return {
              id: validId,
              matricula: item.matricula || `FC-${validId.slice(0, 4).toUpperCase()}`,
              nome: item.nome || item.nomeCompleto || item.name || 'Colaborador',
              cargo: item.cargo || 'Especialista',
              departamento: item.departamento || 'Tecnologia',
              email: item.email || item.emailCorporativo || null,
              cpf: item.cpf || item.documento || null,
              tipo_contrato: item.tipoContrato || item.tipo_contrato || 'CLT',
              regime: item.regime || 'Híbrido',
              salario_base: item.salarioBase || item.salario || 0,
              status: item.status || 'Ativo',
              foto: photo,
              avatar_url: photo,
              data_admissao: item.dataAdmissao || item.data_admissao || new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString(),
            };
          });
          const dedupedPayload = deduplicateById(payload);
          if (dedupedPayload.length > 0) {
            try {
              await supabase.from('colaboradores').upsert(dedupedPayload, { onConflict: 'id' });
            } catch {
              const safePayload = dedupedPayload.map(p => ({
                id: p.id,
                matricula: p.matricula,
                nome: p.nome,
                email: p.email,
                cargo: p.cargo,
                departamento: p.departamento,
                status: p.status,
                updated_at: p.updated_at,
              }));
              await supabase.from('colaboradores').upsert(safePayload, { onConflict: 'id' });
            }

            // Upsert na tabela relacional colaborador_fotos
            for (const item of dedupedPayload) {
              if (item.foto) {
                try {
                  const fotoRowId = toValidUuid(`f0700000-0000-4000-8000-${String(item.id).slice(-12)}`);
                  await supabase.from('colaborador_fotos').upsert({
                    id: fotoRowId,
                    colaborador_id: item.id,
                    colaborador_matricula: item.matricula,
                    colaborador_email: item.email,
                    foto_base64: item.foto,
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'id' });
                } catch {}
              }
            }
          }
        } else if (isUsersTable) {
          for (const item of items as any[]) {
            if (item && (item.id || item.email)) {
              await userService.saveUser(item);
            }
          }
        } else if (isClientsTable) {
          for (const item of items as any[]) {
            if (item && item.id) {
              await clienteService.saveCliente(item);
            }
          }
        } else if (isCentrosCusto) {
          const payload = items.map((item: any) => {
            const validId = toValidUuid(item.id);
            item.id = validId;
            return {
              id: validId,
              codigo: item.codigo || `CC-${validId.slice(0, 4).toUpperCase()}`,
              nome: item.nome || 'Centro de Custo',
              tipo: item.tipo || 'Despesa',
              categoria: item.categoria || 'Geral',
              departamento: item.departamento || 'Geral',
              responsavel_nome: item.responsavelNome || item.responsavel || item.responsavel_nome || 'Responsável',
              responsavel_email: item.responsavelEmail || item.responsavel_email || null,
              orcamento_mensal: Number(item.orcamentoMensal ?? item.orcamento_mensal ?? 0) || 0,
              orcamento_anual: Number(item.orcamentoAnual ?? item.orcamento_anual ?? 0) || 0,
              gasto_acumulado: Number(item.gastoAcumulado ?? item.gasto_acumulado ?? 0) || 0,
              status: item.status || 'Ativo',
              descricao: item.descricao || null,
              centro_pai_id: toNullableValidUuid(item.centroPaiId || item.centro_pai_id),
              updated_at: new Date().toISOString(),
            };
          });
          const deduped = deduplicateById(payload);
          if (deduped.length > 0) {
            const { error: upsertErr } = await supabase.from('centros_custo').upsert(deduped, { onConflict: 'id' });
            if (upsertErr) {
              const minimal = deduped.map((c: any) => ({
                id: c.id,
                codigo: c.codigo,
                nome: c.nome,
                departamento: c.departamento,
                responsavel_nome: c.responsavel_nome,
                status: c.status,
                descricao: c.descricao,
                updated_at: c.updated_at,
              }));
              await supabase.from('centros_custo').upsert(minimal, { onConflict: 'id' });
            }
          }
        } else if (isPlanoContas) {
          const payload = items.map((item: any) => {
            const validId = toValidUuid(item.id);
            item.id = validId;
            return {
              id: validId,
              codigo: item.codigo || `PC-${validId.slice(0, 4).toUpperCase()}`,
              nome: item.nome || 'Categoria',
              tipo: item.tipo || 'Despesa',
              natureza: item.natureza || 'Operacional',
              categoria_pai_id: toNullableValidUuid(item.parentId || item.categoriaPaiId || item.categoria_pai_id),
              status: item.status === 'Inativa' ? 'Inativo' : (item.status || 'Ativo'),
              cor: item.cor || '#64748B',
              descricao: item.descricao || null,
              updated_at: new Date().toISOString(),
            };
          });
          const deduped = deduplicateById(payload);
          if (deduped.length > 0) {
            const { error: upsertErr } = await supabase.from('plano_contas').upsert(deduped, { onConflict: 'id' });
            if (upsertErr) {
              const minimal = deduped.map((p: any) => ({
                id: p.id,
                codigo: p.codigo,
                nome: p.nome,
                tipo: p.tipo,
                natureza: p.natureza,
                status: p.status,
                descricao: p.descricao,
                updated_at: p.updated_at,
              }));
              await supabase.from('plano_contas').upsert(minimal, { onConflict: 'id' });
            }
          }
        } else if (isCobrancas) {
          const payload = items.map((item: any) => toSnakeCasePayload('cobrancas', item));
          const deduped = deduplicateById(payload);
          if (deduped.length > 0) {
            const { error: upsertErr } = await supabase.from('cobrancas').upsert(deduped, { onConflict: 'id' });
            if (upsertErr) {
              const fallbackPayload = deduped.map((c: any) => ({
                id: c.id,
                cliente_id: null,
                titulo_id: null,
                cliente_nome: c.cliente_nome || 'Cliente',
                titulo_referencia: c.titulo_referencia || 'REC-000',
                valor_total: c.valor_total || 0,
                dias_atraso: c.dias_atraso || 0,
                etapa_atual: c.etapa_atual || 'Lembrete Preventivo',
                status: c.status || 'Pendente',
                historico_interacoes: c.historico_interacoes || {},
                updated_at: c.updated_at,
              }));
              await supabase.from('cobrancas').upsert(fallbackPayload, { onConflict: 'id' });
            }
          }
        } else if (isFiscal) {
          const payload = items.map((item: any) => toSnakeCasePayload('fiscal_documentos', item));
          const deduped = deduplicateById(payload);
          if (deduped.length > 0) {
            const { error: upsertErr } = await supabase.from('fiscal_documentos').upsert(deduped, { onConflict: 'id' });
            if (upsertErr) {
              const fallbackPayload = deduped.map((f: any) => ({
                id: f.id,
                tipo: f.tipo || 'NFS-e',
                numero: f.numero || '1000',
                serie: f.serie || '1',
                entidade_nome: f.entidade_nome || 'Cliente Fiscal',
                valor_total: f.valor_total || 0,
                status: f.status || 'Emitido',
                updated_at: f.updated_at,
              }));
              await supabase.from('fiscal_documentos').upsert(fallbackPayload, { onConflict: 'id' });
            }
          }
        } else if (isContasBancarias) {
          const payload = items.map((item: any) => toSnakeCasePayload('contas_bancarias', item));
          const deduped = deduplicateById(payload);
          if (deduped.length > 0) {
            const { error: upsertErr } = await supabase.from('contas_bancarias').upsert(deduped, { onConflict: 'id' });
            if (upsertErr) {
              const fallbackPayload = deduped.map((c: any) => ({
                id: c.id,
                nome_conta: c.nome_conta || 'Conta Bancária',
                banco_nome: c.banco_nome || 'Banco',
                banco_codigo: c.banco_codigo || '000',
                agencia: c.agencia || '',
                conta_corrente: c.conta_corrente || '',
                tipo_conta: c.tipo_conta || 'Conta Corrente PJ',
                saldo_inicial: c.saldo_inicial || 0,
                saldo_atual: c.saldo_atual || 0,
                status: c.status || 'Ativa',
                updated_at: c.updated_at,
              }));
              await supabase.from('contas_bancarias').upsert(fallbackPayload, { onConflict: 'id' });
            }
          }
        } else if (isExtratosBancarios) {
          const payload = items.map((item: any) => toSnakeCasePayload('extratos_bancarios', item));
          const deduped = deduplicateById(payload);
          if (deduped.length > 0) {
            const { error: upsertErr } = await supabase.from('extratos_bancarios').upsert(deduped, { onConflict: 'id' });
            if (upsertErr) {
              const fallbackPayload = deduped.map((e: any) => ({
                id: e.id,
                conta_bancaria_id: e.conta_bancaria_id,
                data_movimentacao: e.data_movimentacao,
                descricao_banco: e.descricao_banco,
                documento_ref: e.documento_ref,
                tipo: e.tipo,
                valor: e.valor,
                status_conciliacao: e.status_conciliacao,
              }));
              await supabase.from('extratos_bancarios').upsert(fallbackPayload, { onConflict: 'id' });
            }
          }
        } else if (primaryDbTable === 'dms_pastas') {
          const payload = (items || [])
            .filter((item: any) => item && typeof item === 'object')
            .map((item: any) => toSnakeCasePayload('dms_pastas', item));
          const deduped = deduplicateById(payload);
          if (deduped.length > 0) {
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            // 1. Inserir todas as pastas com pasta_pai_id = null primeiro para registrar com segurança
            const rootPastasPayload = deduped
              .filter((p: any) => p && p.id && uuidPattern.test(p.id))
              .map((p: any) => ({
                id: p.id,
                nome: String(p.nome || 'Pasta'),
                pasta_pai_id: null,
                caminho_completo: String(p.caminho_completo || `/${p.nome || 'Pasta'}`),
                modulo_vinculado: p.modulo_vinculado ? String(p.modulo_vinculado) : null,
                updated_at: new Date().toISOString(),
              }));

            if (rootPastasPayload.length > 0) {
              try {
                await supabase.from('dms_pastas').upsert(rootPastasPayload, { onConflict: 'id' });
              } catch (errRoot: any) {
                console.warn('[dms_pastas] Root upsert notice:', errRoot?.message);
              }
            }

            // 2. Atualizar hierarquia de pastas filhas APENAS para os pais que comprovadamente existem e são UUIDs válidos
            const existingIdSet = new Set(rootPastasPayload.map((p: any) => p.id));
            const childPastas = deduped
              .filter((p: any) => 
                p && 
                p.id && 
                uuidPattern.test(p.id) && 
                p.pasta_pai_id && 
                uuidPattern.test(p.pasta_pai_id) && 
                existingIdSet.has(p.pasta_pai_id) &&
                p.id !== p.pasta_pai_id
              )
              .map((p: any) => ({
                id: p.id,
                nome: String(p.nome || 'Pasta'),
                pasta_pai_id: p.pasta_pai_id,
                caminho_completo: String(p.caminho_completo || `/${p.nome || 'Pasta'}`),
                modulo_vinculado: p.modulo_vinculado ? String(p.modulo_vinculado) : null,
                updated_at: new Date().toISOString(),
              }));

            if (childPastas.length > 0) {
              try {
                await supabase.from('dms_pastas').upsert(childPastas, { onConflict: 'id' });
              } catch (errChild: any) {
                console.warn('[dms_pastas] Child hierarchy upsert notice:', errChild?.message);
              }
            }
          }
        } else if (primaryDbTable) {
          const payload = items.map((item: any) => toSnakeCasePayload(primaryDbTable, item));
          const deduped = deduplicateById(payload);
          if (deduped.length > 0) {
            const { error: upsertErr } = await supabase.from(primaryDbTable).upsert(deduped, { onConflict: 'id' });
            if (upsertErr) {
              if (primaryDbTable === 'notificacoes') {
                const minimalPayload = deduped.map((n: any) => ({
                  id: n.id,
                  titulo: n.titulo,
                  mensagem: n.mensagem || n.descricao || '',
                  tipo: n.tipo || 'info',
                  lida: Boolean(n.lida),
                  link_redirecionamento: n.link_redirecionamento || n.target_url || '/',
                }));
                await supabase.from('notificacoes').upsert(minimalPayload, { onConflict: 'id' });
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Supabase] Erro ao sincronizar '${table}' com o banco de dados:`, err?.message);
      }
    },
    [isCentrosCusto, isClientsTable, isCobrancas, isColaboradores, isContasBancarias, isContasPagar, isContasReceber, isContratos, isExtratosBancarios, isFornecedores, isPlanoContas, isProjetos, isUsersTable, primaryDbTable, table]
  );

  // ---------------------------------------------------------------------------
  // Sync Data on Client Mount & Realtime Cloud Database
  // ---------------------------------------------------------------------------
  useEffect(() => {
    isMountedRef.current = true;

    // 1. Carregamento inicial imediato com dados limpos
    const localCached = readLocalCache(table, initialValue);
    if (isMountedRef.current && localCached.length > 0) {
      setData(localCached);
    }

    const fetchData = async () => {
      if (isFetchingRef.current) return;
      const now = Date.now();
      if (now - lastFetchTimeRef.current < 2000) return;
      isFetchingRef.current = true;
      lastFetchTimeRef.current = now;
      try {
        if (isUsersTable) {
          const dbUsers = await userService.getUsers();
          if (isMountedRef.current && Array.isArray(dbUsers)) {
            setData(dbUsers as unknown as T[]);
            writeLocalCache(table, dbUsers);
            setError(null);
          }
          return;
        }

        if (isContasReceber) {
          const { data: dbRows, error: dbErr } = await supabase
            .from('contas_receber')
            .select('*')
            .order('data_vencimento', { ascending: true });

          if (!isMountedRef.current) return;

          if (!dbErr && Array.isArray(dbRows)) {
            const rawDeletedIds = safeGetItem('focus_app_deleted_contas_receber_ids');
            const deletedSet = new Set<string>(rawDeletedIds ? JSON.parse(rawDeletedIds) : []);

            const mapped = dbRows
              .filter((item: any) => item && !deletedSet.has(String(item.id)) && (item.cliente_nome || item.cliente || item.descricao || Number(item.valor_original || 0) > 0))
              .map((item: any) => {
                const valorOrig = Number(item.valor_original ?? item.valorOriginal ?? 0) || 0;
                const valorRec = Number(item.valor_recebido ?? item.valorRecebido ?? 0) || 0;
                return {
                  id: String(item.id),
                  numero: item.numero || `REC-${String(item.id).slice(0, 4).toUpperCase()}`,
                  cliente: item.cliente_nome || item.cliente || 'Cliente',
                  clienteId: item.cliente_id || item.clienteId,
                  descricao: item.descricao || 'Recebimento de título',
                  categoria: item.categoria || 'Receita Operacional',
                  centroCustoNome: item.centro_custo || item.centroCustoNome || item.centroCusto || '',
                  valorOriginal: valorOrig,
                  valorRecebido: valorRec,
                  saldo: Number(item.saldo ?? (valorOrig - valorRec)) || 0,
                  dataEmissao: item.data_emissao || new Date().toISOString().split('T')[0],
                  dataVencimento: item.data_vencimento || new Date().toISOString().split('T')[0],
                  dataRecebimento: item.data_recebimento || null,
                  formaPagamento: item.forma_pagamento || 'PIX',
                  status: item.status || 'Pendente',
                  responsavel: item.responsavel || 'Administrador',
                  ultimaAtualizacao: item.updated_at || new Date().toISOString(),
                };
              }) as unknown as T[];

            localCached.forEach((lc: any) => {
              if (lc && lc.id && !mapped.some((m: any) => m.id === lc.id) && !deletedSet.has(String(lc.id))) {
                mapped.push(lc);
              }
            });

            setData(mapped);
            writeLocalCache(table, mapped);
            setError(null);
            return;
          }
        }

        if (isContasPagar) {
          const { data: dbRows, error: dbErr } = await supabase
            .from('contas_pagar')
            .select('*')
            .order('data_vencimento', { ascending: true });

          if (!isMountedRef.current) return;

          if (!dbErr && Array.isArray(dbRows)) {
            const rawDeletedIds = safeGetItem('focus_app_deleted_contas_pagar_ids');
            const deletedSet = new Set<string>(rawDeletedIds ? JSON.parse(rawDeletedIds) : []);

            const mapped = dbRows
              .filter((item: any) => item && !deletedSet.has(String(item.id)) && (item.fornecedor_nome || item.fornecedor || item.descricao || Number(item.valor_original || 0) > 0))
              .map((item: any) => {
                const valorOrig = Number(item.valor_original ?? item.valorOriginal ?? 0) || 0;
                const valorPg = Number(item.valor_pago ?? item.valorPago ?? 0) || 0;
                return {
                  id: String(item.id),
                  numero: item.numero || `PAG-${String(item.id).slice(0, 4).toUpperCase()}`,
                  fornecedor: item.fornecedor_nome || item.fornecedor || 'Fornecedor',
                  fornecedorId: item.fornecedor_id || item.fornecedorId,
                  descricao: item.descricao || 'Despesa operacional',
                  categoria: item.categoria || 'Despesa Operacional',
                  centroCustoNome: item.centro_custo || item.centroCustoNome || item.centroCusto || '',
                  valorOriginal: valorOrig,
                  valorPago: valorPg,
                  saldo: Number(item.saldo ?? (valorOrig - valorPg)) || 0,
                  dataEmissao: item.data_emissao || new Date().toISOString().split('T')[0],
                  dataVencimento: item.data_vencimento || new Date().toISOString().split('T')[0],
                  dataPagamento: item.data_pagamento || null,
                  formaPagamento: item.forma_pagamento || 'Boleto',
                  status: item.status || 'Pendente',
                  responsavel: item.responsavel || 'Administrador',
                  ultimaAtualizacao: item.updated_at || new Date().toISOString(),
                };
              }) as unknown as T[];

            localCached.forEach((lc: any) => {
              if (lc && lc.id && !mapped.some((m: any) => m.id === lc.id) && !deletedSet.has(String(lc.id))) {
                mapped.push(lc);
              }
            });

            setData(mapped);
            writeLocalCache(table, mapped);
            setError(null);
            return;
          }
        }

        if (isContratos) {
          const { data: dbRows, error: dbErr } = await supabase
            .from('contratos')
            .select('*')
            .order('created_at', { ascending: false });

          if (!isMountedRef.current) return;

          if (!dbErr && Array.isArray(dbRows)) {
            const mapped = dbRows
              .filter((item: any) => item && (item.numero_contrato || item.objeto_contrato || item.nome) && !isDmsFolderObject(item))
              .map((item: any) => ({
                id: String(item.id),
                numeroContrato: item.numero_contrato || item.numeroContrato || `CTR-${String(item.id).slice(0, 4).toUpperCase()}`,
                nome: item.objeto_contrato || item.nome || 'Contrato de Prestação de Serviços',
                clienteId: item.cliente_id || item.clienteId,
                clienteNome: item.cliente_nome || item.clienteNome || 'Cliente Focus',
                objetoContrato: item.objeto_contrato || item.objetoContrato || 'Serviços de Tecnologia',
                tipoContrato: item.tipo_contrato || item.tipoContrato || 'Recorrente',
                valorTotal: Number(item.valor_total ?? item.valorTotal ?? 0) || 0,
                valorMensalidade: Number(item.valor_mensalidade ?? item.valorMensalidade ?? 0) || 0,
                dataInicio: item.data_inicio || item.dataInicio || new Date().toISOString().split('T')[0],
                dataFim: item.data_fim || item.dataFim || null,
                status: item.status || 'Ativo',
                vigenciaIndeterminada: item.vigencia_indeterminada ?? true,
                createdAt: item.created_at || new Date().toISOString(),
              })) as unknown as T[];

            // Preservar contratos locais para evitar que uma tabela remota vazia apague o cache local
            const existingLocal = readLocalCache<any>(table, initialValue);
            const dbIds = new Set(mapped.map((it: any) => it.id));
            existingLocal.forEach((lc: any) => {
              if (lc && lc.id && !dbIds.has(String(lc.id)) && !isDmsFolderObject(lc)) {
                mapped.push(lc);
              }
            });

            setData(mapped);
            writeLocalCache(table, mapped);
            setError(null);
            return;
          }
        }

        if (isProjetos) {
          const { data: dbRows, error: dbErr } = await supabase
            .from('projetos')
            .select('*')
            .order('created_at', { ascending: false });

          if (!isMountedRef.current) return;

          if (!dbErr && Array.isArray(dbRows)) {
            const mapped = dbRows
              .filter((item: any) => item && item.nome && !isDmsFolderObject(item))
              .map((item: any) => ({
                id: String(item.id),
                codigo: item.codigo || `PRJ-${String(item.id).slice(0, 4).toUpperCase()}`,
                nome: item.nome || 'Projeto',
                clienteId: item.cliente_id || item.clienteId,
                cliente: item.cliente || 'Cliente Focus',
                tipo: item.tipo || 'Desenvolvimento',
                status: item.status || 'Planejamento',
                progresso: Number(item.progresso ?? item.progresso_estimado ?? 0) || 0,
                responsavel: item.responsavel || 'Tech Lead',
                valorContratado: Number(item.valor_contratado ?? item.valorContratado ?? 0) || 0,
                valorRecebido: Number(item.valor_recebido ?? item.valorRecebido ?? 0) || 0,
                dataInicio: item.data_inicio || item.dataInicio || new Date().toISOString().split('T')[0],
                dataPrevisaoFim: item.data_previsao_fim || item.dataPrevisaoFim || null,
                createdAt: item.created_at || new Date().toISOString(),
              })) as unknown as T[];

            setData(mapped);
            writeLocalCache(table, mapped);
            setError(null);
            return;
          }
        }

        if (isFornecedores) {
          let deletedFornecedoresIds = new Set<string>();
          try {
            const rawDel = localStorage.getItem('focus_app_deleted_fornecedores_ids');
            if (rawDel) {
              const parsed = JSON.parse(rawDel);
              if (Array.isArray(parsed)) {
                deletedFornecedoresIds = new Set(parsed.map(String));
              }
            }
          } catch {}

          const { data: dbRows, error: dbErr } = await supabase
            .from('fornecedores')
            .select('*')
            .order('created_at', { ascending: false });

          if (!isMountedRef.current) return;

          if (!dbErr && Array.isArray(dbRows)) {
            const localMap = new Map<string, any>();
            localCached.forEach((lc: any) => {
              if (lc && lc.id && !deletedFornecedoresIds.has(String(lc.id))) {
                localMap.set(String(lc.id), lc);
              }
            });

            const mapped = dbRows
              .filter((item: any) => 
                item && 
                item.id && 
                !deletedFornecedoresIds.has(String(item.id)) && 
                (item.razao_social || item.nome_fantasia || item.nome) && 
                !isDmsFolderObject(item)
              )
              .map((item: any) => {
                const existing = localMap.get(String(item.id)) || {};
                const end = item.endereco || existing.endereco || {};
                let cidade = item.cidade || end.cidade || '';
                let estado = item.estado || end.estado || '';
                const cep = item.cep || end.cep || '';
                const logradouro = item.logradouro || end.logradouro || '';
                const numero = item.numero || end.numero || '';
                const complemento = item.complemento || end.complemento || '';
                const bairro = item.bairro || end.bairro || '';
                const pais = item.pais || end.pais || 'Brasil';

                if (cidade.toLowerCase() === 'são paulo' && estado.toUpperCase() === 'SP' && !logradouro && !cep && !bairro) {
                  cidade = '';
                  estado = '';
                }

                return {
                  ...existing,
                  id: String(item.id),
                  codigo: item.codigo || existing.codigo || `FOR-${String(item.id).slice(0, 4).toUpperCase()}`,
                  razaoSocial: item.razao_social || item.razaoSocial || existing.razaoSocial || 'Fornecedor',
                  nomeFantasia: item.nome_fantasia || item.nomeFantasia || item.razao_social || existing.nomeFantasia || 'Fornecedor',
                  cnpj: item.cnpj || item.documento || existing.cnpj || '',
                  documento: item.cnpj || item.documento || existing.documento || '',
                  tipo: item.tipo || existing.tipo || 'Pessoa Jurídica',
                  categoria: item.categoria || existing.categoria || 'Geral',
                  email: item.email || existing.email || '',
                  telefone: item.telefone || existing.telefone || '',
                  status: item.status || existing.status || 'Ativo',
                  endereco: {
                    cep,
                    logradouro,
                    numero,
                    complemento,
                    bairro,
                    cidade,
                    estado,
                    pais,
                  },
                  contatos: Array.isArray(item.contatos) && item.contatos.length > 0 ? item.contatos : (existing.contatos || []),
                  dadosBancarios: Array.isArray(item.dados_bancarios) ? item.dados_bancarios : (existing.dadosBancarios || []),
                  pixChave: item.pix_chave || item.chave_pix || existing.pixChave || existing.chavePix,
                  totalContratado: Number(item.total_contratado ?? existing.totalContratado ?? 0) || 0,
                  totalPago: Number(item.total_pago ?? existing.totalPago ?? 0) || 0,
                  saldoAberto: Number(item.saldo_aberto ?? existing.saldoAberto ?? 0) || 0,
                  createdAt: item.created_at || existing.dataCadastro || new Date().toISOString(),
                  dataCadastro: item.created_at || existing.dataCadastro || new Date().toISOString(),
                  ultimaAtualizacao: item.updated_at || existing.ultimaAtualizacao || new Date().toISOString(),
                };
              }) as unknown as T[];

            localCached.forEach((lc: any) => {
              if (lc && lc.id && !deletedFornecedoresIds.has(String(lc.id)) && !mapped.some((m: any) => m.id === lc.id)) {
                mapped.push(lc);
              }
            });

            // Deduplicação inteligente de fornecedores (por id, por CNPJ limpo e por nome limpo)
            const deduplicated: any[] = [];
            const seenIds = new Set<string>();
            const seenCnpjs = new Set<string>();
            const seenNames = new Set<string>();

            for (const item of mapped as any[]) {
              if (!item || !item.id || seenIds.has(String(item.id))) continue;
              
              const docClean = (item.documento || item.cnpj || '').replace(/\D/g, '');
              const nameClean = (item.nomeFantasia || item.razaoSocial || '').toLowerCase().trim();

              if (docClean.length >= 11 && seenCnpjs.has(docClean)) {
                continue;
              }
              if (nameClean && seenNames.has(nameClean) && docClean.length < 11) {
                continue;
              }

              seenIds.add(String(item.id));
              if (docClean.length >= 11) seenCnpjs.add(docClean);
              if (nameClean) seenNames.add(nameClean);
              deduplicated.push(item);
            }

            setData(deduplicated as unknown as T[]);
            writeLocalCache(table, deduplicated);
            setError(null);
            return;
          }
        }

        if (isColaboradores) {
          const { data: dbRows, error: dbErr } = await supabase
            .from('colaboradores')
            .select('*')
            .order('created_at', { ascending: false });

          if (!isMountedRef.current) return;

          if (!dbErr && Array.isArray(dbRows)) {
            const mapped = dbRows
              .filter((item: any) => item && (item.nome || item.name) && !isDmsFolderObject(item))
              .map((item: any) => {
                const photo = item.foto || item.foto_url || item.avatar_url || '';
                return {
                  id: String(item.id),
                  matricula: item.matricula || `FC-${String(item.id).slice(0, 4).toUpperCase()}`,
                  nome: item.nome || item.name || 'Colaborador',
                  nomeCompleto: item.nome || item.name || 'Colaborador',
                  cargo: item.cargo || 'Especialista',
                  departamento: item.departamento || 'Tecnologia',
                  email: item.email || '',
                  emailCorporativo: item.email || '',
                  telefone: item.telefone || '',
                  cpf: item.cpf || item.documento || '',
                  salario: Number(item.salario_base || item.salario || 0),
                  salarioBase: Number(item.salario_base || item.salario || 0),
                  status: item.status || 'Ativo',
                  foto: photo,
                  fotoUrl: photo,
                  avatarUrl: photo,
                  metodoPagamento: item.metodo_pagamento || { formaPagamento: 'PIX' },
                  dataAdmissao: item.data_admissao || item.dataAdmissao || new Date().toISOString().split('T')[0],
                  createdAt: item.created_at || new Date().toISOString(),
                };
              }) as unknown as T[];

            setData(mapped);
            writeLocalCache(table, mapped);
            setError(null);
            return;
          }
        }

        if (isClientsTable) {
          const allClis = await clienteService.getClientes();
          if (!isMountedRef.current) return;
          if (Array.isArray(allClis)) {
            setData(allClis as unknown as T[]);
            writeLocalCache(table, allClis);
            setError(null);
          }
          return;
        }

        if (isCentrosCusto) {
          const { data: dbRows, error: dbErr } = await supabase
            .from('centros_custo')
            .select('*')
            .order('codigo', { ascending: true });

          if (!isMountedRef.current) return;

          if (!dbErr && Array.isArray(dbRows)) {
            if (dbRows.length > 0) {
              const mapped = dbRows.map((r: any) => fromSnakeCaseRow('centros_custo', r)) as unknown as T[];
              setData(mapped);
              writeLocalCache(table, mapped);
              setError(null);
              return;
            } else {
              const seedData = (localCached.length > 0 ? localCached : initialValue) as T[];
              if (seedData.length > 0) {
                setData(seedData);
                writeLocalCache(table, seedData);
                await syncToCloud(seedData);
              }
              setError(null);
              return;
            }
          }
        }

        if (isPlanoContas) {
          const { data: dbRows, error: dbErr } = await supabase
            .from('plano_contas')
            .select('*')
            .order('codigo', { ascending: true });

          if (!isMountedRef.current) return;

          if (!dbErr && Array.isArray(dbRows)) {
            if (dbRows.length > 0) {
              const mapped = dbRows.map((r: any) => fromSnakeCaseRow('plano_contas', r)) as unknown as T[];
              setData(mapped);
              writeLocalCache(table, mapped);
              setError(null);
              return;
            } else {
              const seedData = (localCached.length > 0 ? localCached : initialValue) as T[];
              if (seedData.length > 0) {
                setData(seedData);
                writeLocalCache(table, seedData);
                await syncToCloud(seedData);
              }
              setError(null);
              return;
            }
          }
        }

        if (isFiscal) {
          const { data: dbRows, error: dbErr } = await supabase
            .from('fiscal_documentos')
            .select('*')
            .order('created_at', { ascending: false });

          if (!isMountedRef.current) return;

          const rawDeletedIds = safeGetItem('focus_app_deleted_fiscal_ids');
          const deletedSet = new Set<string>(rawDeletedIds ? JSON.parse(rawDeletedIds) : []);

          if (!dbErr && Array.isArray(dbRows)) {
            const mapped = dbRows
              .filter((r: any) => !deletedSet.has(String(r.id)))
              .map((r: any) => fromSnakeCaseRow('fiscal_documentos', r)) as unknown as T[];

            localCached.forEach((lc: any) => {
              if (lc && lc.id && !deletedSet.has(String(lc.id)) && !mapped.some((m: any) => m.id === lc.id)) {
                mapped.push(lc);
              }
            });

            setData(mapped);
            writeLocalCache(table, mapped);
            setError(null);
            return;
          }
        }

        if (isCobrancas) {
          const { data: dbRows, error: dbErr } = await supabase
            .from('cobrancas')
            .select('*')
            .order('created_at', { ascending: false });

          if (!isMountedRef.current) return;

          const rawDeletedIds = safeGetItem('focus_app_deleted_cobrancas_ids');
          const deletedSet = new Set<string>(rawDeletedIds ? JSON.parse(rawDeletedIds) : []);

          if (!dbErr && Array.isArray(dbRows)) {
            const mapped = dbRows
              .filter((r: any) => !deletedSet.has(String(r.id)))
              .map((r: any) => fromSnakeCaseRow('cobrancas', r)) as unknown as T[];

            localCached.forEach((lc: any) => {
              if (lc && lc.id && !deletedSet.has(String(lc.id)) && !mapped.some((m: any) => m.id === lc.id)) {
                mapped.push(lc);
              }
            });

            setData(mapped);
            writeLocalCache(table, mapped);
            setError(null);
            return;
          }
        }

        if (primaryDbTable && !isContasReceber && !isContasPagar && !isContratos && !isProjetos && !isFornecedores && !isColaboradores && !isClientsTable && !isUsersTable && !isCentrosCusto && !isPlanoContas && !isFiscal && !isCobrancas) {
          const { data: dbRows, error: dbErr } = await supabase
            .from(primaryDbTable)
            .select('*')
            .order('created_at', { ascending: false });

          if (!isMountedRef.current) return;

          if (!dbErr && Array.isArray(dbRows) && dbRows.length > 0) {
            const mapped = dbRows.map((r: any) => fromSnakeCaseRow(primaryDbTable, r)) as unknown as T[];
            localCached.forEach((lc: any) => {
              if (lc && lc.id && !mapped.some((m: any) => m.id === lc.id)) {
                mapped.push(lc);
              }
            });
            setData(mapped);
            writeLocalCache(table, mapped);
            setError(null);
            return;
          }
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setError(err?.message || 'Unknown fetch error');
      } finally {
        isFetchingRef.current = false;
        if (isMountedRef.current) setLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      fetchData();
    }

    const handleStorageUpdate = (e: StorageEvent) => {
      const candidateKeys = getCandidateKeysForTable(table);
      if (candidateKeys.includes(e.key || '') || e.key === `focus_app_${table}` || e.key === table || e.key === `focus_${table}`) {
        const updated = readLocalCache(table, initialValue);
        if (isMountedRef.current) setData(updated);
      }
    };

    let unsubscribeUsers: (() => void) | null = null;
    if (isUsersTable) {
      unsubscribeUsers = userService.subscribeUsers((freshUsers) => {
        if (isMountedRef.current && Array.isArray(freshUsers)) {
          setData(freshUsers as unknown as T[]);
        }
      });
    }

    // Supabase Realtime Subscription Multiplexada para Desktop & Mobile na tabela específica
    let unsubscribeRealtime: (() => void) | null = null;
    if (typeof window !== 'undefined' && primaryDbTable) {
      try {
        unsubscribeRealtime = realtimeManager.subscribe(primaryDbTable, () => {
          if (isMountedRef.current) fetchData();
        });
      } catch (e) {
        console.warn('[useLocalStorageState] Realtime subscribe notice:', e);
      }
    }

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const updated = readLocalCache(table, initialValue);
        if (isMountedRef.current) setData(updated);
      }
    };

    const handleFocusStorageUpdate = () => {
      const updated = readLocalCache(table, initialValue);
      if (isMountedRef.current) setData(updated);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageUpdate);
      window.addEventListener('focus', handleVisibilityOrFocus);
      window.addEventListener('focus_storage_update', handleFocusStorageUpdate);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
      }
    }

    return () => {
      isMountedRef.current = false;
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeRealtime) unsubscribeRealtime();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageUpdate);
        window.removeEventListener('focus', handleVisibilityOrFocus);
        window.removeEventListener('focus_storage_update', handleFocusStorageUpdate);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  // ---------------------------------------------------------------------------
  // CRUD helpers com atualizações atômicas e persistência garantida no PostgreSQL
  // ---------------------------------------------------------------------------
  const save = useCallback(
    async (newData: T[]) => {
      const cleanedData = newData.map((item) => {
        if (!item.id || typeof item.id !== 'string') {
          return { ...item, id: crypto.randomUUID() };
        }
        return item;
      });

      setData(cleanedData);
      writeLocalCache(table, cleanedData);

      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new Event('focus_storage_update'));
        } catch {}
      }

      await syncToCloud(cleanedData);
    },
    [syncToCloud, table]
  );

  const addItem = useCallback(
    async (item: T) => {
      const itemWithUuid = {
        ...item,
        id: item.id ? item.id : crypto.randomUUID(),
      };
      setData((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        const updated = [itemWithUuid, ...current.filter((i) => i.id !== itemWithUuid.id)];
        writeLocalCache(table, updated);
        syncToCloud(updated);
        return updated;
      });
    },
    [syncToCloud, table]
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<T>) => {
      setData((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        const updated = current.map((it) => {
          const matchesId = it.id === id;
          const matchesEmail = isUsersTable && 
            Boolean((it as any).email && (patch as any).email && 
            String((it as any).email).toLowerCase().trim() === String((patch as any).email).toLowerCase().trim());

          if (matchesId || matchesEmail) {
            return { ...it, ...patch };
          }
          return it;
        });
        writeLocalCache(table, updated);
        syncToCloud(updated);
        return updated;
      });
    },
    [isUsersTable, syncToCloud, table]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      setData((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        const updated = current.filter((it) => it.id !== id);
        writeLocalCache(table, updated);
        return updated;
      });

      if (isFornecedores || table === 'focus_fornecedores' || table === 'fornecedores' || primaryDbTable === 'fornecedores') {
        try {
          const rawDel = localStorage.getItem('focus_app_deleted_fornecedores_ids');
          const deletedSet = new Set(rawDel ? JSON.parse(rawDel) : []);
          deletedSet.add(String(id));
          localStorage.setItem('focus_app_deleted_fornecedores_ids', JSON.stringify(Array.from(deletedSet)));
        } catch {}
      }

      if (isFiscal || table === 'focus_fiscal_documentos' || table === 'fiscal_documentos' || primaryDbTable === 'fiscal_documentos') {
        try {
          const rawDel = localStorage.getItem('focus_app_deleted_fiscal_ids');
          const deletedSet = new Set(rawDel ? JSON.parse(rawDel) : []);
          deletedSet.add(String(id));
          localStorage.setItem('focus_app_deleted_fiscal_ids', JSON.stringify(Array.from(deletedSet)));
          await supabase.from('fiscal_documentos').delete().eq('id', id);
        } catch {}
      }

      if (isCobrancas || table === 'focus_cobrancas' || table === 'cobrancas' || primaryDbTable === 'cobrancas') {
        try {
          const rawDel = localStorage.getItem('focus_app_deleted_cobrancas_ids');
          const deletedSet = new Set(rawDel ? JSON.parse(rawDel) : []);
          deletedSet.add(String(id));
          localStorage.setItem('focus_app_deleted_cobrancas_ids', JSON.stringify(Array.from(deletedSet)));
          await supabase.from('cobrancas').delete().eq('id', id);
        } catch {}
      }

      if (isUsersTable) {
        try {
          await userService.deleteUser(id);
        } catch {}
      }

      if (primaryDbTable) {
        try {
          await supabase.from(primaryDbTable).delete().eq('id', id);
        } catch (err) {
          console.warn(`[useDataStore] Erro ao deletar no Supabase (${primaryDbTable}):`, err);
        }
      }
      if (isClientsTable) {
        try {
          await clienteService.deleteCliente(id);
        } catch {}
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('focus_storage_update'));
      }
    },
    [isClientsTable, isCobrancas, isFiscal, isFornecedores, isUsersTable, primaryDbTable, table]
  );

  const saveItem = useCallback(
    async (item: T) => {
      const itemWithUuid = {
        ...item,
        id: item.id ? item.id : crypto.randomUUID(),
      };
      setData((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        const exists = current.some((it) => it.id === itemWithUuid.id);
        const updated = exists
          ? current.map((it) => (it.id === itemWithUuid.id ? { ...it, ...itemWithUuid } : it))
          : [itemWithUuid, ...current];
        writeLocalCache(table, updated);
        syncToCloud(updated);
        return updated;
      });
    },
    [syncToCloud, table]
  );

  const removeItem = deleteItem;
  const setAllItems = save;

  return {
    data,
    loading,
    error,
    addItem,
    updateItem,
    saveItem,
    deleteItem,
    removeItem,
    save,
    setAllItems,
  };
}
