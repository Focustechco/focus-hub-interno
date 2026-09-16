const PROTECTED_DATABASE_KEYS = new Set([
  'focus_dms_documentos',
  'focus_app_focus_dms_documentos',
  'focus_dms_pastas',
  'focus_app_focus_dms_pastas',
  'focus_dms_lixeira',
  'focus_app_focus_dms_lixeira',
  'focus_dms_deleted_ids',
  'focus_app_focus_dms_deleted_ids',
  'focus_clientes',
  'focus_app_focus_clientes',
  'focus_fornecedores',
  'focus_app_focus_fornecedores',
  'focus_projetos',
  'focus_app_focus_projetos',
  'focus_contratos',
  'focus_app_focus_contratos',
  'focus_contas_pagar',
  'focus_app_focus_contas_pagar',
  'focus_contas_receber',
  'focus_app_focus_contas_receber',
  'focus_rh_colaboradores',
  'focus_app_focus_rh_colaboradores',
  'focus_produtos',
  'focus_app_focus_produtos',
  'focus_relatorios_history',
  'focus_app_focus_relatorios_history',
  'focus_relatorios_templates',
  'focus_app_focus_relatorios_templates',
  'focus_relatorios_schedules',
  'focus_app_focus_relatorios_schedules',
  'focus_fiscal_documentos',
  'focus_app_focus_fiscal_documentos',
  'focus_assinaturas_docs',
  'focus_app_focus_assinaturas_docs',
  'focus_marketing_campanhas',
  'focus_app_focus_marketing_campanhas',
  'focus_cobrancas',
  'focus_app_focus_cobrancas',
  'focus_auth_session_v2',
  'focus_auth_session',
  'focus_session',
  'focus_app_session',
  'focus_auth_user',
  'focus_usuarios',
  'focus_app_focus_usuarios',
  'focus_app_usuarios',
  'focus_app_deleted_users_state',
]);

/**
 * Safe LocalStorage Wrapper that guarantees zero-data-loss for database entities.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    if (
      e?.name === 'QuotaExceededError' ||
      e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e?.code === 22 ||
      e?.code === 1014 ||
      e?.number === -2147024882
    ) {
      try {
        // 1. Limpar apenas caches e logs temporários não-essenciais
        const ephemeralCacheKeys = [
          'focus_app_notificacoes',
          'focus_notificacoes',
          'focus_app_audit_logs',
          'focus_audit_logs',
          'focus_app_dms_cache',
          'focus_app_state_cache',
          'focus_temp_cache',
        ];
        ephemeralCacheKeys.forEach((k) => {
          try {
            window.localStorage.removeItem(k);
          } catch {}
        });

        // 2. Limpar apenas itens temporários não protegidos
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const k = window.localStorage.key(i);
          if (k && !PROTECTED_DATABASE_KEYS.has(k) && k !== key) {
            try {
              window.localStorage.removeItem(k);
            } catch {}
          }
        }

        window.localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

