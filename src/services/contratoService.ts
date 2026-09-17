import { supabase } from '@/lib/supabaseClient';
import { contratoSchema, ContratoDTO } from '@/schemas/contratoSchema';
import { dmsService } from '@/services/dmsService';

export const contratoService = {
  /**
   * Buscar todos os contratos
   */
  async getContratos(): Promise<ContratoDTO[]> {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select(`
          *,
          clientes:cliente_id (
            razao_social,
            nome_fantasia
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => {
          const clienteNome = item.clientes?.nome_fantasia || item.clientes?.razao_social || item.cliente_nome || '';

          const mapped = {
            id: item.id,
            tenantId: item.tenant_id,
            numeroContrato: item.numero_contrato || item.numero || `CTR-${item.id?.slice(0, 6)}`,
            clienteId: item.cliente_id,
            clienteNome,
            objetoContrato: item.objeto_contrato || item.objeto || item.descricao || 'Prestação de Serviços',
            valorTotal: Number(item.valor_total || item.valor || 0),
            valorMensal: Number(item.valor_mensal || 0),
            tipoContrato: item.tipo_contrato || item.tipo || 'Prestação de Serviços',
            dataInicio: item.data_inicio || item.created_at,
            dataFim: item.data_fim,
            status: item.status || 'Ativo',
            renovacaoAutomatica: Boolean(item.renovacao_automatica),
            created_at: item.created_at,
            updated_at: item.updated_at,
          };
          const parsed = contratoSchema.safeParse(mapped);
          if (parsed.success) {
            return parsed.data;
          }
          console.error(`[contratoService.getContratos] Falha na validação do contrato ${item.id}:`, parsed.error.format());
          return null;
        }).filter((item): item is ContratoDTO => item !== null);
      }

      // Fallback LocalStorage
      const rawLocal = typeof window !== 'undefined' ? window.localStorage.getItem('focus_contratos') : null;
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: any) => c && !c.caminhoCompleto && c.parentId === undefined && (c.numeroContrato || c.objetoContrato || c.valorTotal));
        }
      }

      return [];
    } catch (err) {
      console.error('[contratoService.getContratos] Erro ao buscar contratos:', err);
      return [];
    }
  },

  /**
   * Salvar ou atualizar contrato
   */
  async saveContrato(contrato: ContratoDTO): Promise<ContratoDTO> {
    const validated = contratoSchema.parse(contrato);
    const id = validated.id || crypto.randomUUID();

    const payload: any = {
      id,
      tenant_id: validated.tenantId || null,
      numero_contrato: validated.numeroContrato || `CTR-${id.slice(0, 4).toUpperCase()}`,
      objeto_contrato: validated.objetoContrato || 'Prestação de Serviços',
      tipo_contrato: validated.tipoContrato || 'Prestação de Serviços',
      valor_total: Number(validated.valorTotal || 0),
      data_inicio: validated.dataInicio || new Date().toISOString().split('T')[0],
      data_fim: validated.dataFim || null,
      status: validated.status || 'Ativo',
      updated_at: new Date().toISOString(),
    };

    if (validated.clienteId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validated.clienteId)) {
      payload.cliente_id = validated.clienteId;
    }

    const { error } = await supabase.from('contratos').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('[contratoService.saveContrato] Aviso ao salvar contrato no Supabase:', error.message);
      if (payload.cliente_id) {
        // Fallback se cliente_id violar FK
        const safePayload = { ...payload, cliente_id: null };
        await supabase.from('contratos').upsert(safePayload, { onConflict: 'id' });
      }
    }

    // Auto-sincronizar no repositório central de Gestão de Documentos (DMS)
    try {
      dmsService.uploadFileFromModule({
        nome: `Contrato_${validated.numeroContrato}_${(validated.clienteNome || 'Cliente').replace(/\s+/g, '_')}.pdf`,
        extensao: 'pdf',
        tamanho: '2.1 MB',
        tamanhoBytes: 2202009,
        moduloOrigem: 'Contratos',
        clienteId: validated.clienteId,
        clienteNome: validated.clienteNome,
        contratoId: id,
        contratoNumero: validated.numeroContrato,
        categoria: `Contrato (${validated.tipoContrato})`,
        tags: ['Contratos', validated.status, validated.clienteNome || 'Cliente'],
        responsavelUpload: 'Módulo Contratos',
      });
    } catch {}

    // Atualizar cache local
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('focus_contratos');
        const list: ContratoDTO[] = raw ? JSON.parse(raw) : [];
        const updated = [{ ...validated, id }, ...list.filter(c => c.id !== id)];
        window.localStorage.setItem('focus_contratos', JSON.stringify(updated));
        window.localStorage.setItem('focus_app_focus_contratos', JSON.stringify(updated));
        window.dispatchEvent(new Event('focus_storage_update'));
      } catch {}
    }

    return { ...validated, id };
  },

  /**
   * Excluir contrato por ID
   */
  async deleteContrato(id: string): Promise<void> {
    // 1. Remover do Supabase se o ID for um UUID válido do PostgreSQL
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        await supabase.from('contratos').delete().eq('id', id);
      }
    } catch (err: any) {
      console.warn('[contratoService.deleteContrato] Erro ao deletar no Supabase:', err?.message);
    }

    // 2. Limpar caches locais
    if (typeof window !== 'undefined') {
      try {
        ['focus_contratos', 'focus_app_focus_contratos', 'focus_app_contratos'].forEach(key => {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const list: ContratoDTO[] = JSON.parse(raw);
            const filtered = list.filter(c => c.id !== id);
            window.localStorage.setItem(key, JSON.stringify(filtered));
          }
        });
        window.dispatchEvent(new Event('focus_storage_update'));
      } catch {}
    }
  }
};
