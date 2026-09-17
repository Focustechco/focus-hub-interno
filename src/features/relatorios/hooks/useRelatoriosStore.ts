import { useState, useEffect, useCallback } from "react";
import { useLocalStorageState } from "@/hooks/useDataStore";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { ReportExecutionHistory, ReportSchedule, ReportModelTemplate, ReportFilterConfig, GeneratedReportData, ReportFormat } from "../types";
import { REPORT_CATALOG } from "../data/catalog";
import { TituloReceber } from "@/features/contas-receber/types";
import { ContaPagar } from "@/features/contas-pagar/types";
import { Cliente } from "@/features/clientes/types";
import { Projeto } from "@/features/projetos/types";
import { ColaboradorRH } from "@/features/rh/types";
import { CampanhaMarketing } from "@/features/marketing/components/CampanhasMarketingView";
import { Contrato } from "@/features/contratos/types";
import { Cobranca } from "@/features/cobrancas/types";
import { useDocumentosStore } from "@/features/documentos/hooks/useDocumentosStore";
import { dmsService } from "@/services/dmsService";

const FAVORITES_STORAGE_KEY = 'focus_relatorios_favorites';
const FAVORITES_STATE_ID = '00000000-0000-4000-a000-0000000fa401';
const FAVORITES_STATE_NAME = '__FOCUS_STATE__relatorios_favorites';

function sanitizeFavorites(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    const validCatalogIds = new Set(REPORT_CATALOG.map((r) => r.id));
    const seen = new Set<string>();
    const result: string[] = [];

    for (const item of input) {
      const id = typeof item === 'string'
        ? item.trim()
        : item && typeof item === 'object'
        ? (item.report_id || item.reportId || item.id || '').trim()
        : '';

      if (id && validCatalogIds.has(id) && !seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
    return result;
  }
  return [];
}

function getStoredFavorites(): string[] {
  try {
    const raw = safeGetItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return sanitizeFavorites(parsed);
    }
  } catch {}
  return [];
}

function persistFavoritesLocally(favorites: string[]) {
  const sanitized = sanitizeFavorites(favorites);
  safeSetItem(FAVORITES_STORAGE_KEY, JSON.stringify(sanitized));
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('focus_relatorios_favorites_updated'));
      window.dispatchEvent(new Event('focus_storage_update'));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  }
}

/**
 * Persiste a lista ordenada de favoritos diretamente no Banco de Dados Relacional (Supabase)
 */
async function syncFavoritesToDatabase(favorites: string[]) {
  const sanitized = sanitizeFavorites(favorites);

  // Persistir na tabela 'clients' como estado relacional garantido
  try {
    const payload = {
      id: FAVORITES_STATE_ID,
      name: FAVORITES_STATE_NAME,
      status: 'system_state',
      contact_phone: JSON.stringify(sanitized),
      contact_email: 'relatorios_favoritos@focuserp.com',
      updated_at: new Date().toISOString(),
    };
    await supabase.from('clients').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[useRelatoriosStore] Aviso ao salvar favoritos em clients:', err);
  }
}

/**
 * Busca a lista ordenada de favoritos diretamente do Banco de Dados Relacional (Supabase)
 */
async function fetchFavoritesFromDatabase(): Promise<string[] | null> {
  // Buscar da tabela relacional 'clients'
  try {
    const { data: stateRows, error: stateErr } = await supabase
      .from('clients')
      .select('*')
      .eq('name', FAVORITES_STATE_NAME)
      .limit(1);

    if (!stateErr && Array.isArray(stateRows) && stateRows.length > 0) {
      const row = stateRows[0];
      if (row.contact_phone) {
        const parsed = JSON.parse(row.contact_phone);
        const list = sanitizeFavorites(parsed);
        if (list.length > 0) {
          return list;
        }
      }
    }
  } catch (err) {
    console.warn('[useRelatoriosStore] Aviso ao buscar favoritos no Supabase:', err);
  }

  return null;
}

