import { supabase } from '@/lib/supabaseClient';
import { clienteSchema, ClienteDTO } from '@/schemas/clienteSchema';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

const LOCAL_STORAGE_KEYS = [
  'focus_clientes',
  'focus_app_focus_clientes',
  'focus_app_clientes',
  'focus_app_clients',
];
const DELETED_IDS_KEY = 'focus_app_deleted_client_ids';

// Cache em memória compartilhado durante o ciclo de vida da aplicação
const globalClientsMap = new Map<string, ClienteDTO>();

function triggerClientSync() {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('focus_clients_updated'));
      window.dispatchEvent(new Event('focus_storage_update'));
    } catch {}
  }
}

function getDeletedClientIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = safeGetItem(DELETED_IDS_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markClientAsDeletedLocally(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const deletedSet = getDeletedClientIds();
    deletedSet.add(id);
    safeSetItem(DELETED_IDS_KEY, JSON.stringify(Array.from(deletedSet)));
  } catch {}
}

function sanitizeAddress(endereco: any) {
  if (!endereco) return { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', pais: 'Brasil' };
  
  let cidade = (endereco.cidade || '').trim();
  let estado = (endereco.estado || '').trim();
  const logradouro = (endereco.logradouro || '').trim();
  const cep = (endereco.cep || '').trim();
  const bairro = (endereco.bairro || '').trim();

  // Se cidade for São Paulo e estado SP mas não tiver nenhum logradouro, cep ou bairro preenchido, era o default estático antigo
  if (cidade.toLowerCase() === 'são paulo' && estado.toUpperCase() === 'SP' && !logradouro && !cep && !bairro) {
    cidade = '';
    estado = '';
  }

  return {
    cep,
    logradouro,
    numero: (endereco.numero || '').trim(),
    complemento: (endereco.complemento || '').trim(),
    bairro,
    cidade,
    estado,
    pais: (endereco.pais || '').trim() || 'Brasil'
  };
}

export function formatContactName(name?: string, email?: string, fallbackOrg?: string): string {
  if (!name || typeof name !== 'string') {
    if (email && email.includes('@')) {
      const userPart = email.split('@')[0].replace(/[._-]/g, ' ');
      return userPart
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
    return fallbackOrg ? `Responsável (${fallbackOrg})` : 'Contato Principal';
  }
  const trimmed = name.trim();
  if (
    trimmed.startsWith('__') ||
    trimmed.includes('__COLABORADOR_') ||
    trimmed.includes('__USER_') ||
    trimmed.includes('__PROFILE__') ||
    trimmed.includes('__FOCUS_')
  ) {
    if (email && email.includes('@')) {
      const userPart = email.split('@')[0].replace(/[._-]/g, ' ');
      return userPart
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
    return fallbackOrg ? `Responsável (${fallbackOrg})` : 'Contato Principal';
  }
  return trimmed;
}

function sanitizeContacts(contatos: any[], fallbackOrg?: string): any[] {
  if (!Array.isArray(contatos) || contatos.length === 0) return [];
  return contatos
    .filter((c) => c && typeof c === 'object')
    .map((c, index) => {
      const email = typeof c.email === 'string' ? c.email.trim() : '';
      const nome = formatContactName(c.nome || c.name, email, fallbackOrg);
      return {
        id: c.id || `ct-${index + 1}`,
        nome,
        email: email.startsWith('__') ? '' : email,
        cargo: c.cargo || 'Responsável',
        departamento: c.departamento || 'Geral',
        celular: c.celular || c.telefone || '',
        telefone: c.telefone || undefined,
        whatsapp: c.whatsapp ?? true,
        principal: index === 0 ? true : Boolean(c.principal),
      };
    });
}

function getLocalClients(): Map<string, ClienteDTO> {
  const map = new Map<string, ClienteDTO>();
  const deletedIds = getDeletedClientIds();

  // 1. Carregar do cache em memória global
  for (const [id, item] of globalClientsMap.entries()) {
    if (item && item.id && !deletedIds.has(id)) {
      map.set(id, item);
    }
  }

  if (typeof window === 'undefined') return map;

  // 2. Carregar de todas as chaves de storage
  for (const key of LOCAL_STORAGE_KEYS) {
    try {
      const raw = safeGetItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.id && !deletedIds.has(String(item.id))) {
              if (typeof item.id === 'string' && item.id.startsWith('__')) continue;
              if (typeof item.name === 'string' && item.name.startsWith('__')) continue;
              if (typeof item.razaoSocial === 'string' && item.razaoSocial.startsWith('__')) continue;
              if (typeof item.nomeFantasia === 'string' && item.nomeFantasia.startsWith('__')) continue;
              if (typeof item.status === 'string' && (item.status.includes('profile') || item.status.includes('colaborador'))) continue;

              const orgName = item.nomeFantasia || item.razaoSocial || item.name || '';
              const sanitizedItem: ClienteDTO = {
                ...item,
                status: (item.status === 'Inativo' || item.status === 'inativo') ? 'Inativo' : 'Ativo',
                endereco: sanitizeAddress(item.endereco),
                contatos: sanitizeContacts(item.contatos, orgName),
              };
              const current = map.get(String(item.id));
              if (!current || (sanitizedItem.ultimaAtualizacao && current.ultimaAtualizacao && sanitizedItem.ultimaAtualizacao > current.ultimaAtualizacao)) {
                map.set(String(item.id), sanitizedItem);
                globalClientsMap.set(String(item.id), sanitizedItem);
              } else if (!current) {
                map.set(String(item.id), sanitizedItem);
                globalClientsMap.set(String(item.id), sanitizedItem);
              }
            }
          }
        }
      }
    } catch {}
  }

  return map;
}

