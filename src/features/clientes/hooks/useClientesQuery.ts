import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clienteService } from '@/services/clienteService';
import { ClienteDTO } from '@/schemas/clienteSchema';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

/**
 * Hook customizado com React Query para consumo reativo e performático dos Clientes.
 * Sincronizado em tempo real entre Mobile (iOS/Android) e Desktop via Supabase Realtime.
 */
export function useClientesQuery() {
  const queryClient = useQueryClient();

  // Query para buscar lista de clientes com cache inteligente e sem loops
  const {
    data: clientes = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ClienteDTO[]>({
    queryKey: ['clientes'],
    queryFn: () => clienteService.getClientes(),
    staleTime: 1000 * 60 * 2, // 2 minutos de cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Inscrição Realtime no Supabase para sincronização instantânea Desktop <-> Mobile
  useEffect(() => {
    let timeoutId: any = null;
    const debouncedInvalidate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['clientes'] });
      }, 500);
    };

    const channelName = `rt_clientes_sync_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clientes' },
        debouncedInvalidate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        debouncedInvalidate
      )
      .subscribe();

    if (typeof window !== 'undefined') {
      window.addEventListener('focus_clients_updated', debouncedInvalidate);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      try {
        supabase.removeChannel(channel);
      } catch {}
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus_clients_updated', debouncedInvalidate);
      }
    };
  }, [queryClient]);

  // Mutação para salvar/atualizar cliente
  const saveMutation = useMutation({
    mutationFn: (cliente: ClienteDTO) => clienteService.saveCliente(cliente),
    onSuccess: (savedCliente) => {
      queryClient.setQueryData<ClienteDTO[]>(['clientes'], (old = []) => {
        const exists = old.some(c => c.id === savedCliente.id);
        if (exists) {
          return old.map(c => (c.id === savedCliente.id ? savedCliente : c));
        }
        return [savedCliente, ...old];
      });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['recorrencias'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Cliente salvo com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar cliente: ${err.message}`);
    },
  });

  // Mutação para excluir cliente
  const deleteMutation = useMutation({
    mutationFn: (id: string) => clienteService.deleteCliente(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<ClienteDTO[]>(['clientes'], (old = []) => {
        return old.filter(c => c.id !== deletedId);
      });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['recorrencias'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      toast.success('Cliente e seus registros vinculados foram removidos com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao remover cliente: ${err.message}`);
    },
  });

  return {
    clientes,
    isLoading,
    isError,
    error,
    refetch,
    saveCliente: saveMutation.mutateAsync,
    deleteCliente: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