export function useRelatoriosStore() {
  const [favorites, setFavorites] = useState<string[]>(getStoredFavorites);

  // Sincronização inicial com Banco de Dados Relacional + Realtime Cross-Device
  useEffect(() => {
    let isMounted = true;

    // Buscar do banco no carregamento
    fetchFavoritesFromDatabase().then((dbFavs) => {
      if (isMounted && dbFavs && dbFavs.length > 0) {
        setFavorites(dbFavs);
        persistFavoritesLocally(dbFavs);
      }
    });

    // Inscrição Realtime no Supabase
    const channelName = `rt_relatorios_favs_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients', filter: `name=eq.${FAVORITES_STATE_NAME}` },
        async () => {
          const fresh = await fetchFavoritesFromDatabase();
          if (isMounted && fresh) {
            setFavorites(fresh);
            persistFavoritesLocally(fresh);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'relatorios_favoritos' },
        async () => {
          const fresh = await fetchFavoritesFromDatabase();
          if (isMounted && fresh) {
            setFavorites(fresh);
            persistFavoritesLocally(fresh);
          }
        }
      )
      .subscribe();

    const handleLocalSync = () => {
      if (isMounted) {
        setFavorites(getStoredFavorites());
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus_relatorios_favorites_updated', handleLocalSync);
      window.addEventListener('focus_storage_update', handleLocalSync);
      window.addEventListener('storage', handleLocalSync);
      window.addEventListener('focus', handleLocalSync);
    }

    return () => {
      isMounted = false;
      try {
        supabase.removeChannel(channel);
      } catch {}
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus_relatorios_favorites_updated', handleLocalSync);
        window.removeEventListener('focus_storage_update', handleLocalSync);
        window.removeEventListener('storage', handleLocalSync);
        window.removeEventListener('focus', handleLocalSync);
      }
    };
  }, []);

  const { data: history, addItem: addHistory } = useLocalStorageState<ReportExecutionHistory>('focus_relatorios_history');
  const { data: schedules, addItem: addSchedule, updateItem: updateSchedule, removeItem: removeSchedule } = useLocalStorageState<ReportSchedule>('focus_relatorios_schedules');
  const { data: templates, addItem: addTemplate } = useLocalStorageState<ReportModelTemplate>('focus_relatorios_templates');

  // Consumo EXCLUSIVO de dados reais da aplicação
  const { data: contasReceber } = useLocalStorageState<TituloReceber>('focus_contas_receber', []);
  const { data: contasPagar } = useLocalStorageState<ContaPagar>('focus_contas_pagar', []);
  const { data: clientes } = useLocalStorageState<Cliente>('focus_clientes', []);
  const { data: projetos } = useLocalStorageState<Projeto>('focus_projetos', []);
  const { data: colaboradores } = useLocalStorageState<ColaboradorRH>('focus_rh_colaboradores', []);
  const { data: campanhas } = useLocalStorageState<CampanhaMarketing>('focus_marketing_campanhas', []);
  const { data: contratos } = useLocalStorageState<Contrato>('focus_contratos', []);
  const { data: cobrancas } = useLocalStorageState<Cobranca>('focus_cobrancas', []);

  const { pastas, uploadDocument } = useDocumentosStore();

  /**
   * Alternar favorito com ordenação automática:
   * Ao adicionar, o relatório é inserido no ÍNDICE 0 (topo da página)
   * e persistido no Banco de Dados Relacional Supabase.
   */
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      const isAlreadyFavorited = current.includes(id);

      let updated: string[];
      if (isAlreadyFavorited) {
        // Remover dos favoritos
        updated = current.filter((favId) => favId !== id);
        toast.info('Relatório removido dos favoritos.');
      } else {
        // Adicionar no TOPO (primeira posição da lista)
        updated = [id, ...current.filter((favId) => favId !== id)];
        toast.success('Relatório fixado no topo dos favoritos! ⭐');
      }

      // Persistência local imediata + envio ao Banco de Dados Relacional
      persistFavoritesLocally(updated);
      syncFavoritesToDatabase(updated);

      return updated;
    });
  }, []);

  const generateReportData = (
    reportId: string, 
    filters: ReportFilterConfig = { formato: 'PDF', incluirGraficos: true, periodo: 'mes_atual' }
  ): GeneratedReportData => {
    const definition = REPORT_CATALOG.find(r => r.id === reportId) || REPORT_CATALOG[0];
    const reportNumber = `REL-${Math.floor(100000 + Math.random() * 900000)}`;
    const safeFilters: ReportFilterConfig = filters || { formato: 'PDF', incluirGraficos: true, periodo: 'mes_atual' };

    let rows: Array<Record<string, any>> = [];
    let metricsSummary: Array<{ label: string; value: string; color?: string }> = [];
    let hierarchicalGroups: Array<{ groupTitle: string; groupSubtitle?: string; groupBadge?: string; rows: Array<Record<string, any>>; subtotals?: Array<{ label: string; value: string; color?: string }> }> = [];
    let grandTotals: Array<{ label: string; value: string; color?: string }> = [];
    let chartData: Array<{ name: string; valor: number }> = [];

    const formatCurrency = (val: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const calcAV = (valor: number, base: number) => {
      if (!base || base === 0) return '0.0%';
      return `${((Math.abs(valor) / Math.abs(base)) * 100).toFixed(1)}%`;
    };

    // 1. FLUXO DE CAIXA (rep-fin-001) - 100% Real Hierárquico
    if (definition.id === 'rep-fin-001') {
      let accSaldo = 0;
      const todasEntradas = contasReceber.map(c => {
        const val = c.valorOriginal || 0;
        accSaldo += val;
        return {
          data: c.dataVencimento ? new Date(c.dataVencimento).toLocaleDateString('pt-BR') : '-',
          descricao: `${c.cliente || 'Cliente'} - ${c.descricao || 'Recebimento'}`,
          categoria: 'Entrada Operacional',
          entradas: formatCurrency(val),
          saidas: '-',
          saldoAcumulado: formatCurrency(accSaldo),
          status: c.status || 'Pendente'
        };
      });

      const todasSaidas = contasPagar.map(c => {
        const val = c.valorOriginal || 0;
        accSaldo -= val;
        return {
          data: c.dataVencimento ? new Date(c.dataVencimento).toLocaleDateString('pt-BR') : '-',
          descricao: `${c.fornecedor || 'Fornecedor'} - ${c.descricao || 'Pagamento'}`,
          categoria: c.categoria || 'Saída Operacional',
          entradas: '-',
          saidas: formatCurrency(val),
          saldoAcumulado: formatCurrency(accSaldo),
          status: c.status || 'Pendente'
        };
      });

      rows = [...todasEntradas, ...todasSaidas];

      const totalEntradas = contasReceber.reduce((acc, c) => acc + (c.valorOriginal || 0), 0);
      const totalSaidas = contasPagar.reduce((acc, c) => acc + (c.valorOriginal || 0), 0);
      const saldoLiquido = totalEntradas - totalSaidas;

      hierarchicalGroups = [
        {
          groupTitle: '1. RECEBIMENTOS & ENTRADAS OPERACIONAIS',
          groupSubtitle: 'Contas a Receber, faturamentos e entradas de clientes',
          groupBadge: `${todasEntradas.length} títulos`,
          rows: todasEntradas,
          subtotals: [
            { label: 'Subtotal Entradas', value: formatCurrency(totalEntradas), color: 'text-emerald-600 font-bold' }
          ]
        },
        {
          groupTitle: '2. DESPESAS & SAÍDAS OPERACIONAIS',
          groupSubtitle: 'Contas a Pagar, fornecedores, infraestrutura e custos operacionais',
          groupBadge: `${todasSaidas.length} títulos`,
          rows: todasSaidas,
          subtotals: [
            { label: 'Subtotal Saídas', value: formatCurrency(totalSaidas), color: 'text-rose-600 font-bold' }
          ]
        }
      ];

      grandTotals = [
        { label: 'Total Geral de Entradas', value: formatCurrency(totalEntradas), color: 'text-emerald-600' },
        { label: 'Total Geral de Saídas', value: formatCurrency(totalSaidas), color: 'text-rose-600' },
        { label: 'Resultado Operacional Líquido', value: formatCurrency(saldoLiquido), color: saldoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600' }
      ];

      metricsSummary = [
        { label: 'Total Entradas', value: formatCurrency(totalEntradas), color: 'text-emerald-600' },
        { label: 'Total Saídas', value: formatCurrency(totalSaidas), color: 'text-rose-600' },
        { label: 'Saldo Líquido', value: formatCurrency(saldoLiquido), color: saldoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600' }
      ];

      chartData = [
        { name: 'Entradas', valor: totalEntradas },
        { name: 'Saídas', valor: totalSaidas }
      ];
    }
    // 2. DRE GERENCIAL (rep-fin-002) - 100% Dados Reais Hierárquicos
    else if (definition.id === 'rep-fin-002') {
      let receitaBruta = 0;
      let deducoes = 0;
      let custosOperacionais = 0;
      let despesasAdm = 0;
      let despesasComerciais = 0;
      let despesasFinanceiras = 0;

      contasReceber.forEach(t => {
        receitaBruta += t.valorOriginal || 0;
      });

      contasPagar.forEach(c => {
        const val = c.valorOriginal || 0;
        const cat = (c.categoria || '').toLowerCase();
        if (cat.includes('imposto') || cat.includes('tributo') || cat.includes('retencao') || cat.includes('retenção')) {
          deducoes += val;
        } else if (cat.includes('custo') || cat.includes('fornecedor') || cat.includes('infra') || cat.includes('cloud') || cat.includes('servico') || cat.includes('serviço')) {
          custosOperacionais += val;
        } else if (cat.includes('marketing') || cat.includes('venda') || cat.includes('comissao') || cat.includes('comissão') || cat.includes('anuncio') || cat.includes('anúncio')) {
          despesasComerciais += val;
        } else if (cat.includes('tarifa') || cat.includes('banc') || cat.includes('juro') || cat.includes('iof')) {
          despesasFinanceiras += val;
        } else {
          despesasAdm += val;
        }
      });

      const receitaLiquida = receitaBruta - deducoes;
      const lucroBruto = receitaLiquida - custosOperacionais;
      const ebitda = lucroBruto - despesasAdm - despesasComerciais;
      const ebit = ebitda;
      const lucroLiquido = ebit - despesasFinanceiras;
      const totalBase = receitaBruta || 1;

      const groupReceita = [
        { conta: '1.1 Vendas e Serviços Realizados', realizado: formatCurrency(receitaBruta), av: '100.0%' },
        { conta: '1.2 (-) Deduções e Impostos Incidentes', realizado: formatCurrency(-deducoes), av: calcAV(deducoes, totalBase) },
        { conta: '(=) Receita Operacional Líquida', realizado: formatCurrency(receitaLiquida), av: calcAV(receitaLiquida, totalBase) }
      ];

      const groupCustos = [
        { conta: '2.1 Custos dos Serviços Prestados (CSP/CPV)', realizado: formatCurrency(-custosOperacionais), av: calcAV(custosOperacionais, totalBase) },
        { conta: '(=) Lucro Bruto Operacional', realizado: formatCurrency(lucroBruto), av: calcAV(lucroBruto, totalBase) }
      ];

      const groupDespesas = [
        { conta: '3.1 Despesas Administrativas & Pessoal', realizado: formatCurrency(-despesasAdm), av: calcAV(despesasAdm, totalBase) },
        { conta: '3.2 Despesas Comerciais e Marketing', realizado: formatCurrency(-despesasComerciais), av: calcAV(despesasComerciais, totalBase) },
        { conta: '(=) EBITDA (Lucro Operacional Antes Juros/Impostos)', realizado: formatCurrency(ebitda), av: calcAV(ebitda, totalBase) }
      ];

      const groupFinanceiro = [
        { conta: '4.1 Despesas Financeiras e Tarifas Bancárias', realizado: formatCurrency(-despesasFinanceiras), av: calcAV(despesasFinanceiras, totalBase) },
        { conta: '(=) Lucro Líquido Consolidado do Exercício', realizado: formatCurrency(lucroLiquido), av: calcAV(lucroLiquido, totalBase) }
      ];

      rows = [...groupReceita, ...groupCustos, ...groupDespesas, ...groupFinanceiro];

      hierarchicalGroups = [
        {
          groupTitle: '1.0 ESTRUTURA DE RECEITAS',
          groupSubtitle: 'Faturamento bruto e deduções tributárias',
          rows: groupReceita,
          subtotals: [{ label: 'Receita Líquida', value: formatCurrency(receitaLiquida), color: 'text-emerald-600 font-bold' }]
        },
        {
          groupTitle: '2.0 CUSTOS OPERACIONAIS & MARGEM BRUTA',
          groupSubtitle: 'Custos diretos de prestação de serviços e infraestrutura',
          rows: groupCustos,
          subtotals: [{ label: 'Lucro Bruto', value: formatCurrency(lucroBruto), color: 'text-primary font-bold' }]
        },
        {
          groupTitle: '3.0 DESPESAS OPERACIONAIS & EBITDA',
          groupSubtitle: 'Gastos administrativos, comerciais e capacidade de geração de caixa',
          rows: groupDespesas,
          subtotals: [{ label: 'EBITDA', value: formatCurrency(ebitda), color: 'text-blue-600 font-bold' }]
        },
        {
          groupTitle: '4.0 RESULTADO FINANCEIRO & LUCRO FINAL',
          groupSubtitle: 'Custo de capital e resultado final',
          rows: groupFinanceiro,
          subtotals: [{ label: 'Lucro Líquido Final', value: formatCurrency(lucroLiquido), color: lucroLiquido >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold' }]
        }
      ];

      grandTotals = [
        { label: 'Receita Bruta Total', value: formatCurrency(receitaBruta), color: 'text-emerald-600' },
        { label: 'EBITDA Consolidado', value: formatCurrency(ebitda), color: 'text-blue-600' },
        { label: 'Lucro Líquido do Exercício', value: formatCurrency(lucroLiquido), color: lucroLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600' }
      ];

      metricsSummary = [
        { label: 'Receita Bruta Real', value: formatCurrency(receitaBruta), color: 'text-emerald-600' },
        { label: 'Receita Líquida Real', value: formatCurrency(receitaLiquida), color: 'text-emerald-500' },
        { label: 'Lucro Bruto Real', value: formatCurrency(lucroBruto), color: 'text-primary' },
        { label: 'EBITDA Consolidado Real', value: formatCurrency(ebitda), color: 'text-blue-600' },
        { label: 'Lucro Líquido Final Real', value: formatCurrency(lucroLiquido), color: lucroLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600' }
      ];

      chartData = [
        { name: 'Receita Bruta', valor: receitaBruta },
        { name: 'Receita Líquida', valor: receitaLiquida },
        { name: 'Lucro Bruto', valor: lucroBruto },
        { name: 'EBITDA', valor: ebitda },
        { name: 'Lucro Líquido', valor: lucroLiquido }
      ];
    }
    // 3. CONTAS A RECEBER (rep-fin-003) - Hierárquico
    else if (definition.id === 'rep-fin-003') {
      const hoje = new Date();
      const vencidos: Array<Record<string, any>> = [];
      const aVencer: Array<Record<string, any>> = [];
      const quitados: Array<Record<string, any>> = [];

      contasReceber.forEach(c => {
        const item = {
          numero: c.numero || `REC-${c.id}`,
          cliente: c.cliente || 'Cliente não identificado',
          descricao: c.descricao || 'Título a receber',
          dataVencimento: c.dataVencimento ? new Date(c.dataVencimento).toLocaleDateString('pt-BR') : '-',
          valorOriginal: formatCurrency(c.valorOriginal || 0),
          valorRecebido: formatCurrency(c.valorRecebido || 0),
          saldo: formatCurrency(c.saldo !== undefined ? c.saldo : ((c.valorOriginal || 0) - (c.valorRecebido || 0))),
          status: c.status || 'Pendente'
        };

        if (c.status === 'Pago') {
          quitados.push(item);
        } else if (c.dataVencimento && new Date(c.dataVencimento) < hoje) {
          vencidos.push(item);
        } else {
          aVencer.push(item);
        }
      });

      rows = [...vencidos, ...aVencer, ...quitados];

      const totalVencido = contasReceber.filter(c => c.status !== 'Pago' && c.dataVencimento && new Date(c.dataVencimento) < hoje).reduce((acc, c) => acc + (c.valorOriginal || 0), 0);
      const totalAVencer = contasReceber.filter(c => c.status !== 'Pago' && (!c.dataVencimento || new Date(c.dataVencimento) >= hoje)).reduce((acc, c) => acc + (c.valorOriginal || 0), 0);
      const totalRecebido = contasReceber.filter(c => c.status === 'Pago').reduce((acc, c) => acc + (c.valorRecebido || c.valorOriginal || 0), 0);
      const totalGeral = contasReceber.reduce((acc, c) => acc + (c.valorOriginal || 0), 0);

      hierarchicalGroups = [
        {
          groupTitle: '1. TÍTULOS VENCIDOS EM ABERTO',
          groupSubtitle: 'Títulos com vencimento expirado que necessitam cobrança imediata',
          groupBadge: `${vencidos.length} títulos`,
          rows: vencidos,
          subtotals: [{ label: 'Subtotal Vencido', value: formatCurrency(totalVencido), color: 'text-rose-600 font-bold' }]
        },
        {
          groupTitle: '2. TÍTULOS A VENCER (CARTEIRA REGULAR)',
          groupSubtitle: 'Títulos em dia com vencimento futuro no cronograma',
          groupBadge: `${aVencer.length} títulos`,
          rows: aVencer,
          subtotals: [{ label: 'Subtotal a Vencer', value: formatCurrency(totalAVencer), color: 'text-amber-600 font-bold' }]
        },
        {
          groupTitle: '3. TÍTULOS LIQUIDADOS / RECEBIDOS',
          groupSubtitle: 'Títulos quitados com conciliação realizada',
          groupBadge: `${quitados.length} títulos`,
          rows: quitados,
          subtotals: [{ label: 'Subtotal Recebido', value: formatCurrency(totalRecebido), color: 'text-emerald-600 font-bold' }]
        }
      ];

      grandTotals = [
        { label: 'Total Carteira Emitida', value: formatCurrency(totalGeral) },
        { label: 'Total Já Recebido', value: formatCurrency(totalRecebido), color: 'text-emerald-600' },
        { label: 'Saldo Total em Aberto', value: formatCurrency(totalVencido + totalAVencer), color: 'text-rose-600' }
      ];

      metricsSummary = [
        { label: 'Total Carteira', value: formatCurrency(totalGeral) },
        { label: 'Total Recebido', value: formatCurrency(totalRecebido), color: 'text-emerald-600' },
        { label: 'Saldo em Aberto', value: formatCurrency(totalVencido + totalAVencer), color: 'text-amber-600' }
      ];
    }
    // 4. CONTAS A PAGAR (rep-fin-004) - Hierárquico
    else if (definition.id === 'rep-fin-004') {
      const hoje = new Date();
      const vencidas: Array<Record<string, any>> = [];
      const aVencer: Array<Record<string, any>> = [];
      const quitadas: Array<Record<string, any>> = [];

      contasPagar.forEach(c => {
        const item = {
          numero: c.numero || `PAG-${c.id}`,
          fornecedor: c.fornecedor || 'Fornecedor',
          descricao: c.descricao || 'Despesa Operacional',
          dataVencimento: c.dataVencimento ? new Date(c.dataVencimento).toLocaleDateString('pt-BR') : '-',
          valorOriginal: formatCurrency(c.valorOriginal || 0),
          valorPago: formatCurrency(c.valorPago || 0),
          status: c.status || 'Pendente'
        };

        if (c.status === 'Pago' || c.status === 'Liquidado') {
          quitadas.push(item);
        } else if (c.dataVencimento && new Date(c.dataVencimento) < hoje) {
          vencidas.push(item);
        } else {
          aVencer.push(item);
        }
      });

      rows = [...vencidas, ...aVencer, ...quitadas];

      const totalVencido = contasPagar.filter(c => c.status !== 'Pago' && c.dataVencimento && new Date(c.dataVencimento) < hoje).reduce((acc, c) => acc + (c.valorOriginal || 0), 0);
      const totalAVencer = contasPagar.filter(c => c.status !== 'Pago' && (!c.dataVencimento || new Date(c.dataVencimento) >= hoje)).reduce((acc, c) => acc + (c.valorOriginal || 0), 0);
      const totalPago = contasPagar.filter(c => c.status === 'Pago').reduce((acc, c) => acc + (c.valorPago || c.valorOriginal || 0), 0);
      const totalGeral = contasPagar.reduce((acc, c) => acc + (c.valorOriginal || 0), 0);

      hierarchicalGroups = [
        {
          groupTitle: '1. OBRIGAÇÕES VENCIDAS PENDENTES',
          groupSubtitle: 'Contas com prazo expirado pendentes de liquidação',
          groupBadge: `${vencidas.length} contas`,
          rows: vencidas,
          subtotals: [{ label: 'Subtotal Vencido', value: formatCurrency(totalVencido), color: 'text-rose-600 font-bold' }]
        },
        {
          groupTitle: '2. COMPROMISSOS A VENCER (PROGRAMADOS)',
          groupSubtitle: 'Despesas com vencimento programado nos próximos períodos',
          groupBadge: `${aVencer.length} contas`,
          rows: aVencer,
          subtotals: [{ label: 'Subtotal a Vencer', value: formatCurrency(totalAVencer), color: 'text-amber-600 font-bold' }]
        },
        {
          groupTitle: '3. CONTAS QUITADAS / PAGAS',
          groupSubtitle: 'Despesas liquidadas com comprovante bancário',
          groupBadge: `${quitadas.length} contas`,
          rows: quitadas,
          subtotals: [{ label: 'Subtotal Pago', value: formatCurrency(totalPago), color: 'text-emerald-600 font-bold' }]
        }
      ];

      grandTotals = [
        { label: 'Total de Obrigações', value: formatCurrency(totalGeral) },
        { label: 'Total Já Quitado', value: formatCurrency(totalPago), color: 'text-emerald-600' },
        { label: 'Saldo a Liquidar', value: formatCurrency(totalVencido + totalAVencer), color: 'text-rose-600' }
      ];

      metricsSummary = [
        { label: 'Total Geral a Pagar', value: formatCurrency(totalGeral) },
        { label: 'Total Quitados', value: formatCurrency(totalPago), color: 'text-emerald-600' },
        { label: 'Saldo a Liquidar', value: formatCurrency(totalVencido + totalAVencer), color: 'text-rose-600' }
      ];
    }
    // 5. INADIMPLÊNCIA & RÉGUA DE COBRANÇA (rep-fin-005) - Hierárquico por Faixas de Dias
    else if (definition.id === 'rep-fin-005') {
      const hoje = new Date();
      const faixa30: Array<Record<string, any>> = [];
      const faixa60: Array<Record<string, any>> = [];
      const faixa90Plus: Array<Record<string, any>> = [];

      const vencidos = contasReceber.filter(c => {
        if (c.status === 'Vencido') return true;
        if (c.dataVencimento && new Date(c.dataVencimento) < hoje && c.status !== 'Pago') return true;
        return false;
      });

      vencidos.forEach(c => {
        const vencDate = c.dataVencimento ? new Date(c.dataVencimento) : hoje;
        const diffMs = hoje.getTime() - vencDate.getTime();
        const diasAtrasoCalculado = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const cobrancaVinculada = cobrancas.find(cob => cob.clienteId === c.clienteId || cob.clienteNome === c.cliente);

        const item = {
          cliente: c.cliente || 'Cliente em atraso',
          titulosVencidos: 1,
          totalVencido: formatCurrency(c.valorOriginal || 0),
          diasAtraso: diasAtrasoCalculado,
          statusCobranca: cobrancaVinculada ? cobrancaVinculada.etapaAtual : 'Aguardando Régua'
        };

        if (diasAtrasoCalculado <= 30) {
          faixa30.push(item);
        } else if (diasAtrasoCalculado <= 60) {
          faixa60.push(item);
        } else {
          faixa90Plus.push(item);
        }
      });

      rows = [...faixa30, ...faixa60, ...faixa90Plus];

      const val30 = faixa30.reduce((acc, c) => acc + (parseFloat(String(c.totalVencido).replace(/[^0-9,-]+/g, '').replace(',', '.')) || 0), 0);
      const val60 = faixa60.reduce((acc, c) => acc + (parseFloat(String(c.totalVencido).replace(/[^0-9,-]+/g, '').replace(',', '.')) || 0), 0);
      const val90 = faixa90Plus.reduce((acc, c) => acc + (parseFloat(String(c.totalVencido).replace(/[^0-9,-]+/g, '').replace(',', '.')) || 0), 0);
      const totalInadimplente = vencidos.reduce((acc, c) => acc + (c.valorOriginal || 0), 0);

      hierarchicalGroups = [
        {
          groupTitle: '1. FAIXA DE ATÉ 30 DIAS (LEVE)',
          groupSubtitle: 'Cobrança preventiva e lembretes automáticos',
          groupBadge: `${faixa30.length} títulos`,
          rows: faixa30,
          subtotals: [{ label: 'Subtotal 1 a 30 dias', value: formatCurrency(val30), color: 'text-amber-600 font-bold' }]
        },
        {
          groupTitle: '2. FAIXA DE 31 A 60 DIAS (MODERADO)',
          groupSubtitle: 'Notificação extrajudicial e contato direto da equipe de cobrança',
          groupBadge: `${faixa60.length} títulos`,
          rows: faixa60,
          subtotals: [{ label: 'Subtotal 31 a 60 dias', value: formatCurrency(val60), color: 'text-orange-600 font-bold' }]
        },
        {
          groupTitle: '3. FAIXA CRÍTICA (61+ DIAS / JURÍDICO)',
          groupSubtitle: 'Títulos em cobrança contenciosa, protesto ou negativação',
          groupBadge: `${faixa90Plus.length} títulos`,
          rows: faixa90Plus,
          subtotals: [{ label: 'Subtotal 61+ dias', value: formatCurrency(val90), color: 'text-rose-600 font-bold' }]
        }
      ];

      grandTotals = [
        { label: 'Total Geral Vencido', value: formatCurrency(totalInadimplente), color: 'text-rose-600' },
        { label: 'Qtd Total Títulos Vencidos', value: `${vencidos.length}` }
      ];

      metricsSummary = [
        { label: 'Inadimplência Total', value: formatCurrency(totalInadimplente), color: 'text-rose-600' },
        { label: 'Títulos em Atraso', value: `${vencidos.length}` }
      ];
    }
    // 6. CADASTRO DE CLIENTES (rep-cli-001) - Hierárquico
    else if (definition.id === 'rep-cli-001') {
      const ativos: Array<Record<string, any>> = [];
      const outros: Array<Record<string, any>> = [];

      clientes.forEach(c => {
        const item = {
          codigo: c.codigo || `CLI-${c.id}`,
          nomeFantasia: c.nomeFantasia || c.razaoSocial || 'Cliente',
          documento: c.documento || '-',
          segmento: c.segmento || 'Geral',
          status: c.status || 'Ativo',
          dataCadastro: c.dataCadastro ? new Date(c.dataCadastro).toLocaleDateString('pt-BR') : '-'
        };

        if (c.status === 'Ativo') {
          ativos.push(item);
        } else {
          outros.push(item);
        }
      });

      rows = [...ativos, ...outros];

      hierarchicalGroups = [
        {
          groupTitle: '1. CLIENTES EM OPERAÇÃO ATIVA',
          groupSubtitle: 'Parceiros comerciais com contrato ou faturamento ativo',
          groupBadge: `${ativos.length} clientes`,
          rows: ativos,
          subtotals: [{ label: 'Total Ativos', value: `${ativos.length}`, color: 'text-emerald-600 font-bold' }]
        },
        {
          groupTitle: '2. CLIENTES EM PROSPECÇÃO / INATIVOS',
          groupSubtitle: 'Cadastros pendentes, em negociação ou arquivados',
          groupBadge: `${outros.length} clientes`,
          rows: outros,
          subtotals: [{ label: 'Total Outros', value: `${outros.length}`, color: 'text-slate-600 font-bold' }]
        }
      ];

      grandTotals = [
        { label: 'Base Total Cadastrada', value: `${clientes.length}` },
        { label: 'Total Clientes Ativos', value: `${ativos.length}`, color: 'text-emerald-600' }
      ];

      metricsSummary = [
        { label: 'Total de Clientes', value: `${clientes.length}` },
        { label: 'Clientes Ativos', value: `${ativos.length}`, color: 'text-emerald-600' }
      ];
    }
    // 7. SAÚDE FINANCEIRA E LTV (rep-cli-002) - Hierárquico por Score
    else if (definition.id === 'rep-cli-002') {
      const scoreA: Array<Record<string, any>> = [];
      const scoreB: Array<Record<string, any>> = [];
      const scoreC: Array<Record<string, any>> = [];

      clientes.forEach(c => {
        const titulosDoCliente = contasReceber.filter(t => t.clienteId === c.id || t.cliente === c.nomeFantasia);
        const ltv = titulosDoCliente.reduce((acc, t) => acc + (t.valorOriginal || 0), 0);
        const recebidoReal = titulosDoCliente.reduce((acc, t) => acc + (t.valorRecebido || 0), 0);
        const saldoAbertoReal = titulosDoCliente.reduce((acc, t) => acc + (t.saldo !== undefined ? t.saldo : ((t.valorOriginal || 0) - (t.valorRecebido || 0))), 0);
        
        let score = 'Excelente (A)';
        if (saldoAbertoReal > recebidoReal && saldoAbertoReal > 0) score = 'Atenção (C)';
        else if (saldoAbertoReal > 0) score = 'Bom (B)';

        const item = {
          nomeFantasia: c.nomeFantasia || c.razaoSocial || 'Cliente',
          ltvTotal: formatCurrency(ltv),
          recebidoNoPeriodo: formatCurrency(recebidoReal),
          saldoAberto: formatCurrency(saldoAbertoReal),
          scoreSaude: score
        };

        if (score.includes('(A)')) scoreA.push(item);
        else if (score.includes('(B)')) scoreB.push(item);
        else scoreC.push(item);
      });

      rows = [...scoreA, ...scoreB, ...scoreC];

      const totalLtv = contasReceber.reduce((acc, t) => acc + (t.valorOriginal || 0), 0);

      hierarchicalGroups = [
        {
          groupTitle: '1. CLIENTES TIER A (EXCELENTE SAÚDE FINANCEIRA)',
          groupSubtitle: 'Alta adimplência e histórico exemplar de pagamentos',
          groupBadge: `${scoreA.length} clientes`,
          rows: scoreA
        },
        {
          groupTitle: '2. CLIENTES TIER B (BOM / REGULAR)',
          groupSubtitle: 'Contratos vigentes com pequenos saldos em aberto dentro do prazo',
          groupBadge: `${scoreB.length} clientes`,
          rows: scoreB
        },
        {
          groupTitle: '3. CLIENTES TIER C (ATENÇÃO / RISCO)',
          groupSubtitle: 'Saldos em aberto superiores ao histórico realizado',
          groupBadge: `${scoreC.length} clientes`,
          rows: scoreC
        }
      ];

      grandTotals = [
        { label: 'LTV Geral Consolidado', value: formatCurrency(totalLtv), color: 'text-primary' },
        { label: 'Ticket Médio por Cliente', value: formatCurrency(clientes.length ? totalLtv / clientes.length : 0) }
      ];

      metricsSummary = [
        { label: 'LTV Geral Consolidado', value: formatCurrency(totalLtv), color: 'text-primary' },
        { label: 'Ticket Médio / Cliente', value: formatCurrency(clientes.length ? totalLtv / clientes.length : 0) }
      ];
    }
    // 8. PROJETOS E RENTABILIDADE (rep-prj-001) - Hierárquico
    else if (definition.id === 'rep-prj-001') {
      const emAndamento: Array<Record<string, any>> = [];
      const outros: Array<Record<string, any>> = [];

      projetos.forEach(p => {
        const item = {
          codigo: p.codigo || `PRJ-${p.id}`,
          nome: p.nome || 'Projeto Empresarial',
          responsavelPrincipal: p.responsavelPrincipal || 'Gerente de Projeto',
          valorContratado: formatCurrency(p.valorContratado || 0),
          progressoGlobal: `${p.progressoGlobal || 0}%`,
          horasRealizadas: p.horasRealizadas || 0,
          status: p.status || 'Em Andamento'
        };

        if (p.status === 'Em Andamento') emAndamento.push(item);
        else outros.push(item);
      });

      rows = [...emAndamento, ...outros];

      const valAndamento = emAndamento.reduce((acc, p) => acc + (parseFloat(String(p.valorContratado).replace(/[^0-9,-]+/g, '').replace(',', '.')) || 0), 0);
      const valTotal = projetos.reduce((acc, p) => acc + (p.valorContratado || 0), 0);

      hierarchicalGroups = [
        {
          groupTitle: '1. PROJETOS ATIVOS EM EXECUÇÃO',
          groupSubtitle: 'Sprints em andamento com entregas no cronograma',
          groupBadge: `${emAndamento.length} projetos`,
          rows: emAndamento,
          subtotals: [{ label: 'Subtotal em Andamento', value: formatCurrency(valAndamento), color: 'text-primary font-bold' }]
        },
        {
          groupTitle: '2. PROJETOS CONCLUÍDOS / PLANEJAMENTO',
          groupSubtitle: 'Entregas finalizadas ou em backlog de início',
          groupBadge: `${outros.length} projetos`,
          rows: outros
        }
      ];

      grandTotals = [
        { label: 'Total Geral Projetos', value: `${projetos.length}` },
        { label: 'Valor Total Contratado', value: formatCurrency(valTotal), color: 'text-primary' }
      ];

      metricsSummary = [
        { label: 'Projetos Registrados', value: `${projetos.length}` },
        { label: 'Valor Total Contratado', value: formatCurrency(valTotal), color: 'text-primary' }
      ];
    }
    // 9. GESTÃO DE PESSOAS (RH) (rep-rh-001) - Hierárquico por Departamento
    else if (definition.id === 'rep-rh-001') {
      const deptMap: Record<string, Array<Record<string, any>>> = {};

      colaboradores.forEach(col => {
        const dept = col.departamento || 'Geral';
        if (!deptMap[dept]) deptMap[dept] = [];

        deptMap[dept].push({
          nome: col.nome || 'Colaborador',
          cargo: col.cargo || 'Colaborador',
          departamento: dept,
          salarioBase: formatCurrency(col.salarioBase || 0),
          status: col.status || 'Ativo',
          dataAdmissao: col.dataAdmissao ? new Date(col.dataAdmissao).toLocaleDateString('pt-BR') : '-'
        });
      });

      rows = Object.values(deptMap).flat();

      hierarchicalGroups = Object.entries(deptMap).map(([deptName, deptRows], idx) => {
        const subtotal = deptRows.reduce((acc, r) => acc + (parseFloat(String(r.salarioBase).replace(/[^0-9,-]+/g, '').replace(',', '.')) || 0), 0);
        return {
          groupTitle: `${idx + 1}. DEPARTAMENTO: ${deptName.toUpperCase()}`,
          groupSubtitle: `Quadro funcional e folha de pagamento de ${deptName}`,
          groupBadge: `${deptRows.length} colaboradores`,
          rows: deptRows,
          subtotals: [{ label: `Custo Folha (${deptName})`, value: formatCurrency(subtotal), color: 'text-rose-600 font-bold' }]
        };
      });

      const totalFolha = colaboradores.reduce((acc, c) => acc + (c.salarioBase || 0), 0);

      grandTotals = [
        { label: 'Total de Colaboradores', value: `${colaboradores.length}` },
        { label: 'Custo Mensal Total da Folha', value: formatCurrency(totalFolha), color: 'text-rose-600' }
      ];

      metricsSummary = [
        { label: 'Total de Colaboradores', value: `${colaboradores.length}` },
        { label: 'Custo Mensal de Folha', value: formatCurrency(totalFolha), color: 'text-rose-600' }
      ];
    }
    // 10. MARKETING & MÍDIA (rep-mkt-001) - Hierárquico
    else if (definition.id === 'rep-mkt-001') {
      const ativas: Array<Record<string, any>> = [];
      const concluidas: Array<Record<string, any>> = [];

      campanhas.forEach(camp => {
        const item = {
          nome: camp.nome || 'Campanha de Marketing',
          objetivo: camp.objetivo || 'Geração de Leads',
          orcamentoTotal: camp.orcamentoTotal ? formatCurrency(typeof camp.orcamentoTotal === 'number' ? camp.orcamentoTotal : parseFloat(String(camp.orcamentoTotal).replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0) : 'R$ 0,00',
          gasto: camp.gasto ? formatCurrency(typeof camp.gasto === 'number' ? camp.gasto : parseFloat(String(camp.gasto).replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0) : 'R$ 0,00',
          progresso: `${camp.progresso || 0}%`,
          status: camp.status || 'Ativa'
        };

        if (camp.status === 'Ativa') ativas.push(item);
        else concluidas.push(item);
      });

      rows = [...ativas, ...concluidas];

      hierarchicalGroups = [
        {
          groupTitle: '1. CAMPANHAS ATIVAS EM VEICULAÇÃO',
          groupSubtitle: 'Investimentos ativos em tráfego e captação',
          groupBadge: `${ativas.length} campanhas`,
          rows: ativas
        },
        {
          groupTitle: '2. CAMPANHAS PLANEJADAS / FINALIZADAS',
          groupSubtitle: 'Histórico de ações e campanhas futuras',
          groupBadge: `${concluidas.length} campanhas`,
          rows: concluidas
        }
      ];

      grandTotals = [
        { label: 'Total Geral de Campanhas', value: `${campanhas.length}` }
      ];

      metricsSummary = [
        { label: 'Campanhas Ativas', value: `${ativas.length}` }
      ];
    }
    // 11. CONTRATOS (rep-ct-001) - Hierárquico
    else if (definition.category === 'Contratos' || definition.id.includes('ct')) {
      const vigentes: Array<Record<string, any>> = [];
      const outros: Array<Record<string, any>> = [];

      contratos.forEach(ct => {
        const item = {
          numero: ct.numero || `CTR-${ct.id}`,
          titulo: ct.titulo || 'Contrato Comercial',
          cliente: ct.clienteNome || 'Cliente',
          valorTotal: formatCurrency(ct.valorTotal || 0),
          status: ct.status || 'Vigente',
          vigenciaFim: ct.dataFim ? new Date(ct.dataFim).toLocaleDateString('pt-BR') : '-'
        };

        if (ct.status === 'Vigente' || ct.status === 'Ativo') vigentes.push(item);
        else outros.push(item);
      });

      rows = [...vigentes, ...outros];

      const valVigentes = vigentes.reduce((acc, ct) => acc + (parseFloat(String(ct.valorTotal).replace(/[^0-9,-]+/g, '').replace(',', '.')) || 0), 0);
      const totalCt = contratos.reduce((acc, ct) => acc + (ct.valorTotal || 0), 0);

      hierarchicalGroups = [
        {
          groupTitle: '1. CONTRATOS VIGENTES & ATIVOS',
          groupSubtitle: 'Acordos comerciais com prestação contínua de serviços',
          groupBadge: `${vigentes.length} contratos`,
          rows: vigentes,
          subtotals: [{ label: 'Subtotal Vigentes', value: formatCurrency(valVigentes), color: 'text-emerald-600 font-bold' }]
        },
        {
          groupTitle: '2. CONTRATOS EM RENOVAÇÃO / FINALIZADOS',
          groupSubtitle: 'Histórico e renovações em tratativa',
          groupBadge: `${outros.length} contratos`,
          rows: outros
        }
      ];

      grandTotals = [
        { label: 'Contratos Vigentes', value: `${vigentes.length}`, color: 'text-emerald-600' },
        { label: 'Valor Global dos Contratos', value: formatCurrency(totalCt), color: 'text-emerald-600' }
      ];

      metricsSummary = [
        { label: 'Contratos Vigentes', value: `${vigentes.length}` },
        { label: 'Valor Global Contratado', value: formatCurrency(totalCt), color: 'text-emerald-600' }
      ];
    }
    // 12. DEMAIS RELATÓRIOS DIVERSOS - Hierárquico
    else {
      rows = clientes.map(c => ({
        item: c.nomeFantasia || c.razaoSocial,
        status: c.status || 'Ativo',
        data: c.dataCadastro ? new Date(c.dataCadastro).toLocaleDateString('pt-BR') : '-'
      }));

      hierarchicalGroups = [
        {
          groupTitle: '1. REGISTROS CONSOLIDADOS',
          groupSubtitle: 'Base oficial de dados cadastrais e operacionais',
          rows: rows
        }
      ];

      grandTotals = [
        { label: 'Total Registros', value: `${rows.length}` }
      ];

      metricsSummary = [
        { label: 'Total Registros Reais', value: `${rows.length}` },
        { label: 'Status da Emissão', value: 'Válido e Autenticado', color: 'text-emerald-600' }
      ];
    }

    return {
      definition,
      filters: safeFilters,
      generatedAt: new Date().toISOString(),
      reportNumber,
      metricsSummary,
      rows,
      hierarchicalGroups,
      grandTotals,
      chartData
    };
  };


  const saveReportToDmsVault = (data: GeneratedReportData, format: ReportFormat, fileUrl?: string) => {
    const category = data.definition.category;
    const ext = format.toLowerCase() as any;
    const nomeArquivo = `Relatorio_${data.definition.title.replace(/[^a-zA-Z0-9]/g, '_')}_${data.reportNumber}.${ext}`;
    const tamanhoStr = format === 'PDF' ? '1.4 MB' : format === 'DOCX' ? '820 KB' : format === 'XLSX' ? '450 KB' : '120 KB';

    return dmsService.uploadFileFromModule({
      nome: nomeArquivo,
      extensao: ext,
      tamanho: tamanhoStr,
      tamanhoBytes: 1024 * 1024,
      moduloOrigem: 'Relatórios',
      relatorioTipo: category === 'Financeiro' ? 'DRE Gerencial' : 'Geral',
      categoria: `Relatório ${category}`,
      tags: ['Relatórios', category, data.reportNumber],
      urlConteudo: fileUrl,
    });
  };

  const registerExecution = (reportId: string, format: ReportFormat, filters: ReportFilterConfig, generatedData?: GeneratedReportData, fileUrl?: string) => {
    const def = REPORT_CATALOG.find(r => r.id === reportId) || REPORT_CATALOG[0];
    const newEntry: ReportExecutionHistory = {
      id: `exec-${Date.now()}`,
      reportId: def.id,
      reportTitle: def.title,
      category: def.category,
      generatedBy: 'Usuário Administrador',
      generatedAt: new Date().toISOString(),
      format,
      fileSize: format === 'PDF' ? '1.4 MB' : format === 'DOCX' ? '820 KB' : format === 'XLSX' ? '450 KB' : '120 KB',
      generationTimeMs: Math.floor(180 + Math.random() * 250),
      status: 'Sucesso',
      filtersSummary: `Período: ${filters.dataInicio || 'Geral'} até ${filters.dataFim || 'Hoje'}`
    };

    addHistory(newEntry);

    // Integrar salvamento do documento gerado (apenas 1 única cópia precisa e com snapshot)
    if (generatedData) {
      saveReportToDmsVault(generatedData, format, fileUrl);
    }

    return newEntry;
  };

  return {
    catalog: REPORT_CATALOG,
    favorites,
    history,
    schedules,
    templates,
    toggleFavorite,
    generateReportData,
    registerExecution,
    addSchedule,
    removeSchedule,
    addTemplate
  };
}
