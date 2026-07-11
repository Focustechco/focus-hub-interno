import React, { useState } from 'react';
import { User, CheckIn } from '../types';
import { ClockIcon, LogInIcon, LogOutIcon, FileTextIcon, SendIcon, Trash2Icon } from '../components/icons';
import { formatDate } from '../src/utils/formatters';
import { triggerDiscordWebhook } from '../src/utils/webhooks';
import { generateCSV, openInGoogleSheets, checkInColumns } from '../src/utils/sheets';
import api from '../services/api';
import { useToast } from '../components/Toast';

interface CheckInScreenProps {
    currentUser: User;
    checkIns: CheckIn[];
    setCheckIns: (checkIns: CheckIn[] | ((prev: CheckIn[]) => CheckIn[])) => void;
    users: User[];
}

const CheckInScreen: React.FC<CheckInScreenProps> = ({ currentUser, checkIns, setCheckIns, users }) => {
    const toast = useToast();
    const [dailyReport, setDailyReport] = useState('');
    const FORTALEZA_TIMEZONE = 'America/Fortaleza';

    const myLastCheckIn = (checkIns || [])
        .filter(c => c.userId === currentUser.id)
        .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())[0];

    const isCheckedIn = myLastCheckIn && !myLastCheckIn.checkOutTime;

    const lastCompletedCheckinWithoutReport = (checkIns || [])
        .filter(c =>
            c.userId === currentUser.id &&
            c.checkOutTime &&
            !c.dailyReport &&
            new Date(c.checkInTime).toDateString() === new Date().toDateString()
        )
        .sort((a, b) => new Date(b.checkOutTime!).getTime() - new Date(a.checkOutTime!).getTime())[0];

    const handleCheckIn = async () => {
        try {
            const response = await api.post('/checkins', {
                userId: currentUser.id,
                type: 'entry',
                location: 'Office', // Default for now
                mood: 'neutral',
                notes: ''
            });
            setCheckIns(prev => [response.data, ...prev]);

            // Trigger Discord webhook for check-in
            triggerDiscordWebhook('user.checkin', {
                Usuário: currentUser.name,
                Setor: currentUser.sector || 'Não informado',
                Horário: new Date().toLocaleTimeString('pt-BR', { timeZone: FORTALEZA_TIMEZONE })
            });
        } catch (error) {
            console.error("Failed to check in:", error);
            toast.error(`Erro ao registrar entrada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    };

    const handleCheckOut = async () => {
        if (myLastCheckIn) {
            try {
                const response = await api.put(`/checkins/${myLastCheckIn.id}`, {
                    checkOutTime: true
                });
                setCheckIns(prev => prev.map(c =>
                    c.id === myLastCheckIn.id ? response.data : c
                ));

                // Trigger Discord webhook for check-out
                triggerDiscordWebhook('user.checkout', {
                    Usuário: currentUser.name,
                    Setor: currentUser.sector || 'Não informado',
                    Horário: new Date().toLocaleTimeString('pt-BR', { timeZone: FORTALEZA_TIMEZONE })
                });
            } catch (error) {
                console.error("Failed to check out:", error);
                toast.error("Erro ao registrar saída.");
            }
        }
    };

    const handlePublishReport = async () => {
        if (!dailyReport.trim() || !lastCompletedCheckinWithoutReport) return;

        try {
            const response = await api.put(`/checkins/${lastCompletedCheckinWithoutReport.id}`, {
                dailyReport: dailyReport.trim()
            });

            setCheckIns(prev => prev.map(c =>
                c.id === lastCompletedCheckinWithoutReport.id
                    ? response.data
                    : c
            ));

            toast.success('Relatório enviado com sucesso!');
            setDailyReport('');
        } catch (error) {
            console.error("Failed to publish report:", error);
            toast.error("Erro ao enviar relatório.");
        }
    };

    const handleDeleteCheckIn = async (checkInId: string) => {
        if (!window.confirm("Tem certeza que deseja excluir este registro?")) return;

        try {
            // Optimistic update
            setCheckIns(prev => prev.filter(c => c.id !== checkInId));

            await api.delete(`/checkins/${checkInId}`);
        } catch (error) {
            console.error("Failed to delete check-in:", error);
            toast.error("Erro ao excluir registro.");
        }
    };

    const teamCheckIns = (checkIns || [])
        .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())
        .slice(0, 10);

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Registro de Ponto</h1>
            <p className="text-[#B3B3B3] mb-8">Marque seu ponto e acompanhe o histórico da equipe.</p>

            <div className="bg-[#1C1C1C] p-6 rounded-lg shadow-md mb-8 flex flex-col md:flex-row justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Seu Status Atual</h2>
                    {isCheckedIn ? (
                        <p className="text-green-400 font-semibold">
                            Ativo desde {new Date(myLastCheckIn.checkInTime).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: FORTALEZA_TIMEZONE
                            })}
                        </p>
                    ) : (
                        <p className="text-red-400 font-semibold">Inativo</p>
                    )}
                </div>
                <div className="flex gap-4 mt-4 md:mt-0">
                    <button
                        onClick={handleCheckIn}
                        disabled={isCheckedIn}
                        className="flex items-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <LogInIcon className="w-5 h-5" />
                        Registrar Entrada
                    </button>
                    <button
                        onClick={handleCheckOut}
                        disabled={!isCheckedIn}
                        className="flex items-center gap-2 bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <LogOutIcon className="w-5 h-5" />
                        Registrar Saída
                    </button>
                </div>
            </div>

            <div className="bg-[#1C1C1C] p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center"><ClockIcon className="w-5 h-5 mr-2" /> Atividade Recente da Equipe</h2>
                    <button
                        onClick={() => {
                            const csv = generateCSV(teamCheckIns, checkInColumns);
                            openInGoogleSheets(csv, 'Focus Hub - Registro de Ponto');
                            toast.success("Dados copiados! Cole no Google Sheets (Ctrl+V).");
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-[#2E2E2E] text-white rounded-lg hover:bg-[#FF6B00] active:bg-[#FF6B00] transition-colors"
                        title="Exportar para Google Sheets"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
                            <path d="M7 7h4v2H7zm0 4h4v2H7zm0 4h4v2H7zm6-8h4v2h-4zm0 4h4v2h-4zm0 4h4v2h-4z" />
                        </svg>
                        Exportar Sheets
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#2E2E2E]">
                                <th className="p-3">Colaborador</th>
                                <th className="p-3">Entrada</th>
                                <th className="p-3">Saída</th>
                                <th className="p-3">Status</th>
                                {currentUser.role === 'ADMIN' && <th className="p-3">Ações</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {teamCheckIns.map(checkIn => {
                                const user = users.find(u => u.id === checkIn.userId);
                                if (!user) return null;
                                const isUserCheckedIn = !checkIn.checkOutTime;

                                return (
                                    <tr key={checkIn.id} className="border-b border-[#2E2E2E] hover:bg-[#FF6B00]/10">
                                        <td className="p-3 flex items-center">
                                            <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                                            {user.name}
                                        </td>
                                        <td className="p-3">{formatDate(checkIn.checkInTime, true)}</td>
                                        <td className="p-3">{checkIn.checkOutTime ? formatDate(checkIn.checkOutTime, true) : '—'}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 text-xs rounded-full font-semibold ${isUserCheckedIn ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {isUserCheckedIn ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>

                                        {currentUser.role === 'ADMIN' && (
                                            <td className="p-3">
                                                <button
                                                    onClick={() => handleDeleteCheckIn(checkIn.id)}
                                                    className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                                                    title="Excluir Registro"
                                                >
                                                    <Trash2Icon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {lastCompletedCheckinWithoutReport && (
                    <div className="mt-8 pt-6 border-t border-[#2E2E2E]">
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                            <FileTextIcon className="w-5 h-5 mr-2" /> 🧾 Relatório Diário
                        </h2>
                        <p className="text-[#B3B3B3] mb-4 text-sm">Descreva as atividades que você realizou hoje. Este relatório será visível para o administrador.</p>
                        <textarea
                            value={dailyReport}
                            onChange={(e) => setDailyReport(e.target.value)}
                            placeholder="Ex: Tarefas concluídas, reuniões, entregas, avanços no projeto, etc."
                            className="w-full p-3 bg-[#2E2E2E] rounded-md border border-[#2E2E2E] focus:ring-1 focus:ring-[#FF6B00] focus:border-[#FF6B00] resize-y min-h-[120px]"
                            rows={5}
                        />
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handlePublishReport}
                                disabled={!dailyReport.trim()}
                                className="flex items-center gap-2 bg-[#FF6B00] text-white font-bold py-2 px-6 rounded-lg hover:bg-[#FF8C33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <SendIcon className="w-5 h-5" />
                                Publicar Relatório
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckInScreen;
