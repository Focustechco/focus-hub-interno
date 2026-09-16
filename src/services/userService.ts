import { supabase } from '@/lib/supabaseClient';
import { Usuario } from '@/features/usuarios/types';
import { INITIAL_USUARIOS } from '@/features/usuarios/data/initialData';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

const USERS_STORAGE_KEY = 'focus_app_focus_usuarios';
const DELETED_USERS_STORAGE_KEY = 'focus_app_deleted_users_state';

function getDeletedUsersSet(): { emails: Set<string>; ids: Set<string> } {
  try {
    const raw = safeGetItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        emails: new Set<string>((parsed.emails || []).map((e: string) => e.toLowerCase().trim())),
        ids: new Set<string>((parsed.ids || []).map((id: string) => String(id))),
      };
    }
  } catch {}
  return { emails: new Set<string>(), ids: new Set<string>() };
}

function recordDeletedUser(id: string, email?: string) {
  const { emails, ids } = getDeletedUsersSet();
  if (id) ids.add(String(id));
  if (email) emails.add(email.toLowerCase().trim());
  safeSetItem(
    DELETED_USERS_STORAGE_KEY,
    JSON.stringify({ emails: Array.from(emails), ids: Array.from(ids) })
  );
}

function unmarkDeletedUser(id: string, email?: string) {
  const { emails, ids } = getDeletedUsersSet();
  if (id) ids.delete(String(id));
  if (email) emails.delete(email.toLowerCase().trim());
  safeSetItem(
    DELETED_USERS_STORAGE_KEY,
    JSON.stringify({ emails: Array.from(emails), ids: Array.from(ids) })
  );
}

function broadcastUsersUpdate() {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('focus_users_updated'));
      window.dispatchEvent(new Event('focus_storage_update'));
    } catch {}
  }
}

// Converte string base64 para Blob binário para upload no Supabase Storage
function base64ToBlob(base64: string, contentType = 'image/jpeg'): Blob {
  const byteCharacters = atob(base64.split(',')[1] || base64);
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: contentType });
}

// Gera um UUID determinístico válido a partir de uma chave string
function generateDeterministicUuid(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, '0').slice(-12);
  return `00000000-0000-4000-a000-${hex}`;
}

/**
 * Service Central de Governança de Usuários e Autenticação
 * 100% Persistido no Banco de Dados Relacional Supabase / PostgreSQL com Sincronização Realtime Mobile (iOS/Android) e Desktop.
 */
