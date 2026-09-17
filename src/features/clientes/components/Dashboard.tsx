import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, UserCircle, Activity, CheckCircle2 as CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useClientesQuery } from '../hooks/useClientesQuery';
import { Cliente } from '../types';

export function Dashboard() {
  const { clientes } = useClientesQuery();

  const total = clientes.length;
  const ativos = clientes.filter(c => c.status === 'Ativo' || c.status === 'ativo').length;
  const inativos = total - ativos;
  const pj = clientes.filter(c => c.tipo === 'Pessoa Jurídica' || c.tipo === 'PJ').length;
  const pf = clientes.filter(c => c.tipo === 'Pessoa Física' || c.tipo === 'PF').length;

  const dataTipo = [
    { name: 'Pessoa Jurídica', value: pj },
    { name: 'Pessoa Física', value: pf },
  ].filter(d => d.value > 0);

  const dataStatus = [
    { name: 'Ativos', value: ativos },
    { name: 'Inativos', value: inativos },
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b'];

  return (
    <div className="flex flex-col space-y-6 animate-fade-in">
      <div className="order-2 md:order-1 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastros na base
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {ativos}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {total > 0 ? ((ativos / total) * 100).toFixed(0) : 0}% da base total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pessoas Jurídicas (B2B)</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pj}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Empresas parceiras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pessoas Físicas (B2C)</CardTitle>
            <UserCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pf}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Consumidores finais
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="order-1 md:order-2 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {dataTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataTipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {dataTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Nenhum cliente cadastrado.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status da Base</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {dataStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataStatus} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {dataStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Ativos' ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Nenhum cliente cadastrado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
