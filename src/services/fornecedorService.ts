import { supabase } from '@/lib/supabaseClient';
import { fornecedorSchema, FornecedorDTO } from '@/schemas/fornecedorSchema';

export const fornecedorService = {
  /**
   * Buscar todos os fornecedores
   */
  async getFornecedores(): Promise<FornecedorDTO[]> {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => {
          const mapped = {
            id: item.id,
            tenantId: item.tenant_id,
            codigo: item.codigo || `FOR-${item.id?.slice(0, 4)}`,
            razaoSocial: item.razao_social || item.name || 'Fornecedor',
            nomeFantasia: item.nome_fantasia || item.razao_social || 'Fornecedor',
            cnpj: item.cnpj || '',
            email: item.email || '',
            telefone: item.telefone || '',
            categoria: item.categoria || 'Geral',
            status: item.status === 'Inativo' ? 'Inativo' : 'Ativo',
            cep: item.cep,
            logradouro: item.logradouro,
            numero: item.numero,
            complemento: item.complemento,
            bairro: item.bairro,
            cidade: item.cidade || '',
            estado: item.estado || '',
            pais: item.pais || 'Brasil',
            observacoes: item.observacoes,
            created_at: item.created_at,
            updated_at: item.updated_at,
          };
          const parsed = fornecedorSchema.safeParse(mapped);
          if (parsed.success) {
            return parsed.data;
          }
          console.error(`[fornecedorService.getFornecedores] Falha na validação do fornecedor ${item.id}:`, parsed.error.format());
          return null;
        }).filter((item): item is FornecedorDTO => item !== null);
      }

      // Fallback LocalStorage
      const rawLocal = typeof window !== 'undefined' ? window.localStorage.getItem('focus_fornecedores') : null;
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) return parsed;
      }

      return [];
    } catch (err) {
      console.error('[fornecedorService.getFornecedores] Erro ao buscar fornecedores:', err);
      return [];
    }
  },

  /**
   * Salvar ou atualizar fornecedor
   */
  async saveFornecedor(fornecedor: FornecedorDTO): Promise<FornecedorDTO> {
    const validated = fornecedorSchema.parse(fornecedor);
    const id = validated.id || crypto.randomUUID();

    const payload = {
      id,
      tenant_id: validated.tenantId || null,
      codigo: validated.codigo || `FOR-${id.slice(0, 4).toUpperCase()}`,
      razao_social: validated.razaoSocial || validated.nomeFantasia || 'Fornecedor',
      nome_fantasia: validated.nomeFantasia || validated.razaoSocial || 'Fornecedor',
      cnpj: validated.cnpj || '',
      email: validated.email || null,
      telefone: validated.telefone || null,
      categoria: validated.categoria || 'Geral',
      status: validated.status === 'Inativo' ? 'Inativo' : 'Ativo',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('fornecedores').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('[fornecedorService.saveFornecedor] Aviso ao salvar fornecedor no Supabase:', error.message);
    }

    // Atualizar cache local
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('focus_fornecedores');
        const list: FornecedorDTO[] = raw ? JSON.parse(raw) : [];
        const updated = [{ ...validated, id }, ...list.filter(f => f.id !== id)];
        window.localStorage.setItem('focus_fornecedores', JSON.stringify(updated));
        window.localStorage.setItem('focus_app_focus_fornecedores', JSON.stringify(updated));
        window.dispatchEvent(new Event('focus_storage_update'));
      } catch {}
    }

    return { ...validated, id };
  },

  /**
   * Excluir fornecedor por ID
   */
  async deleteFornecedor(id: string): Promise<void> {
    // 1. Remover do Supabase
    try {
      await supabase.from('fornecedores').delete().eq('id', id);
    } catch (err: any) {
      console.warn('[fornecedorService.deleteFornecedor] Erro ao deletar no Supabase:', err?.message);
    }

    // 2. Limpar caches locais e registrar ID excluído
    if (typeof window !== 'undefined') {
      try {
        const rawDel = window.localStorage.getItem('focus_app_deleted_fornecedores_ids');
        const deletedSet = new Set(rawDel ? JSON.parse(rawDel) : []);
        deletedSet.add(String(id));
        window.localStorage.setItem('focus_app_deleted_fornecedores_ids', JSON.stringify(Array.from(deletedSet)));

        ['focus_fornecedores', 'focus_app_focus_fornecedores', 'focus_app_fornecedores'].forEach(key => {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const list: FornecedorDTO[] = JSON.parse(raw);
            const filtered = list.filter(f => f.id !== id);
            window.localStorage.setItem(key, JSON.stringify(filtered));
          }
        });
        window.dispatchEvent(new Event('focus_storage_update'));
      } catch {}
    }
  }
};