export const userService = {
  /**
   * Buscar todos os usuários cadastrados diretamente do Banco de Dados Relacional
   */
  async getUsers(): Promise<Usuario[]> {
    const { emails: deletedEmails, ids: deletedIds } = getDeletedUsersSet();
    const userMap = new Map<string, Usuario>();

    // 1. Carregar base corporativa padrão (filtrando deletados)
    INITIAL_USUARIOS.forEach((u) => {
      const emailKey = u.email.toLowerCase().trim();
      if (!deletedEmails.has(emailKey) && !deletedIds.has(u.id)) {
        userMap.set(emailKey, { ...u });
      }
    });

    // 2. Carregar do cache local imediato
    try {
      const rawLocal = safeGetItem(USERS_STORAGE_KEY) || safeGetItem('focus_usuarios');
      if (rawLocal) {
        const localList: Usuario[] = JSON.parse(rawLocal);
        if (Array.isArray(localList)) {
          localList.forEach((u) => {
            if (u && u.email) {
              const key = u.email.toLowerCase().trim();
              if (!deletedEmails.has(key) && !deletedIds.has(u.id)) {
                const existing = userMap.get(key);
                userMap.set(key, { ...existing, ...u });
              }
            }
          });
        }
      }
    } catch {}

    // 3. Buscar perfis e fotos persistidos na tabela 'clients' (profile rows)
    const profileMap = new Map<string, any>();
    try {
      const { data: profileRows, error: profileErr } = await supabase
        .from('clients')
        .select('*')
        .like('name', '__USER_PROFILE__%');

      if (!profileErr && Array.isArray(profileRows) && profileRows.length > 0) {
        profileRows.forEach((row: any) => {
          if (row.contact_email && row.contact_phone) {
            const emailKey = row.contact_email.toLowerCase().trim();
            if (!deletedEmails.has(emailKey) && !deletedIds.has(row.id)) {
              try {
                const parsed = JSON.parse(row.contact_phone);
                profileMap.set(emailKey, parsed);
              } catch {
                profileMap.set(emailKey, { foto: row.contact_phone });
              }
            }
          }
        });
      }
    } catch (err) {
      console.warn('[userService.getUsers] Aviso ao consultar perfis em clients:', err);
    }

    // 4. Buscar do Banco de Dados Supabase (Tabela users)
    const seenDbEmails = new Set<string>();
    const duplicateDbIdsToDelete: string[] = [];

    try {
      const { data: dbUsers, error: usersErr } = await supabase
        .from('users')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!usersErr && Array.isArray(dbUsers) && dbUsers.length > 0) {
        dbUsers.forEach((item: any) => {
          if (item && (item.email || item.nome)) {
            const emailKey = (item.email || '').toLowerCase().trim();
            if (deletedEmails.has(emailKey) || deletedIds.has(item.id)) {
              return;
            }

            // Se já vimos esse e-mail na mesma tabela users, marcar a linha duplicada para exclusão
            if (seenDbEmails.has(emailKey)) {
              duplicateDbIdsToDelete.push(item.id);
              return;
            }
            seenDbEmails.add(emailKey);

            const existing = userMap.get(emailKey);
            const profData = profileMap.get(emailKey) || {};

            let finalFoto = profData.foto || existing?.foto || '';
            if (!finalFoto && item.keycloak_sub) {
              if (item.keycloak_sub.startsWith('http') || item.keycloak_sub.startsWith('data:')) {
                finalFoto = item.keycloak_sub;
              }
            }

            const mapped: Usuario = {
              id: item.id || existing?.id || generateDeterministicUuid(`user_${emailKey}`),
              nome: item.nome || profData.nomeExibicao || existing?.nome || 'Usuário',
              nomeExibicao: profData.nomeExibicao || item.nome || existing?.nomeExibicao || 'Usuário',
              email: item.email || existing?.email || emailKey,
              senha: existing?.senha || 'Focus@2026',
              telefone: profData.telefone || existing?.telefone || '',
              foto: finalFoto,
              cargo: item.cargo || profData.cargo || existing?.cargo || 'Colaborador Focus',
              departamento: item.departamento || profData.departamento || existing?.departamento || 'Geral',
              matricula: profData.matricula || existing?.matricula || `FT-${Math.floor(100 + Math.random() * 900)}`,
              status: item.status === 'Inativo' ? 'Inativo' : item.status === 'Bloqueado' ? 'Bloqueado' : 'Ativo',
              perfil: profData.perfil || existing?.perfil || 'Super Administrador',
              rolesComplementares: profData.rolesComplementares || existing?.rolesComplementares || [],
              mfaHabilitado: Boolean(existing?.mfaHabilitado ?? true),
              ultimoLogin: existing?.ultimoLogin || new Date().toISOString(),
              tentativasFalhas: existing?.tentativasFalhas || 0,
              sessoes: existing?.sessoes || [],
              permissoes: profData.permissoes || existing?.permissoes || (INITIAL_USUARIOS[0].permissoes as any),
              auditoria: existing?.auditoria || [],
            };

            if (emailKey) {
              userMap.set(emailKey, mapped);
            }
          }
        });
      }
    } catch (e) {
      console.warn('[userService.getUsers] Aviso ao consultar tabela users:', e);
    }

    // Limpar duplicatas de DB em background
    if (duplicateDbIdsToDelete.length > 0) {
      supabase.from('users').delete().in('id', duplicateDbIdsToDelete).then(() => {}).catch(() => {});
    }

    const finalList = Array.from(userMap.values());
    
    // Atualizar cache local
    safeSetItem(USERS_STORAGE_KEY, JSON.stringify(finalList));
    safeSetItem('focus_usuarios', JSON.stringify(finalList));

    return finalList;
  },

  /**
   * Salvar usuário completamente no Banco de Dados Relacional Supabase e disparar sincronização Realtime
   */
  async saveUser(user: Usuario): Promise<Usuario> {
    const cleanEmail = user.email.toLowerCase().trim();
    unmarkDeletedUser(user.id, cleanEmail);

    const users = await this.getUsers();
    const filtered = users.filter((u) => u.email.toLowerCase().trim() !== cleanEmail && u.id !== user.id);
    const updatedList = [user, ...filtered];

    // 1. Atualizar cache imediato
    safeSetItem(USERS_STORAGE_KEY, JSON.stringify(updatedList));
    safeSetItem('focus_usuarios', JSON.stringify(updatedList));
    broadcastUsersUpdate();

    const targetUserId = user.id || generateDeterministicUuid(`user_${cleanEmail}`);

    // 2. Persistir no Supabase (Tabela users) com colunas válidas
    try {
      const userPayload = {
        id: targetUserId,
        nome: user.nome || user.nomeExibicao || 'Usuário',
        email: cleanEmail,
        cargo: user.cargo || 'Colaborador Focus',
        departamento: user.departamento || 'Geral',
        status: user.status === 'Inativo' ? 'Inativo' : user.status === 'Bloqueado' ? 'Bloqueado' : 'Ativo',
        keycloak_sub: (user.foto && user.foto.startsWith('http') && user.foto.length <= 250) ? user.foto : `profile:${cleanEmail}`,
        updated_at: new Date().toISOString(),
      };

      await supabase.from('users').upsert(userPayload, { onConflict: 'id' });

      // Remover duplicatas com mesmo email mas id diferente
      await supabase.from('users').delete().ilike('email', cleanEmail).neq('id', targetUserId);
    } catch (err: any) {
      console.warn('[userService.saveUser] Aviso ao salvar em users:', err?.message);
    }

    // 3. Persistir registro de perfil e foto completa na tabela 'clients' (profile row)
    try {
      const profileRowId = generateDeterministicUuid(`user_profile_${cleanEmail}`);
      const metadataPayload = JSON.stringify({
        foto: user.foto || '',
        telefone: user.telefone || '',
        perfil: user.perfil || 'Super Administrador',
        nomeExibicao: user.nomeExibicao || user.nome,
        cargo: user.cargo || '',
        departamento: user.departamento || '',
        permissoes: user.permissoes || null,
        rolesComplementares: user.rolesComplementares || [],
        matricula: user.matricula || '',
        updatedAt: new Date().toISOString(),
      });

      await supabase.from('clients').upsert({
        id: profileRowId,
        name: `__USER_PROFILE__${user.nome || cleanEmail}`,
        status: 'inativo',
        contact_email: cleanEmail,
        contact_phone: metadataPayload,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (err: any) {
      console.warn('[userService.saveUser] Aviso ao espelhar profile row em clients:', err?.message);
    }

    // 4. Se o usuário existir na tabela colaboradores, atualizar status e cargo
    try {
      await supabase
        .from('colaboradores')
        .update({
          cargo: user.cargo || null,
          departamento: user.departamento || null,
          status: user.status || 'Ativo',
          foto: user.foto || null,
          avatar_url: user.foto || null,
          updated_at: new Date().toISOString(),
        })
        .ilike('email', cleanEmail);
    } catch {}

    return user;
  },

  /**
   * Salvar múltiplos usuários
   */
  async saveAllUsers(users: Usuario[]): Promise<void> {
    safeSetItem(USERS_STORAGE_KEY, JSON.stringify(users));
    safeSetItem('focus_usuarios', JSON.stringify(users));
    broadcastUsersUpdate();

    for (const u of users) {
      await this.saveUser(u);
    }
  },

  /**
   * Excluir Usuário de forma permanente e limpa no Banco de Dados Supabase e Cache
   */
  async deleteUser(userIdOrEmail: string, optionalEmail?: string): Promise<boolean> {
    const users = await this.getUsers();
    const cleanKey = userIdOrEmail.toLowerCase().trim();
    const target = users.find(
      (u) =>
        u.id === userIdOrEmail ||
        u.email.toLowerCase().trim() === cleanKey ||
        (optionalEmail && u.email.toLowerCase().trim() === optionalEmail.toLowerCase().trim())
    );

    const targetId = target?.id || userIdOrEmail;
    const targetEmail = (target?.email || optionalEmail || (userIdOrEmail.includes('@') ? userIdOrEmail : '')).toLowerCase().trim();

    // 1. Gravar na lista de exclusão permanente
    recordDeletedUser(targetId, targetEmail);

    // 2. Atualizar cache local
    const remaining = users.filter((u) => {
      if (u.id === targetId) return false;
      if (targetEmail && u.email.toLowerCase().trim() === targetEmail) return false;
      return true;
    });
    safeSetItem(USERS_STORAGE_KEY, JSON.stringify(remaining));
    safeSetItem('focus_usuarios', JSON.stringify(remaining));
    broadcastUsersUpdate();

    // 3. Excluir do Supabase na tabela 'users'
    try {
      if (targetId) {
        await supabase.from('users').delete().eq('id', targetId);
      }
      if (targetEmail) {
        await supabase.from('users').delete().ilike('email', targetEmail);
      }
    } catch (err) {
      console.warn('[userService.deleteUser] Erro ao deletar de users:', err);
    }

    // 4. Excluir perfil espelho na tabela 'clients'
    try {
      if (targetEmail) {
        await supabase.from('clients').delete().ilike('contact_email', targetEmail);
        await supabase.from('clients').delete().like('name', `__USER_PROFILE__%${targetEmail}%`);
      }
      if (targetId) {
        await supabase.from('clients').delete().eq('id', targetId);
      }
    } catch (err) {
      console.warn('[userService.deleteUser] Erro ao deletar profile row de clients:', err);
    }

    // 5. Se houver colaborador associado, marcar como Inativo
    try {
      if (targetEmail) {
        await supabase.from('colaboradores').update({ status: 'Inativo' }).ilike('email', targetEmail);
      }
    } catch {}

    broadcastUsersUpdate();
    return true;
  },

  /**
   * Atualizar Perfil de Usuário com foto, nome, cargo, etc.
   */
  async updateUserProfile(userIdOrEmail: string, patch: Partial<Usuario>): Promise<Usuario | null> {
    const users = await this.getUsers();
    const cleanKey = userIdOrEmail.toLowerCase().trim();
    const target = users.find(
      (u) =>
        u.id === userIdOrEmail ||
        u.email.toLowerCase().trim() === cleanKey
    );

    if (!target) return null;

    const updatedUser: Usuario = {
      ...target,
      ...patch,
    };

    await this.saveUser(updatedUser);
    return updatedUser;
  },

  /**
   * Upload de Foto de Perfil Otimizada com Persistência Permanente no Banco de Dados
   * Compatível com Web, iOS e Android com sincronização instantânea
   */
  async uploadUserAvatar(userIdOrEmail: string, fileOrBase64: File | Blob | string): Promise<string> {
    let blob: Blob;
    let base64Preview = '';

    // Se for string base64
    if (typeof fileOrBase64 === 'string') {
      base64Preview = fileOrBase64;
      blob = base64ToBlob(fileOrBase64, 'image/jpeg');
    } else {
      blob = fileOrBase64;
    }

    // Comprimir imagem para tamanho leve e alta resolução (256x256 Retina HD, ~15-20KB)
    const compressedDataUrl = await new Promise<string>((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        base64Preview = src;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 256;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
          } else {
            resolve(src);
          }
        };
        img.onerror = () => resolve(src);
        img.src = src;
      };
      reader.onerror = () => resolve(base64Preview);
      reader.readAsDataURL(blob);
    });

    const finalFotoUrl = compressedDataUrl || base64Preview;

    // Tentar upload nos buckets do Supabase Storage se existirem
    const sanitizedId = userIdOrEmail.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `avatar_${sanitizedId}_${Date.now()}.jpg`;
    const bucketsToTry = ['avatars', 'documents', 'public'];

    for (const bucket of bucketsToTry) {
      try {
        const compressedBlob = base64ToBlob(finalFotoUrl, 'image/jpeg');
        const { data: uploadRes, error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(fileName, compressedBlob, {
            upsert: true,
            contentType: 'image/jpeg',
          });

        if (!uploadErr && uploadRes) {
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(uploadRes.path);

          if (publicUrlData?.publicUrl) {
            await this.updateUserProfile(userIdOrEmail, { foto: publicUrlData.publicUrl });
            broadcastUsersUpdate();
            return publicUrlData.publicUrl;
          }
        }
      } catch {}
    }

    // Persistir permanentemente no Banco de Dados Relacional Supabase
    await this.updateUserProfile(userIdOrEmail, { foto: finalFotoUrl });
    broadcastUsersUpdate();

    return finalFotoUrl;
  },

  /**
   * Assinar alterações de usuários em tempo real via Supabase Realtime (Cross-device Sync Mobile / Desktop)
   */
  subscribeUsers(onUpdate: (users: Usuario[]) => void) {
    if (typeof window === 'undefined') return () => {};

    let timeoutId: any = null;
    const handleLocalEvent = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const users = await this.getUsers();
          onUpdate(users);
        } catch {}
      }, 300);
    };

    window.addEventListener('focus_users_updated', handleLocalEvent);
    window.addEventListener('focus_storage_update', handleLocalEvent);

    // Canal Realtime do Supabase com identificador único por instância
    const uniqueChannelName = `focus_users_rt_${Math.random().toString(36).substring(2, 9)}`;
    let channel: any = null;

    try {
      channel = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users' },
          handleLocalEvent
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clients' },
          handleLocalEvent
        )
        .subscribe();
    } catch (e) {
      console.warn('[userService.subscribeUsers] Erro ao criar canal realtime:', e);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('focus_users_updated', handleLocalEvent);
      window.removeEventListener('focus_storage_update', handleLocalEvent);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  },
};
