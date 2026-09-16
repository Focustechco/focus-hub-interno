import { supabase } from '@/lib/supabaseClient';
import { colaboradorSchema, ColaboradorDTO } from '@/schemas/colaboradorSchema';

function toValidUuid(id?: string | null): string {
  if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return crypto.randomUUID();
  }
  return id;
}

/**
 * Service de dados reais para o módulo de Recursos Humanos (Colaboradores).
 * Conectado à tabela relacional de fotos (colaborador_fotos) e colaboradores no Supabase.
 */
export const colaboradorService = {
  async getColaboradores(): Promise<ColaboradorDTO[]> {
    try {
      // 1. Buscar colaboradores principais
      const { data: colabs, error } = await supabase
        .from('colaboradores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[colaboradorService.getColaboradores] Supabase Error/Fallback:', error.message);
        if (typeof window !== 'undefined') {
          for (const key of ['focus_rh_colaboradores', 'focus_colaboradores', 'focus_app_focus_colaboradores']) {
            const raw = window.localStorage.getItem(key);
            if (raw) {
              try {
                const list = JSON.parse(raw);
                if (Array.isArray(list) && list.length > 0) return list;
              } catch {}
            }
          }
        }
        return [];
      }

      // 2. Buscar fotos na tabela relacional dedicada 'colaborador_fotos'
      let fotosMap: Record<string, string> = {};
      try {
        const { data: fotosRows } = await supabase
          .from('colaborador_fotos')
          .select('*');

        if (Array.isArray(fotosRows)) {
          fotosRows.forEach((row: any) => {
            const fotoVal = row.foto_base64 || row.foto_url || '';
            if (fotoVal) {
              if (row.colaborador_id) fotosMap[String(row.colaborador_id).toLowerCase()] = fotoVal;
              if (row.colaborador_email) fotosMap[String(row.colaborador_email).toLowerCase()] = fotoVal;
              if (row.colaborador_matricula) fotosMap[String(row.colaborador_matricula).toLowerCase()] = fotoVal;
            }
          });
        }
      } catch (errFoto) {
        console.warn('[colaboradorService] Nota sobre tabela relacional colaborador_fotos:', errFoto);
      }



      if (colabs && colabs.length > 0) {
        const mapped = colabs.map((item: any) => {
          const itemId = String(item.id).toLowerCase();
          const itemEmail = (item.email || item.emailCorporativo || '').toLowerCase();
          const itemMat = (item.matricula || '').toLowerCase();

          const resolvedFoto =
            fotosMap[itemId] ||
            (itemEmail ? fotosMap[itemEmail] : '') ||
            (itemMat ? fotosMap[itemMat] : '') ||
            item.foto ||
            item.foto_url ||
            item.avatar_url ||
            '';

          return {
            id: item.id,
            matricula: item.matricula || `FC-${String(item.id).slice(0, 4).toUpperCase()}`,
            foto: resolvedFoto,
            fotoUrl: resolvedFoto,
            avatarUrl: resolvedFoto,
            nomeCompleto: item.nome || item.nomeCompleto || 'Colaborador',
            nomeSocial: item.nome_social || item.nomeSocial || undefined,
            cpf: item.cpf || '000.000.000-00',
            rg: item.rg || undefined,
            dataNascimento: item.data_nascimento || item.dataNascimento || '1990-01-01',
            emailCorporativo: item.email || item.emailCorporativo || 'colaborador@focustecnologia.com.br',
            emailPessoal: item.email_pessoal || item.emailPessoal || undefined,
            telefone: item.telefone || '(11) 99999-9999',
            cargo: item.cargo || 'Colaborador',
            departamento: item.departamento || 'Tecnologia',
            setor: item.setor || undefined,
            centroCusto: item.centro_custo || item.centroCusto || undefined,
            dataAdmissao: item.data_admissao || item.dataAdmissao || new Date().toISOString().split('T')[0],
            tipoContrato: item.tipo_contrato || item.tipoContrato || 'CLT',
            regime: item.regime || 'Híbrido',
            salarioBase: Number(item.salario_base || item.salarioBase || 0),
            jornadaTrabalho: item.jornada_trabalho || item.jornadaTrabalho || 'Seg a Sex 09:00 às 18:00',
            status: item.status || 'Ativo',
            metodoPagamento: item.metodo_pagamento || item.metodoPagamento || { formaPagamento: 'PIX' },
            documentos: item.documentos || [],
          };
        });

        // Sincronizar cache local
        if (typeof window !== 'undefined') {
          try {
            ['focus_colaboradores', 'focus_app_focus_colaboradores', 'focus_rh_colaboradores'].forEach(key => {
              window.localStorage.setItem(key, JSON.stringify(mapped));
            });
          } catch {}
        }

        return mapped;
      }

      return [];
    } catch (err) {
      console.warn('[colaboradorService.getColaboradores] Erro de conexão/Fallback:', err);
      if (typeof window !== 'undefined') {
        for (const key of ['focus_rh_colaboradores', 'focus_colaboradores', 'focus_app_focus_colaboradores']) {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            try {
              const list = JSON.parse(raw);
              if (Array.isArray(list) && list.length > 0) return list;
            } catch {}
          }
        }
      }
      return [];
    }
  },

  async saveColaborador(colaborador: ColaboradorDTO): Promise<ColaboradorDTO> {
    const validId = toValidUuid(colaborador.id);
    const validated = colaboradorSchema.parse({ ...colaborador, id: validId });

    const photoContent = validated.foto || validated.fotoUrl || validated.avatarUrl || validated.fotoBase64 || null;
    const isUrl = photoContent && (photoContent.startsWith('http://') || photoContent.startsWith('https://'));

    // 1. Payload para a tabela principal colaboradores
    const payload = {
      id: validId,
      matricula: validated.matricula || `FC-${validId.slice(0, 4).toUpperCase()}`,
      nome: validated.nomeCompleto,
      nome_social: validated.nomeSocial || null,
      cpf: validated.cpf || null,
      rg: validated.rg || null,
      email: validated.emailCorporativo || null,
      telefone: validated.telefone || null,
      cargo: validated.cargo || 'Colaborador',
      departamento: validated.departamento || 'Tecnologia',
      data_admissao: validated.dataAdmissao || new Date().toISOString().split('T')[0],
      data_nascimento: validated.dataNascimento || '1990-01-01',
      tipo_contrato: validated.tipoContrato || 'CLT',
      regime: validated.regime || 'Híbrido',
      salario_base: validated.salarioBase || 0,
      status: validated.status || 'Ativo',
      foto: photoContent,
      avatar_url: photoContent,
      foto_url: isUrl ? photoContent : null,
      metodo_pagamento: validated.metodoPagamento || null,
      documentos: validated.documentos || [],
      updated_at: new Date().toISOString(),
    };

    // Upsert na tabela colaboradores
    try {
      const { error: colabErr } = await supabase.from('colaboradores').upsert(payload, { onConflict: 'id' });
      if (colabErr) {
        // Fallback para colunas básicas se alguma coluna nova não existir
        const safePayload = {
          id: validId,
          matricula: validated.matricula || `FC-${validId.slice(0, 4).toUpperCase()}`,
          nome: validated.nomeCompleto,
          cpf: validated.cpf || null,
          email: validated.emailCorporativo || null,
          cargo: validated.cargo || 'Colaborador',
          departamento: validated.departamento || 'Tecnologia',
          data_admissao: validated.dataAdmissao || new Date().toISOString().split('T')[0],
          tipo_contrato: validated.tipoContrato || 'CLT',
          regime: validated.regime || 'Híbrido',
          salario_base: validated.salarioBase || 0,
          status: validated.status || 'Ativo',
          updated_at: new Date().toISOString(),
        };
        await supabase.from('colaboradores').upsert(safePayload, { onConflict: 'id' });
      }
    } catch (errColab: any) {
      console.warn('[colaboradorService.saveColaborador] Supabase upsert note:', errColab?.message);
    }

    // 2. Salvar na Tabela Relacional Dedicada 'colaborador_fotos'
    if (photoContent) {
      try {
        const fotoRowId = toValidUuid(`f0700000-0000-4000-8000-${validId.slice(-12)}`);
        const fotoPayload = {
          id: fotoRowId,
          colaborador_id: validId,
          colaborador_matricula: validated.matricula || null,
          colaborador_email: validated.emailCorporativo || null,
          foto_url: isUrl ? photoContent : null,
          foto_base64: photoContent,
          tipo_imagem: photoContent.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          tamanho_bytes: photoContent.length,
          updated_at: new Date().toISOString(),
        };

        await supabase
          .from('colaborador_fotos')
          .upsert(fotoPayload, { onConflict: 'id' });
      } catch (errFoto: any) {
        // Ignorar se RLS ainda não foi desabilitado no Supabase pelo usuário
      }
    }



    // 4. Atualizar caches locais
    const resultObj: ColaboradorDTO = { ...validated, id: validId, foto: photoContent || undefined };
    if (typeof window !== 'undefined') {
      try {
        ['focus_colaboradores', 'focus_app_focus_colaboradores', 'focus_rh_colaboradores'].forEach(key => {
          const raw = window.localStorage.getItem(key);
          const list: ColaboradorDTO[] = raw ? JSON.parse(raw) : [];
          const updated = [resultObj, ...list.filter(c => c.id !== validId)];
          window.localStorage.setItem(key, JSON.stringify(updated));
        });
        window.dispatchEvent(new Event('focus_storage_update'));
      } catch {}
    }

    return resultObj;
  },

  async deleteColaborador(id: string): Promise<void> {
    if (!id) return;

    // 1. Deletar foto na tabela relacional
    try {
      await supabase.from('colaborador_fotos').delete().eq('colaborador_id', id);
    } catch {}

    // 2. Deletar na tabela colaboradores
    try {
      await supabase.from('colaboradores').delete().eq('id', id);
    } catch (err: any) {
      console.warn('[colaboradorService.deleteColaborador] Erro ao deletar no Supabase:', err?.message);
    }



    // 4. Limpar caches locais
    if (typeof window !== 'undefined') {
      try {
        ['focus_colaboradores', 'focus_app_focus_colaboradores', 'focus_rh_colaboradores'].forEach(key => {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const list: ColaboradorDTO[] = JSON.parse(raw);
            const filtered = list.filter(c => c.id !== id);
            window.localStorage.setItem(key, JSON.stringify(filtered));
          }
        });
        window.dispatchEvent(new Event('focus_storage_update'));
      } catch {}
    }
  },
};