function persistClientsToAllStores(clientes: ClienteDTO[]) {
  if (typeof window === 'undefined') return;
  const filtered = clientes.filter(c => {
    if (!c || !c.id) return false;
    if (typeof c.id === 'string' && c.id.startsWith('__')) return false;
    if (typeof c.razaoSocial === 'string' && c.razaoSocial.startsWith('__')) return false;
    if (typeof c.nomeFantasia === 'string' && c.nomeFantasia.startsWith('__')) return false;
    if (typeof c.status === 'string' && (c.status.includes('profile') || c.status.includes('colaborador'))) return false;
    return true;
  });

  // Atualizar cache em memória
  filtered.forEach(c => globalClientsMap.set(String(c.id), c));

  const serialized = JSON.stringify(filtered);
  for (const key of LOCAL_STORAGE_KEYS) {
    safeSetItem(key, serialized);
  }
}

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

/**
 * Service de dados para o módulo de Clientes.
 * Responsável pela persistência local-first confiável e sincronização em tempo real com Supabase.
 */
export const clienteService = {
  /**
   * Buscar todos os clientes da organização com banco de dados real como fonte da verdade.
   * Elimina automaticamente clientes apagados no Mobile ou Desktop e mantém o cache sincronizado.
   */
  async getClientes(): Promise<ClienteDTO[]> {
    try {
      const deletedIds = getDeletedClientIds();
      const localMap = getLocalClients();
      const idMap = new Map<string, ClienteDTO>();

      // 1. Buscar simultaneamente em 'clientes' e na tabela relacional 'cliente_contatos'
      let dbClientes: any[] = [];
      const dbContatosMap = new Map<string, any[]>();

      try {
        const [clientesRes, contatosRes] = await Promise.all([
          supabase
            .from('clientes')
            .select('*')
            .not('razao_social', 'like', '__%')
            .not('nome_fantasia', 'like', '__%')
            .neq('status', 'deleted')
            .neq('status', 'deletado')
            .order('created_at', { ascending: false }),
          supabase
            .from('cliente_contatos')
            .select('*')
        ]);

        if (!clientesRes.error && Array.isArray(clientesRes.data)) {
          dbClientes = clientesRes.data;
        }

        if (!contatosRes.error && Array.isArray(contatosRes.data)) {
          for (const ct of contatosRes.data) {
            if (ct && ct.cliente_id) {
              const list = dbContatosMap.get(String(ct.cliente_id)) || [];
              list.push(ct);
              dbContatosMap.set(String(ct.cliente_id), list);
            }
          }
        }
      } catch (err) {
        console.warn('[clienteService.getClientes] Warning fetching clientes/contatos from Supabase:', err);
      }

      // Processar clientes retornados de 'clientes'
      for (const item of dbClientes) {
        if (!item || !item.id || deletedIds.has(String(item.id))) continue;
        if (item.status === 'deleted' || item.status === 'deletado' || item.deleted === true) continue;
        if (typeof item.razao_social === 'string' && item.razao_social.startsWith('__')) continue;
        if (typeof item.nome_fantasia === 'string' && item.nome_fantasia.startsWith('__')) continue;
        if (typeof item.status === 'string' && (item.status.includes('profile') || item.status.includes('colaborador'))) continue;

        const id = String(item.id);
        const localClient = localMap.get(id);

        // Status
        const itemStatusStr = String(item.status || '').toLowerCase().trim();
        const dbStatus: 'Ativo' | 'Inativo' = (itemStatusStr === 'inativo') ? 'Inativo' : 'Ativo';
        
        let finalStatus: 'Ativo' | 'Inativo' = dbStatus;
        if (localClient?.ultimaAtualizacao && item.updated_at) {
          const localTime = new Date(localClient.ultimaAtualizacao).getTime();
          const dbTime = new Date(item.updated_at).getTime();
          if (localTime > dbTime + 2000) {
            finalStatus = localClient.status;
          }
        }

        const rawEndereco = {
          cep: item.cep || localClient?.endereco?.cep || '',
          logradouro: item.logradouro || localClient?.endereco?.logradouro || '',
          numero: item.numero || localClient?.endereco?.numero || '',
          complemento: item.complemento || localClient?.endereco?.complemento || '',
          bairro: item.bairro || localClient?.endereco?.bairro || '',
          cidade: item.cidade || localClient?.endereco?.cidade || '',
          estado: item.estado || localClient?.endereco?.estado || '',
          pais: item.pais || localClient?.endereco?.pais || 'Brasil',
        };

        const orgNome = item.nome_fantasia || item.razao_social || localClient?.nomeFantasia || localClient?.razaoSocial || 'Cliente';
        
        // Contatos da tabela relacional cliente_contatos
        const relContatos = dbContatosMap.get(id);
        let contatosFinais: any[] = [];

        if (Array.isArray(relContatos) && relContatos.length > 0) {
          contatosFinais = relContatos.map((c, idx) => ({
            id: String(c.id || `ct-${idx + 1}`),
            nome: formatContactName(c.nome, c.email, orgNome),
            email: c.email || '',
            cargo: c.cargo || 'Responsável',
            departamento: c.departamento || 'Geral',
            celular: c.celular || '',
            telefone: undefined,
            whatsapp: c.whatsapp ?? true,
            principal: idx === 0 ? true : Boolean(c.principal),
          }));
        } else if (localClient?.contatos && localClient.contatos.length > 0) {
          contatosFinais = sanitizeContacts(localClient.contatos, orgNome);
        } else {
          const defaultContactEmail = item.contact_email || item.email || '';
          const defaultContactName = formatContactName(item.contact_name, defaultContactEmail, orgNome);
          contatosFinais = [
            {
              id: `ct-${id}`,
              nome: defaultContactName,
              email: defaultContactEmail,
              cargo: 'Responsável',
              celular: item.contact_phone || item.telefone || '(11) 99999-9999',
              whatsapp: true,
              principal: true,
            }
          ];
        }

        const candidate: ClienteDTO = {
          id,
          codigo: item.codigo || localClient?.codigo || `CLI-${id.slice(0, 4).toUpperCase()}`,
          tipo: (item.tipo === 'Pessoa Física' || item.tipo === 'PF') ? 'Pessoa Física' : 'Pessoa Jurídica',
          razaoSocial: item.razao_social || localClient?.razaoSocial || 'Cliente',
          nomeFantasia: item.nome_fantasia || localClient?.nomeFantasia || item.razao_social || 'Cliente',
          documento: item.documento || localClient?.documento || '00.000.000/0001-00',
          inscricaoEstadual: item.inscricao_estadual || localClient?.inscricaoEstadual || 'Isento',
          inscricaoMunicipal: item.inscricao_municipal || localClient?.inscricaoMunicipal || '',
          dataFundacaoNascimento: item.data_fundacao || localClient?.dataFundacaoNascimento || '',
          status: finalStatus,
          segmento: item.segmento || localClient?.segmento || 'Geral',
          porteEmpresa: item.porte || localClient?.porteEmpresa || 'Médio',
          site: item.site || localClient?.site || '',
          observacoes: item.observacoes || localClient?.observacoes || '',
          endereco: sanitizeAddress(rawEndereco),
          contatos: contatosFinais,
          documentos: localClient?.documentos || item.documentos || [],
          dataCadastro: item.created_at || localClient?.dataCadastro || new Date().toISOString(),
          ultimaAtualizacao: item.updated_at || localClient?.ultimaAtualizacao || new Date().toISOString(),
        };

        const parsed = clienteSchema.safeParse(candidate);
        const resolvedClient = parsed.success ? parsed.data : candidate;
        idMap.set(id, resolvedClient);
        globalClientsMap.set(id, resolvedClient);
      }

      // 2. Buscar na tabela relacional 'clients' para clientes legados não migrados
      try {
        const { data: clientsData, error: clientsErr } = await supabase
          .from('clients')
          .select('*')
          .not('name', 'like', '__%')
          .not('status', 'like', '%profile%')
          .not('status', 'like', '%colaborador%')
          .not('status', 'like', '%usuario%')
          .neq('status', 'deleted')
          .neq('status', 'deletado')
          .order('created_at', { ascending: false });

        if (!clientsErr && Array.isArray(clientsData)) {
          for (const item of clientsData) {
            if (!item || !item.id || deletedIds.has(String(item.id))) continue;
            if (item.status === 'deleted' || item.status === 'deletado' || item.deleted === true) continue;
            if (typeof item.name === 'string' && item.name.startsWith('__')) continue;
            if (typeof item.status === 'string' && (item.status.includes('profile') || item.status.includes('colaborador'))) continue;

            const id = String(item.id);
            if (!idMap.has(id)) {
              const localClient = localMap.get(id);
              const itemStatusStr = String(item.status || '').toLowerCase().trim();
              const finalStatus: 'Ativo' | 'Inativo' = (itemStatusStr === 'inativo') ? 'Inativo' : 'Ativo';

              const orgNome = item.name || localClient?.nomeFantasia || localClient?.razaoSocial || 'Cliente';
              const defaultContactEmail = item.contact_email || localClient?.contatos?.[0]?.email || '';
              const defaultContactName = formatContactName(item.contact_name || localClient?.contatos?.[0]?.nome, defaultContactEmail, orgNome);

              const candidate: ClienteDTO = {
                id,
                codigo: localClient?.codigo || `CLI-${id.slice(0, 4).toUpperCase()}`,
                tipo: localClient?.tipo || 'Pessoa Jurídica',
                razaoSocial: localClient?.razaoSocial || item.name || 'Cliente',
                nomeFantasia: item.name || localClient?.nomeFantasia || 'Cliente',
                documento: localClient?.documento || '00.000.000/0001-00',
                inscricaoEstadual: localClient?.inscricaoEstadual || 'Isento',
                inscricaoMunicipal: localClient?.inscricaoMunicipal || '',
                dataFundacaoNascimento: localClient?.dataFundacaoNascimento || '',
                status: finalStatus,
                segmento: localClient?.segmento || 'Geral',
                porteEmpresa: localClient?.porteEmpresa || 'Médio',
                site: localClient?.site || '',
                observacoes: localClient?.observacoes || '',
                endereco: sanitizeAddress(localClient?.endereco),
                contatos: localClient?.contatos && localClient.contatos.length > 0
                  ? sanitizeContacts(localClient.contatos, orgNome)
                  : [
                      {
                        id: `ct-${id}`,
                        nome: defaultContactName,
                        email: defaultContactEmail,
                        cargo: 'Responsável',
                        celular: item.contact_phone || '(11) 99999-9999',
                        whatsapp: true,
                        principal: true,
                      }
                    ],
                documentos: localClient?.documentos || [],
                dataCadastro: item.created_at || localClient?.dataCadastro || new Date().toISOString(),
                ultimaAtualizacao: item.updated_at || localClient?.ultimaAtualizacao || new Date().toISOString(),
              };

              const parsed = clienteSchema.safeParse(candidate);
              const resolvedClient = parsed.success ? parsed.data : candidate;
              idMap.set(id, resolvedClient);
              globalClientsMap.set(id, resolvedClient);
            }
          }
        }
      } catch (err) {
        console.warn('[clienteService.getClientes] Warning fetching clients table:', err);
      }

      // 3. Mesclar clientes locais que foram criados offline e ainda não existem no banco
      for (const [locId, locClient] of localMap.entries()) {
        if (!locClient || !locClient.id || deletedIds.has(locId)) continue;
        if (!idMap.has(locId)) {
          idMap.set(locId, locClient);
          globalClientsMap.set(locId, locClient);
        }
      }

      const syncedList = Array.from(idMap.values());
      persistClientsToAllStores(syncedList);
      return syncedList;
    } catch (e) {
      console.error('[clienteService.getClientes] Erro inesperado, retornando cache local:', e);
      return Array.from(getLocalClients().values());
    }
  },

  /**
   * Salvar ou atualizar um cliente com persistência garantida em tempo real
   */
  async saveCliente(cliente: ClienteDTO): Promise<ClienteDTO> {
    const id = toValidUuid(cliente.id);
    const finalStatus: 'Ativo' | 'Inativo' = (cliente.status === 'Inativo' || cliente.status === 'inativo') ? 'Inativo' : 'Ativo';

    const validatedWithId: ClienteDTO = {
      id,
      codigo: cliente.codigo || `CLI-${Math.floor(100 + Math.random() * 900)}`,
      tipo: cliente.tipo || 'Pessoa Jurídica',
      razaoSocial: cliente.razaoSocial || cliente.nomeFantasia || 'Cliente',
      nomeFantasia: cliente.nomeFantasia || cliente.razaoSocial || 'Cliente',
      documento: cliente.documento || '00.000.000/0001-00',
      inscricaoEstadual: cliente.inscricaoEstadual || 'Isento',
      inscricaoMunicipal: cliente.inscricaoMunicipal || '',
      dataFundacaoNascimento: cliente.dataFundacaoNascimento || '',
      status: finalStatus,
      segmento: cliente.segmento || 'Geral',
      porteEmpresa: cliente.porteEmpresa || 'Médio',
      site: cliente.site || '',
      observacoes: cliente.observacoes || '',
      endereco: sanitizeAddress(cliente.endereco),
      contatos: sanitizeContacts(Array.isArray(cliente.contatos) ? cliente.contatos : [], cliente.nomeFantasia || cliente.razaoSocial),
      documentos: Array.isArray(cliente.documentos) ? cliente.documentos : [],
      dataCadastro: cliente.dataCadastro || new Date().toISOString(),
      ultimaAtualizacao: new Date().toISOString(),
    };

    // 1. Atualizar cache em memória e todas as chaves do LocalStorage preservando todos os clientes existentes
    globalClientsMap.set(id, validatedWithId);
    const localMap = getLocalClients();
    localMap.set(id, validatedWithId);
    const updatedList = Array.from(localMap.values());
    persistClientsToAllStores(updatedList);
    triggerClientSync();

    // 2. Persistir no Supabase na tabela principal 'clientes'
    try {
      await supabase.from('clientes').upsert({
        id,
        codigo: validatedWithId.codigo,
        razao_social: validatedWithId.razaoSocial,
        nome_fantasia: validatedWithId.nomeFantasia,
        documento: validatedWithId.documento,
        inscricao_estadual: validatedWithId.inscricaoEstadual,
        tipo: validatedWithId.tipo,
        status: finalStatus,
        segmento: validatedWithId.segmento,
        cep: validatedWithId.endereco?.cep || null,
        logradouro: validatedWithId.endereco?.logradouro || null,
        numero: validatedWithId.endereco?.numero || null,
        bairro: validatedWithId.endereco?.bairro || null,
        cidade: validatedWithId.endereco?.cidade || null,
        estado: validatedWithId.endereco?.estado || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[clienteService.saveCliente] Erro ao sincronizar tabela clientes no Supabase:', e);
    }

    // 3. Persistir na tabela relacional 'clients' (para compatibilidade com FKs de projetos, contas_receber)
    try {
      await supabase.from('clients').upsert({
        id,
        name: validatedWithId.nomeFantasia || validatedWithId.razaoSocial,
        status: finalStatus === 'Inativo' ? 'inativo' : 'ativo',
        contact_email: validatedWithId.contatos?.[0]?.email || null,
        contact_phone: validatedWithId.contatos?.[0]?.celular || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[clienteService.saveCliente] Erro ao sincronizar tabela clients no Supabase:', e);
    }

    // 4. Persistir contatos na tabela relacional 'cliente_contatos'
    if (Array.isArray(validatedWithId.contatos) && validatedWithId.contatos.length > 0) {
      try {
        const contatosPayload = validatedWithId.contatos.map((ct: any, idx: number) => ({
          id: toValidUuid(ct.id || `ct-${id}-${idx}`),
          cliente_id: id,
          nome: formatContactName(ct.nome || ct.name, ct.email, validatedWithId.nomeFantasia || validatedWithId.razaoSocial),
          email: ct.email && !ct.email.startsWith('__') ? ct.email : null,
          cargo: ct.cargo || 'Responsável',
          departamento: ct.departamento || 'Geral',
          celular: ct.celular || ct.telefone || null,
          whatsapp: ct.whatsapp ?? true,
          principal: idx === 0 ? true : Boolean(ct.principal),
          updated_at: new Date().toISOString(),
        }));
        await supabase.from('cliente_contatos').upsert(contatosPayload, { onConflict: 'id' });
      } catch (err) {
        console.warn('[clienteService.saveCliente] Erro ao sincronizar cliente_contatos:', err);
      }
    }

    return validatedWithId;
  },

  /**
   * Excluir um cliente pelo ID e remover em cascata suas recorrências, contratos e títulos futuros
   */
  async deleteCliente(id: string): Promise<void> {
    markClientAsDeletedLocally(id);

    globalClientsMap.delete(id);
    const localMap = getLocalClients();
    const deletedClient = localMap.get(id);
    const clientNames = new Set<string>();
    if (deletedClient) {
      if (deletedClient.nomeFantasia) clientNames.add(deletedClient.nomeFantasia.trim().toLowerCase());
      if (deletedClient.razaoSocial) clientNames.add(deletedClient.razaoSocial.trim().toLowerCase());
      if (deletedClient.codigo) clientNames.add(deletedClient.codigo.trim().toLowerCase());
    }

    localMap.delete(id);
    persistClientsToAllStores(Array.from(localMap.values()));

    // 1. Excluir TODAS as Recorrências ligadas a este cliente
    try {
      const rawRecs = safeGetItem('focus_recorrencias');
      if (rawRecs) {
        const recs = JSON.parse(rawRecs);
        if (Array.isArray(recs)) {
          const filteredRecs = recs.filter((r: any) => {
            if (!r) return false;
            if (r.clientId === id || r.clienteId === id) return false;
            if (r.clienteNome && clientNames.has(r.clienteNome.trim().toLowerCase())) return false;
            return true;
          });
          safeSetItem('focus_recorrencias', JSON.stringify(filteredRecs));
        }
      }
    } catch {}

    // 2. Excluir Contratos vinculados a este cliente
    try {
      const rawContratos = safeGetItem('focus_contratos');
      if (rawContratos) {
        const contratos = JSON.parse(rawContratos);
        if (Array.isArray(contratos)) {
          const filteredContratos = contratos.filter((c: any) => {
            if (!c) return false;
            if (c.clienteId === id || c.clientId === id) return false;
            if (c.clienteNome && clientNames.has(c.clienteNome.trim().toLowerCase())) return false;
            if (c.nome && clientNames.has(c.nome.trim().toLowerCase())) return false;
            return true;
          });
          safeSetItem('focus_contratos', JSON.stringify(filteredContratos));
        }
      }
    } catch {}

    // 3. Excluir títulos em aberto / programados no Contas a Receber
    try {
      ['focus_contas_receber', 'focus_app_focus_contas_receber', 'focus_app_contas_receber', 'focus_receivables'].forEach(key => {
        const rawCR = safeGetItem(key);
        if (rawCR) {
          const titulos = JSON.parse(rawCR);
          if (Array.isArray(titulos)) {
            const filteredCR = titulos.filter((t: any) => {
              if (!t) return false;
              if (t.clienteId === id || t.clientId === id) return false;
              if (t.cliente && clientNames.has(t.cliente.trim().toLowerCase())) return false;
              if (t.clienteNome && clientNames.has(t.clienteNome.trim().toLowerCase())) return false;
              return true;
            });
            safeSetItem(key, JSON.stringify(filteredCR));
          }
        }
      });
    } catch {}

    // 4. Excluir contatos relacionais e tabelas vinculadas no Supabase
    try { await supabase.from('cliente_contatos').delete().eq('cliente_id', id); } catch {}
    try { await supabase.from('contas_receber').delete().eq('cliente_id', id); } catch {}
    try { await supabase.from('contas_pagar').delete().eq('fornecedor_id', id); } catch {}
    try { await supabase.from('contratos').delete().eq('cliente_id', id); } catch {}
    try { await supabase.from('projetos').delete().eq('cliente_id', id); } catch {}

    for (const cName of clientNames) {
      if (cName.length > 3) {
        try { await supabase.from('contas_receber').delete().ilike('cliente_nome', `%${cName}%`); } catch {}
        try { await supabase.from('contas_pagar').delete().ilike('fornecedor_nome', `%${cName}%`); } catch {}
      }
    }

    try {
      const { error: err1 } = await supabase.from('clients').delete().eq('id', id);
      if (err1) {
        await supabase.from('clients').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', id);
      }
    } catch (e) {
      console.warn('[clienteService.deleteCliente] Local delete complete:', e);
    }

    try {
      const { error: err2 } = await supabase.from('clientes').delete().eq('id', id);
      if (err2) {
        await supabase.from('clientes').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', id);
      }
    } catch {}

    triggerClientSync();
  },
};
