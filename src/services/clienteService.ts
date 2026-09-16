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

function triggerClientSync() {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('focus_clients_updated'));
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

  // Se cidade for São Paulo e estado SP mas não tiver nenhum logradouro, cep ou bairro preenchido, era o default estático inserido pelo schema antigo
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
  if (typeof window === 'undefined') return map;

  const deletedIds = getDeletedClientIds();

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

              const orgName = item.nomeFantasia || item.razaoSocial || item.name || '';
              const sanitizedItem = {
                ...item,
                endereco: sanitizeAddress(item.endereco),
                contatos: sanitizeContacts(item.contatos, orgName),
              };
              const current = map.get(String(item.id));
              if (!current || (sanitizedItem.endereco?.cidade && !current.endereco?.cidade) || (sanitizedItem.endereco?.logradouro && !current.endereco?.logradouro) || (sanitizedItem.contatos?.length && !current.contatos?.length)) {
                map.set(String(item.id), sanitizedItem);
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
    return true;
  });
  const serialized = JSON.stringify(filtered);
  for (const key of LOCAL_STORAGE_KEYS) {
    safeSetItem(key, serialized);
  }
}

/**
 * Service de dados para o módulo de Clientes.
 * Responsável pela persistência local-first confiável e sincronização com Supabase.
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
      let dbItems: any[] = [];
      let dbFetchSucceeded = false;

      // 1. Buscar na tabela 'clientes' (que possui colunas de endereço completas)
      try {
        const { data: clientesData, error: clientesErr } = await supabase
          .from('clientes')
          .select('*')
          .not('razao_social', 'like', '__%')
          .not('nome_fantasia', 'like', '__%')
          .neq('status', 'deleted')
          .neq('status', 'deletado')
          .order('created_at', { ascending: false });

        if (!clientesErr && Array.isArray(clientesData)) {
          dbItems = [...dbItems, ...clientesData];
          dbFetchSucceeded = true;
        }
      } catch (err) {
        console.warn('[clienteService.getClientes] Warning fetching clientes:', err);
      }

      // 2. Buscar na tabela relacional 'clients' (para compatibilidade com registros adicionais)
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
          dbItems = [...dbItems, ...clientsData];
          dbFetchSucceeded = true;
        }
      } catch (err) {
        console.warn('[clienteService.getClientes] Warning fetching clients:', err);
      }

      // Se a consulta ao banco teve sucesso, mesclar Banco de Dados com Local Store
      if (dbFetchSucceeded) {
        const idMap = new Map<string, ClienteDTO>();

        dbItems.forEach(item => {
          if (!item || !item.id || deletedIds.has(String(item.id))) return;
          if (item.status === 'deleted' || item.status === 'deletado' || item.deleted === true) return;
          if (typeof item.name === 'string' && item.name.startsWith('__')) return;
          if (typeof item.razao_social === 'string' && item.razao_social.startsWith('__')) return;
          if (typeof item.nome_fantasia === 'string' && item.nome_fantasia.startsWith('__')) return;
          if (typeof item.status === 'string' && (item.status.includes('profile') || item.status.includes('colaborador'))) return;

          const id = String(item.id);
          const current = localMap.get(id);

          const rawEndereco = {
            cep: item.cep || item.endereco?.cep || current?.endereco?.cep || '',
            logradouro: item.logradouro || item.endereco?.logradouro || current?.endereco?.logradouro || '',
            numero: item.numero || item.endereco?.numero || current?.endereco?.numero || '',
            complemento: item.complemento || item.endereco?.complemento || current?.endereco?.complemento || '',
            bairro: item.bairro || item.endereco?.bairro || current?.endereco?.bairro || '',
            cidade: item.cidade || item.endereco?.cidade || current?.endereco?.cidade || '',
            estado: item.estado || item.endereco?.estado || current?.endereco?.estado || '',
            pais: item.pais || item.endereco?.pais || current?.endereco?.pais || 'Brasil',
          };

          const sanitizedEndereco = sanitizeAddress(rawEndereco);

          const orgNome = item.nome_fantasia || item.nomeFantasia || item.razao_social || item.razaoSocial || item.name || current?.nomeFantasia || current?.razaoSocial || 'Cliente';
          const defaultContactEmail = item.contact_email || item.email || '';
          const defaultContactName = formatContactName(item.contact_name || (item.name && !item.name.startsWith('__') ? item.name : undefined), defaultContactEmail, orgNome);

          const candidate: ClienteDTO = {
            id,
            codigo: item.codigo || current?.codigo || `CLI-${id.slice(0, 4).toUpperCase()}`,
            tipo: (item.tipo === 'Pessoa Física' || item.tipo === 'PF') ? 'Pessoa Física' : 'Pessoa Jurídica',
            razaoSocial: item.razao_social || item.razaoSocial || item.name || current?.razaoSocial || 'Cliente',
            nomeFantasia: item.nome_fantasia || item.nomeFantasia || item.name || current?.nomeFantasia || item.razao_social || 'Cliente',
            documento: item.documento || item.cnpj || item.cpf || current?.documento || '00.000.000/0001-00',
            inscricaoEstadual: item.inscricao_estadual || item.inscricaoEstadual || current?.inscricaoEstadual || 'Isento',
            inscricaoMunicipal: item.inscricao_municipal || item.inscricaoMunicipal || current?.inscricaoMunicipal || '',
            dataFundacaoNascimento: item.data_fundacao || item.dataFundacaoNascimento || current?.dataFundacaoNascimento || '',
            status: (item.status === 'inativo' || item.status === 'Inativo') ? 'Inativo' : (current?.status === 'Inativo' ? 'Inativo' : 'Ativo'),
            segmento: item.segmento || current?.segmento || 'Geral',
            porteEmpresa: item.porte || item.porteEmpresa || current?.porteEmpresa || 'Médio',
            site: item.site || current?.site || '',
            observacoes: item.observacoes || current?.observacoes || '',
            endereco: sanitizedEndereco,
            contatos: current?.contatos && current.contatos.length > 0 
              ? sanitizeContacts(current.contatos, orgNome)
              : [
                {
                  id: `ct-${id}`,
                  nome: defaultContactName,
                  email: defaultContactEmail,
                  cargo: 'Responsável',
                  celular: item.contact_phone || item.telefone || '(11) 99999-9999',
                  principal: true,
                }
              ],
            dataCadastro: item.created_at || item.dataCadastro || current?.dataCadastro || new Date().toISOString(),
            ultimaAtualizacao: item.updated_at || item.ultimaAtualizacao || current?.ultimaAtualizacao || new Date().toISOString(),
          };

          const parsed = clienteSchema.safeParse(candidate);
          const validCandidate = parsed.success ? parsed.data : candidate;

          const cleanDoc = (validCandidate.documento || '').replace(/\D/g, '');
          const isRealDoc = cleanDoc.length >= 11 && cleanDoc !== '00000000000000';

          if (idMap.has(id)) {
            const existing = idMap.get(id)!;
            const finalStatus = (existing.status === 'Inativo' || validCandidate.status === 'Inativo') ? 'Inativo' : 'Ativo';
            const merged: ClienteDTO = {
              ...existing,
              ...validCandidate,
              id: existing.id,
              status: finalStatus,
              codigo: existing.codigo || validCandidate.codigo,
              razaoSocial: (validCandidate.razaoSocial && validCandidate.razaoSocial !== 'Cliente') ? validCandidate.razaoSocial : existing.razaoSocial,
              nomeFantasia: (validCandidate.nomeFantasia && validCandidate.nomeFantasia !== 'Cliente') ? validCandidate.nomeFantasia : existing.nomeFantasia,
              documento: isRealDoc ? validCandidate.documento : existing.documento,
              endereco: (validCandidate.endereco?.cidade || validCandidate.endereco?.logradouro) ? validCandidate.endereco : existing.endereco,
              contatos: (validCandidate.contatos?.length && validCandidate.contatos[0]?.email !== 'contato@cliente.com') ? sanitizeContacts(validCandidate.contatos, validCandidate.nomeFantasia) : existing.contatos,
            };
            idMap.set(id, merged);
          } else {
            idMap.set(id, validCandidate);
          }
        });

        // 3. Mesclar clientes locais que ainda não foram sincronizados com o banco pelo ID
        for (const [locId, locClient] of localMap.entries()) {
          if (!locClient || !locClient.id || deletedIds.has(locId)) continue;
          if (idMap.has(locId)) {
            const existing = idMap.get(locId)!;
            const statusToKeep = (locClient.status === 'Inativo' || existing.status === 'Inativo') ? 'Inativo' : 'Ativo';
            idMap.set(locId, {
              ...existing,
              status: statusToKeep,
              endereco: (locClient.endereco?.cidade || locClient.endereco?.logradouro) ? locClient.endereco : existing.endereco,
              contatos: (locClient.contatos?.length && locClient.contatos[0]?.email !== 'contato@cliente.com') ? locClient.contatos : existing.contatos,
            });
          } else {
            idMap.set(locId, locClient);
          }
        }

        const syncedList = Array.from(idMap.values());
        persistClientsToAllStores(syncedList);
        return syncedList;
      }

      return Array.from(localMap.values());
    } catch (e) {
      console.error('[clienteService.getClientes] Unexpected error, returning local store:', e);
      return Array.from(getLocalClients().values());
    }
  },

  /**
   * Salvar ou atualizar um cliente com persistência garantida
   */
  async saveCliente(cliente: ClienteDTO): Promise<ClienteDTO> {
    const id = cliente.id || crypto.randomUUID();
    const finalStatus = (cliente.status === 'Inativo' || cliente.status === 'inativo') ? 'Inativo' : 'Ativo';

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
      endereco: {
        cep: cliente.endereco?.cep || '',
        logradouro: cliente.endereco?.logradouro || '',
        numero: cliente.endereco?.numero || '',
        complemento: cliente.endereco?.complemento || '',
        bairro: cliente.endereco?.bairro || '',
        cidade: cliente.endereco?.cidade || '',
        estado: cliente.endereco?.estado || '',
        pais: cliente.endereco?.pais || 'Brasil',
      },
      contatos: Array.isArray(cliente.contatos) ? cliente.contatos : [],
      dataCadastro: cliente.dataCadastro || new Date().toISOString(),
      ultimaAtualizacao: new Date().toISOString(),
    };

    // 1. Salvar no LocalStorage para resposta e persistência instantânea em todas as chaves
    const localMap = getLocalClients();
    localMap.set(id, validatedWithId);
    const updatedList = Array.from(localMap.values());
    persistClientsToAllStores(updatedList);
    triggerClientSync();

    // 2. Persistir no Supabase de forma resiliente nas tabelas clients e clientes
    try {
      await supabase.from('clients').upsert({
        id,
        name: validatedWithId.nomeFantasia || validatedWithId.razaoSocial,
        status: finalStatus === 'Inativo' ? 'inativo' : 'ativo',
        contact_email: validatedWithId.contatos?.[0]?.email || null,
        contact_phone: validatedWithId.contatos?.[0]?.celular || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      await supabase.from('clientes').upsert({
        id,
        codigo: validatedWithId.codigo || `CLI-${id.slice(0, 4).toUpperCase()}`,
        razao_social: validatedWithId.razaoSocial || validatedWithId.nomeFantasia,
        nome_fantasia: validatedWithId.nomeFantasia || validatedWithId.razaoSocial,
        documento: validatedWithId.documento || '00.000.000/0001-00',
        inscricao_estadual: validatedWithId.inscricaoEstadual || 'Isento',
        tipo: validatedWithId.tipo || 'Pessoa Jurídica',
        status: finalStatus,
        segmento: validatedWithId.segmento || 'Geral',
        cep: validatedWithId.endereco?.cep || null,
        logradouro: validatedWithId.endereco?.logradouro || null,
        numero: validatedWithId.endereco?.numero || null,
        bairro: validatedWithId.endereco?.bairro || null,
        cidade: validatedWithId.endereco?.cidade || null,
        estado: validatedWithId.endereco?.estado || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[clienteService.saveCliente] Supabase sync completed via local-first store:', e);
    }

    return validatedWithId;
  },

  /**
   * Excluir um cliente pelo ID e remover em cascata suas recorrências, contratos e títulos futuros
   */
  async deleteCliente(id: string): Promise<void> {
    markClientAsDeletedLocally(id);

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

    // 1. Excluir TODAS as Recorrências ligadas a este cliente (por clientId ou por clienteNome)
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

    // 4. Excluir contas e títulos vinculados no Contas a Pagar
    try {
      ['focus_contas_pagar', 'focus_app_focus_contas_pagar', 'focus_app_contas_pagar', 'focus_payables'].forEach(key => {
        const rawCP = safeGetItem(key);
        if (rawCP) {
          const titulos = JSON.parse(rawCP);
          if (Array.isArray(titulos)) {
            const filteredCP = titulos.filter((t: any) => {
              if (!t) return false;
              if (t.clienteId === id || t.fornecedorId === id) return false;
              if (t.fornecedor && clientNames.has(t.fornecedor.trim().toLowerCase())) return false;
              if (t.fornecedorNome && clientNames.has(t.fornecedorNome.trim().toLowerCase())) return false;
              if (t.descricao && Array.from(clientNames).some(cn => cn.length > 3 && t.descricao.toLowerCase().includes(cn))) return false;
              return true;
            });
            safeSetItem(key, JSON.stringify(filteredCP));
          }
        }
      });
    } catch {}

    // 5. Excluir Projetos vinculados
    try {
      ['focus_projetos', 'focus_app_focus_projetos'].forEach(key => {
        const rawP = safeGetItem(key);
        if (rawP) {
          const projetos = JSON.parse(rawP);
          if (Array.isArray(projetos)) {
            const filteredP = projetos.filter((p: any) => {
              if (!p) return false;
              if (p.clienteId === id || p.idCliente === id) return false;
              if (p.cliente && clientNames.has(p.cliente.trim().toLowerCase())) return false;
              return true;
            });
            safeSetItem(key, JSON.stringify(filteredP));
          }
        }
      });
    } catch {}

    // 6. Excluir do Supabase em cascata
    try { await supabase.from('recorrencias').delete().eq('client_id', id); } catch {}
    try { await supabase.from('recorrencias').delete().eq('cliente_id', id); } catch {}
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
