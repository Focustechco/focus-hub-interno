import { useState, useEffect, useCallback } from 'react';
import { empresaService, EmpresaConfig, DEFAULT_EMPRESA_CONFIG } from '@/services/empresaService';
import { realtimeManager } from '@/lib/realtimeManager';
import { toast } from 'sonner';

export function useEmpresaConfig() {
  const [empresa, setEmpresa] = useState<EmpresaConfig>(() => empresaService.getEmpresaConfigSync());
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Carregar dados frescos do Supabase ao montar
  useEffect(() => {
    let isMounted = true;
    empresaService.getEmpresaConfig().then((data) => {
      if (isMounted && data) {
        setEmpresa(data);
        setLoading(false);
      }
    });

    // Escutar eventos de sincronização em tempo real (Navbar, abas, etc.)
    const handleEmpresaUpdated = (e: any) => {
      if (e?.detail) {
        setEmpresa(e.detail);
      } else {
        setEmpresa(empresaService.getEmpresaConfigSync());
      }
    };

    window.addEventListener('focus_empresa_updated', handleEmpresaUpdated);
    window.addEventListener('storage', handleEmpresaUpdated);

    // Escutar mudanças em tempo real multiplexadas do Supabase
    const unsubRealtime = realtimeManager.subscribe('empresa_config', () => {
      empresaService.getEmpresaConfig().then((fresh) => {
        if (isMounted && fresh) setEmpresa(fresh);
      });
    });

    return () => {
      isMounted = false;
      window.removeEventListener('focus_empresa_updated', handleEmpresaUpdated);
      window.removeEventListener('storage', handleEmpresaUpdated);
      unsubRealtime();
    };
  }, []);

  const updateEmpresa = useCallback(async (dados: Partial<EmpresaConfig>) => {
    setIsSaving(true);
    try {
      const updated = await empresaService.saveEmpresaConfig(dados);
      setEmpresa(updated);
      toast.success('Dados institucionais da empresa salvos com sucesso!');
      return updated;
    } catch (err) {
      console.error('[useEmpresaConfig] Erro ao salvar:', err);
      toast.error('Erro ao salvar dados da empresa.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const uploadLogo = useCallback(async (tipo: 'principal' | 'branca' | 'marca_dagua', fileOrBase64: File | string) => {
    try {
      const url = await empresaService.uploadLogo(tipo, fileOrBase64);
      if (tipo === 'principal') {
        await updateEmpresa({ logoUrl: url });
      } else if (tipo === 'branca') {
        await updateEmpresa({ logoBrancaUrl: url });
      } else if (tipo === 'marca_dagua') {
        await updateEmpresa({ marcaDaguaUrl: url });
      }
      return url;
    } catch (err) {
      console.error('[useEmpresaConfig] Erro no upload de logo:', err);
      toast.error('Erro ao enviar logotipo.');
      throw err;
    }
  }, [updateEmpresa]);

  return {
    empresa,
    setEmpresa,
    updateEmpresa,
    uploadLogo,
    loading,
    isSaving,
  };
}
