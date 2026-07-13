import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, Users, BarChart2, Plus, Search, Folder, Star, Upload, FileSignature, CloudUpload, Eye, Download } from 'lucide-react';
import api from '../services/api';

const ReportsScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'archive' | 'meeting'>('dashboard');
    const [stats, setStats] = useState<any>(null);

    const [archivedReports, setArchivedReports] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('focus_archived_reports');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return [];
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('Todos');
    const [filterDate, setFilterDate] = useState('');
    const [viewingReport, setViewingReport] = useState<any>(null);

    const filteredReports = useMemo(() => {
        return archivedReports.filter(report => {
            const matchQuery = report.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchType = filterType === 'Todos' || report.type === filterType;
            const matchDate = !filterDate || report.date === filterDate;
            return matchQuery && matchType && matchDate;
        });
    }, [archivedReports, searchQuery, filterType, filterDate]);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/reports/dashboard/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching report stats:', error);
        }
    };

    const handleDownloadArchive = (e: React.MouseEvent, report: any) => {
        e.stopPropagation();
        import('html2pdf.js').then((html2pdfModule) => {
            const html2pdf = html2pdfModule.default || html2pdfModule;
            const element = document.createElement('div');
            element.innerHTML = report.htmlContent;
            const opt = {
                margin:       0,
                filename:     `${report.title.replace(/ /g, '_')}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
        });
    };

    const ReportCard = ({ icon: Icon, title, description, color, onClick, onCloudClick }: any) => (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`p-6 rounded-2xl cursor-pointer shadow-lg border border-[#2E2E2E] flex flex-col items-start bg-[#1C1C1C] hover:bg-[#2A2A2A] transition-colors relative`}
        >
            <div className="flex justify-between items-start w-full mb-4">
                <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
                    <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
                </div>
                {onCloudClick && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onCloudClick(); }}
                        className="p-2 bg-[#2E2E2E] hover:bg-[#FF6B00] rounded-full transition-colors"
                        title="Enviar relatório para o Drive"
                    >
                        <CloudUpload className="w-5 h-5 text-white" />
                    </button>
                )}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-[#B3B3B3]">{description}</p>
        </motion.div>
    );

    const [isUploading, setIsUploading] = useState(false);
    const [meetingAnalysis, setMeetingAnalysis] = useState<any>(null);
    const [isEditingAta, setIsEditingAta] = useState(false);
    const [isSavingToDrive, setIsSavingToDrive] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('transcript', file);

        setIsUploading(true);
        setMeetingAnalysis(null);

        try {
            const response = await api.post('/reports/meeting/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMeetingAnalysis(response.data);
            alert("Transcrição analisada com sucesso!");
        } catch (error: any) {
            console.error('Error uploading transcript:', error);
            alert(error.response?.data?.message || 'Erro ao processar a transcrição. Falha na comunicação com a IA.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const generatePDFHeader = (title: string) => {
        let userName = 'Usuário do Sistema';
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                userName = user.name || userName;
            }
        } catch (e) {}

        return `
            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #FF6B00; padding-bottom: 20px; margin-bottom: 30px;">
                <div style="display: flex; align-items: center;">
                    <img src="${window.location.origin}/logo-relatorio.png" alt="Logo FocusHub" style="width: 50px; height: 50px; object-fit: contain; margin-right: 15px;" />
                    <div style="display: flex; flex-direction: column; justify-content: center;">
                        <h1 style="margin: 0; font-size: 24px; color: #333; letter-spacing: 1px; font-weight: 900; line-height: 1;">FOCUS HUB</h1>
                        <div style="font-size: 11px; color: #777; letter-spacing: 0.5px; margin-top: 4px;">Powered by Focus Tech<sup style="font-size: 8px;">&reg;</sup></div>
                    </div>
                </div>
                <div style="text-align: right; font-size: 12px; color: #555; line-height: 1.6; background-color: #f9f9f9; padding: 10px 15px; border-radius: 6px; border: 1px solid #eee;">
                    <div style="margin-bottom: 3px;"><b style="color:#333;">Documento:</b> ${title.toUpperCase()}</div>
                    <div style="margin-bottom: 3px;"><b style="color:#333;">Responsável:</b> ${userName}</div>
                    <div><b style="color:#333;">Data de Emissão:</b> ${new Date().toLocaleString('pt-BR')}</div>
                </div>
            </div>
        `;
    };

    const handleExportPDF = () => {
        if (!meetingAnalysis) return;
        
        // Import html2pdf dynamically to avoid SSR issues or missing types
        import('html2pdf.js').then((html2pdfModule) => {
            const html2pdf = html2pdfModule.default || html2pdfModule;
            
            let userName = 'Usuário do Sistema';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    userName = user.name || userName;
                }
            } catch (e) {}
            
            const dateStr = new Date().toLocaleDateString('pt-BR');
            const timeStr = new Date().toLocaleTimeString('pt-BR');

            const ataHeader = `
                <div style="margin-bottom: 30px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 60px; vertical-align: middle;">
                                <img src="${window.location.origin}/logo-relatorio.png" alt="Logo FocusHub" style="width: 50px; height: 50px; object-fit: contain; display: block;" />
                            </td>
                            <td style="vertical-align: middle; text-align: left;">
                                <h1 style="margin: 0; font-size: 24px; color: #333; letter-spacing: 1px; font-weight: 900; line-height: 1;">FOCUS HUB</h1>
                                <div style="font-size: 11px; color: #777; letter-spacing: 0.5px; margin-top: 4px;">Powered by Focus Tech<sup style="font-size: 8px;">&reg;</sup></div>
                            </td>
                        </tr>
                    </table>
                    <h2 style="text-align: center; margin: 20px 0 0 0; font-size: 22px; color: #FF6B00; text-transform: uppercase; letter-spacing: 2px;">Ata de Reunião</h2>
                </div>
                <hr style="border: 0; border-top: 2px solid #eee; margin: 20px 0;" />
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #555; margin-bottom: 30px;">
                    <tr><td style="padding: 4px 0;"><b>Título da reunião:</b></td><td>${meetingAnalysis.title || 'Reunião Estratégica'}</td></tr>
                    <tr><td style="padding: 4px 0;"><b>Departamento:</b></td><td>${meetingAnalysis.department || 'Geral'}</td></tr>
                    <tr><td style="padding: 4px 0;"><b>Projeto:</b></td><td>${meetingAnalysis.project || 'N/A'}</td></tr>
                    <tr><td style="padding: 4px 0;"><b>Data:</b></td><td>${dateStr}</td></tr>
                    <tr><td style="padding: 4px 0;"><b>Horário:</b></td><td>${timeStr}</td></tr>
                    <tr><td style="padding: 4px 0;"><b>Responsável pela ata:</b></td><td>${userName}</td></tr>
                </table>
            `;

            const ataFooter = `
                <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; font-size: 10px; color: #999;">
                    <p style="margin: 2px 0;">&copy; ${new Date().getFullYear()} Focus Tech<sup style="font-size: 7px;">&reg;</sup>. Todos os direitos reservados.</p>
                    <p style="margin: 2px 0;">Documento gerado automaticamente pelo FocusHub | Data de emissão: ${dateStr} às ${timeStr}</p>
                </div>
            `;
            
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="font-family: Arial, sans-serif; color: #333; background: #fff;">
                    ${ataHeader}
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 20px; margin-bottom: 10px;">1. Objetivo da Reunião</h3>
                        <p style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0;">${meetingAnalysis.objective || 'N/A'}</p>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">2. Resumo Executivo</h3>
                        <p style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0;">${meetingAnalysis.executiveSummary || 'N/A'}</p>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">3. Participantes</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <tr style="background-color: #f9f9f9; border-bottom: 2px solid #eee;">
                                <th style="padding: 8px; text-align: left; color: #333;">Nome</th>
                                <th style="padding: 8px; text-align: left; color: #333;">Cargo</th>
                                <th style="padding: 8px; text-align: left; color: #333;">Participação</th>
                            </tr>
                            ${(meetingAnalysis.participants || []).map((p: any) => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px; color: #555;">${p.name || p}</td>
                                <td style="padding: 8px; color: #555;">${p.role || 'N/A'}</td>
                                <td style="padding: 8px; color: #555;">${p.status || 'Presente'}</td>
                            </tr>
                            `).join('')}
                        </table>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">4. Assuntos Discutidos</h3>
                        <ul style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0; padding-left: 20px;">
                            ${(meetingAnalysis.topicsDiscussed || []).map((t: any) => `<li style="margin-bottom: 8px;"><b>${t.topic || t}</b>: ${t.description || ''}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">5. Decisões Tomadas</h3>
                        <ul style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0; list-style-type: square; padding-left: 20px;">
                            ${(meetingAnalysis.decisions || []).map((d: string) => `<li style="margin-bottom: 8px;">${d}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">6. Ações Definidas</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <tr style="background-color: #f9f9f9; border-bottom: 2px solid #eee;">
                                <th style="padding: 8px; text-align: left; color: #333;">Ação</th>
                                <th style="padding: 8px; text-align: left; color: #333;">Responsável</th>
                                <th style="padding: 8px; text-align: left; color: #333;">Prazo</th>
                                <th style="padding: 8px; text-align: left; color: #333;">Status</th>
                            </tr>
                            ${(meetingAnalysis.actionItems || []).map((a: any) => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px; color: #555;">${a.action || a.task || a}</td>
                                <td style="padding: 8px; color: #555;">${a.assignee || 'N/A'}</td>
                                <td style="padding: 8px; color: #555;">${a.deadline || 'A definir'}</td>
                                <td style="padding: 8px; color: #555;">${a.status || 'Pendente'}</td>
                            </tr>
                            `).join('')}
                        </table>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">7. Próximos Passos</h3>
                        <ol style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0; padding-left: 20px;">
                            ${(meetingAnalysis.nextSteps || []).map((s: string) => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
                        </ol>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #d9534f; font-size: 16px; border-left: 4px solid #d9534f; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">8. Pontos de Atenção</h3>
                        <ul style="line-height: 1.6; color: #d9534f; font-size: 13px; margin-bottom: 0; padding-left: 20px;">
                            ${(meetingAnalysis.attentionPoints || meetingAnalysis.criticalPoints || []).map((c: string) => `<li style="margin-bottom: 8px;">${c}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">9. Observações Gerais</h3>
                        <p style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0;">${meetingAnalysis.generalObservations || 'Nenhuma observação adicional.'}</p>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">10. Conclusão</h3>
                        <p style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0;">${meetingAnalysis.conclusion || 'Reunião encerrada com sucesso.'}</p>
                    </div>
                    
                    ${meetingAnalysis.transcriptUrl ? `
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">Documento Original</h3>
                        <p style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0;">
                            <a href="${meetingAnalysis.transcriptUrl}" target="_blank" style="color: #FF6B00; text-decoration: none;">📄 Baixar transcrição original</a>
                        </p>
                    </div>
                    ` : ''}

                    ${ataFooter}
                </div>
            `;

            const opt = {
                margin:       0.5,
                filename:     'Ata_de_Reuniao_FocusHub.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['css', 'avoid-all', 'legacy'] }
            };

            html2pdf().set(opt).from(element).save();
        }).catch(err => {
            console.error("Erro ao carregar gerador de PDF", err);
            alert("Erro ao gerar PDF.");
        });
    };

    const handleSaveToDrive = () => {
        if (!meetingAnalysis) return;
        setIsSavingToDrive(true);
        
        import('html2pdf.js').then(async (html2pdfModule) => {
            const html2pdf = html2pdfModule.default || html2pdfModule;
            
            let userName = 'Usuário do Sistema';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    userName = user.name || userName;
                }
            } catch (e) {}
            
            const dateStr = new Date().toLocaleDateString('pt-BR');
            const timeStr = new Date().toLocaleTimeString('pt-BR');

            const ataHeader = `
                <div style="margin-bottom: 30px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 60px; vertical-align: middle;">
                                <img src="${window.location.origin}/logo-relatorio.png" alt="Logo FocusHub" style="width: 50px; height: 50px; object-fit: contain; display: block;" />
                            </td>
                            <td style="vertical-align: middle; text-align: left;">
                                <h1 style="margin: 0; font-size: 24px; color: #333; letter-spacing: 1px; font-weight: 900; line-height: 1;">FOCUS HUB</h1>
                                <div style="font-size: 11px; color: #777; letter-spacing: 0.5px; margin-top: 4px;">Powered by Focus Tech<sup style="font-size: 8px;">&reg;</sup></div>
                            </td>
                        </tr>
                    </table>
                    <h2 style="text-align: center; margin: 20px 0 0 0; font-size: 22px; color: #FF6B00; text-transform: uppercase; letter-spacing: 2px;">Ata de Reunião</h2>
                </div>
                <hr style="border: 0; border-top: 2px solid #eee; margin: 20px 0;" />
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #555; margin-bottom: 30px;">
                    <tr><td style="padding: 4px 0;"><b>Título da reunião:</b></td><td>${meetingAnalysis.title || 'Reunião Estratégica'}</td></tr>
                    <tr><td style="padding: 4px 0;"><b>Departamento:</b></td><td>${meetingAnalysis.department || 'Geral'}</td></tr>
                    <tr><td style="padding: 4px 0;"><b>Projeto:</b></td><td>${meetingAnalysis.project || 'N/A'}</td></tr>
                    <tr><td style="padding: 4px 0;"><b>Data:</b></td><td>${dateStr}</td></tr>
                    <tr><td style="padding: 4px 0;"><b>Horário:</b></td><td>${timeStr}</td></tr>
                    <tr><td style="padding: 4px 0;"><b>Responsável pela ata:</b></td><td>${userName}</td></tr>
                </table>
            `;

            const ataFooter = `
                <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; font-size: 10px; color: #999;">
                    <p style="margin: 2px 0;">&copy; ${new Date().getFullYear()} Focus Tech<sup style="font-size: 7px;">&reg;</sup>. Todos os direitos reservados.</p>
                    <p style="margin: 2px 0;">Documento gerado automaticamente pelo FocusHub | Data de emissão: ${dateStr} às ${timeStr}</p>
                </div>
            `;
            
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="font-family: Arial, sans-serif; color: #333; background: #fff;">
                    ${ataHeader}
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 20px; margin-bottom: 10px;">1. Objetivo da Reunião</h3>
                        <p style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0;">${meetingAnalysis.objective || 'N/A'}</p>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">2. Resumo Executivo</h3>
                        <p style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0;">${meetingAnalysis.executiveSummary || 'N/A'}</p>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">3. Participantes</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <tr style="background-color: #f9f9f9; border-bottom: 2px solid #eee;">
                                <th style="padding: 8px; text-align: left; color: #333;">Nome</th>
                                <th style="padding: 8px; text-align: left; color: #333;">Cargo</th>
                                <th style="padding: 8px; text-align: left; color: #333;">Participação</th>
                            </tr>
                            ${(meetingAnalysis.participants || []).map((p: any) => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px; color: #555;">${p.name || p}</td>
                                <td style="padding: 8px; color: #555;">${p.role || 'N/A'}</td>
                                <td style="padding: 8px; color: #555;">${p.status || 'Presente'}</td>
                            </tr>
                            `).join('')}
                        </table>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">4. Assuntos Discutidos</h3>
                        <ul style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0; padding-left: 20px;">
                            ${(meetingAnalysis.topicsDiscussed || []).map((t: any) => `<li style="margin-bottom: 8px;"><b>${t.topic || t}</b>: ${t.description || ''}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">5. Decisões Tomadas</h3>
                        <ul style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0; list-style-type: square; padding-left: 20px;">
                            ${(meetingAnalysis.decisions || []).map((d: string) => `<li style="margin-bottom: 8px;">${d}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">6. Ações Definidas</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <tr style="background-color: #f9f9f9; border-bottom: 2px solid #eee;">
                                <th style="padding: 8px; text-align: left; color: #333;">Ação</th>
                                <th style="padding: 8px; text-align: left; color: #333;">Responsável</th>
                                <th style="padding: 8px; text-align: left; color: #333;">Prazo</th>
                                <th style="padding: 8px; text-align: left; color: #333;">Status</th>
                            </tr>
                            ${(meetingAnalysis.actionItems || []).map((a: any) => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px; color: #555;">${a.action || a.task || a}</td>
                                <td style="padding: 8px; color: #555;">${a.assignee || 'N/A'}</td>
                                <td style="padding: 8px; color: #555;">${a.deadline || 'A definir'}</td>
                                <td style="padding: 8px; color: #555;">${a.status || 'Pendente'}</td>
                            </tr>
                            `).join('')}
                        </table>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">7. Próximos Passos</h3>
                        <ol style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0; padding-left: 20px;">
                            ${(meetingAnalysis.nextSteps || []).map((s: string) => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
                        </ol>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #d9534f; font-size: 16px; border-left: 4px solid #d9534f; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">8. Pontos de Atenção</h3>
                        <ul style="line-height: 1.6; color: #d9534f; font-size: 13px; margin-bottom: 0; padding-left: 20px;">
                            ${(meetingAnalysis.attentionPoints || meetingAnalysis.criticalPoints || []).map((c: string) => `<li style="margin-bottom: 8px;">${c}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">9. Observações Gerais</h3>
                        <p style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0;">${meetingAnalysis.generalObservations || 'Nenhuma observação adicional.'}</p>
                    </div>
                    
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">10. Conclusão</h3>
                        <p style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0;">${meetingAnalysis.conclusion || 'Reunião encerrada com sucesso.'}</p>
                    </div>
                    
                    ${meetingAnalysis.transcriptUrl ? `
                    <div style="page-break-inside: avoid; margin-bottom: 20px;">
                        <h3 style="color: #444; font-size: 16px; border-left: 4px solid #FF6B00; padding-left: 10px; margin-top: 10px; margin-bottom: 10px;">Documento Original</h3>
                        <p style="line-height: 1.6; color: #555; font-size: 13px; margin-bottom: 0;">
                            <a href="${meetingAnalysis.transcriptUrl}" target="_blank" style="color: #FF6B00; text-decoration: none;">📄 Baixar transcrição original</a>
                        </p>
                    </div>
                    ` : ''}

                    ${ataFooter}
                </div>
            `;

            const opt = {
                margin:       0.5,
                filename:     'Ata_de_Reuniao_FocusHub.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['css', 'avoid-all', 'legacy'] }
            };

            html2pdf().set(opt).from(element).toPdf().get('pdf').then(async (pdf: any) => {
                const pdfBlob = pdf.output('blob');
                const formData = new FormData();
                const file = new File([pdfBlob], 'Ata_de_Reuniao_FocusHub.pdf', { type: 'application/pdf' });
                formData.append('file', file);
                formData.append('folderId', 'root'); // Root folder by default

                try {
                    await api.post('/drive/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    alert('Ata salva no Google Drive com sucesso!');
                } catch (err: any) {
                    console.error("Erro ao salvar no Drive:", err);
                    const msg = err.response?.data?.error || err.message || "Erro desconhecido";
                    alert("Erro ao salvar no Drive: " + msg);
                } finally {
                    setIsSavingToDrive(false);
                }
            }).catch((err: any) => {
                console.error("Erro interno no html2pdf:", err);
                alert("Erro ao gerar arquivo PDF.");
                setIsSavingToDrive(false);
            });
        }).catch(err => {
            console.error("Erro no import", err);
            setIsSavingToDrive(false);
        });
    };

    const handleCopyToGoogleDocs = async () => {
        if (!meetingAnalysis) return;
        
        const htmlContent = `
            <h2>Ata de Reunião: ${meetingAnalysis.title || 'Reunião Estratégica'}</h2>
            <hr/>
            <p><strong>1. Objetivo da Reunião</strong><br/>${meetingAnalysis.objective || 'N/A'}</p>
            <p><strong>2. Resumo Executivo</strong><br/>${meetingAnalysis.executiveSummary || 'N/A'}</p>
            <p><strong>3. Participantes</strong></p>
            <ul>
                ${(meetingAnalysis.participants || []).map((p: any) => `<li>${p.name || p} - ${p.role || ''} (${p.status || 'Presente'})</li>`).join('')}
            </ul>
            <p><strong>4. Assuntos Discutidos</strong></p>
            <ul>
                ${(meetingAnalysis.topicsDiscussed || []).map((t: any) => `<li><b>${t.topic || t}</b>: ${t.description || ''}</li>`).join('')}
            </ul>
            <p><strong>5. Decisões Tomadas</strong></p>
            <ul>
                ${(meetingAnalysis.decisions || []).map((d: string) => `<li>${d}</li>`).join('')}
            </ul>
            <p><strong>6. Ações Definidas</strong></p>
            <ul>
                ${(meetingAnalysis.actionItems || []).map((a: any) => `<li>${a.action || a.task || a} | Resp: ${a.assignee || 'N/A'} | Prazo: ${a.deadline || 'A definir'}</li>`).join('')}
            </ul>
            <p><strong>7. Próximos Passos</strong></p>
            <ol>
                ${(meetingAnalysis.nextSteps || []).map((s: string) => `<li>${s}</li>`).join('')}
            </ol>
            <p><strong>8. Pontos de Atenção</strong></p>
            <ul>
                ${(meetingAnalysis.attentionPoints || meetingAnalysis.criticalPoints || []).map((c: string) => `<li>${c}</li>`).join('')}
            </ul>
            <p><strong>9. Observações Gerais</strong><br/>${meetingAnalysis.generalObservations || 'Nenhuma'}</p>
            <p><strong>10. Conclusão</strong><br/>${meetingAnalysis.conclusion || 'Reunião encerrada com sucesso.'}</p>
            ${meetingAnalysis.transcriptUrl ? `<p><strong>Documento Original:</strong> <a href="${meetingAnalysis.transcriptUrl}">Baixar transcrição original</a></p>` : ''}
        `;
        
        try {
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const data = [new ClipboardItem({ 'text/html': blob })];
            await navigator.clipboard.write(data);
            alert("Ata copiada! Agora é só colar no seu Google Docs (Ctrl+V) mantendo a formatação.");
        } catch (err) {
            console.error("Erro ao copiar formato rico", err);
            const plainText = htmlContent.replace(/<[^>]+>/g, '\n');
            navigator.clipboard.writeText(plainText);
            alert("Ata copiada como texto simples.");
        }
    };

    const handleGenerateModuleReport = async (type: string, title: string, saveToDrive: boolean = false) => {
        try {
            const response = await api.get(`/reports/generate/${type}`);
            const data = response.data;
            
            import('html2pdf.js').then((html2pdfModule) => {
                const html2pdf = html2pdfModule.default || html2pdfModule;
                
                const element = document.createElement('div');
                
                // Construct HTML based on data type
                let contentHtml = '';
                if (type === 'tasks') {
                    contentHtml = `
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
                            <tr style="background-color: #FF6B00; color: white;">
                                <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left;">Título</th>
                                <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left;">Status</th>
                                <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left;">Prioridade</th>
                                <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left;">Responsável</th>
                            </tr>
                            ${data.map((t: any, i: number) => `
                                <tr style="background-color: ${i % 2 === 0 ? '#fff' : '#f9f9f9'};">
                                    <td style="border: 1px solid #ddd; padding: 10px 8px; color: #444;">${t.title}</td>
                                    <td style="border: 1px solid #ddd; padding: 10px 8px; color: #444;">${t.status}</td>
                                    <td style="border: 1px solid #ddd; padding: 10px 8px; color: #444;">${t.priority}</td>
                                    <td style="border: 1px solid #ddd; padding: 10px 8px; color: #444;">${t.assignee_name || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </table>
                    `;
                } else if (type === 'team') {
                    const teamMembers = data.teamMembers || [];
                    const activity = data.recentActivity || [];
                    
                    contentHtml = `
                        <div style="margin-top: 20px;">
                            <h3 style="color: #333; border-bottom: 2px solid #FF6B00; padding-bottom: 5px;">Membros da Equipe</h3>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
                                <tr style="background-color: #FF6B00; color: white;">
                                    <th style="border: 1px solid #ddd; padding: 10px 8px; text-align: left;">Nome</th>
                                    <th style="border: 1px solid #ddd; padding: 10px 8px; text-align: left;">Email</th>
                                    <th style="border: 1px solid #ddd; padding: 10px 8px; text-align: left;">Setor</th>
                                </tr>
                                ${teamMembers.map((u: any, i: number) => `
                                    <tr style="background-color: ${i % 2 === 0 ? '#fff' : '#f9f9f9'};">
                                        <td style="border: 1px solid #ddd; padding: 8px; color: #444; font-weight: bold;">${u.name}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px; color: #444;">${u.email}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px; color: #444;">${u.sector || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </table>
                            
                            <h3 style="color: #333; border-bottom: 2px solid #FF6B00; padding-bottom: 5px; margin-top: 40px;">Atividades e Relatórios Diários (Registro de Ponto)</h3>
                            ${activity.length > 0 ? `
                                <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
                                    <tr style="background-color: #f2f2f2; color: #333;">
                                        <th style="border: 1px solid #ddd; padding: 10px 8px; text-align: left; width: 25%;">Funcionário</th>
                                        <th style="border: 1px solid #ddd; padding: 10px 8px; text-align: left; width: 25%;">Horários</th>
                                        <th style="border: 1px solid #ddd; padding: 10px 8px; text-align: left; width: 50%;">Relatório Diário</th>
                                    </tr>
                                    ${activity.map((a: any, i: number) => `
                                        <tr style="background-color: ${i % 2 === 0 ? '#fff' : '#f9f9f9'};">
                                            <td style="border: 1px solid #ddd; padding: 10px 8px; color: #444;">
                                                <b>${a.user_name}</b><br/>
                                                <span style="font-size: 11px; color: #777;">${a.sector || 'Geral'}</span>
                                            </td>
                                            <td style="border: 1px solid #ddd; padding: 10px 8px; color: #444; font-size: 12px;">
                                                <b>Entrada:</b> ${new Date(a.check_in_time).toLocaleString('pt-BR')}<br/>
                                                <b>Saída:</b> ${a.check_out_time ? new Date(a.check_out_time).toLocaleString('pt-BR') : '<span style="color: #FFBB28;">Em andamento</span>'}
                                            </td>
                                            <td style="border: 1px solid #ddd; padding: 10px 8px; color: #444; font-size: 12px; font-style: ${a.daily_report ? 'normal' : 'italic'};">
                                                ${a.daily_report ? a.daily_report.replace(/\\n/g, '<br/>') : 'Nenhum relatório enviado.'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </table>
                            ` : '<p style="color: #777;">Nenhuma atividade recente encontrada.</p>'}
                        </div>
                    `;
                } else if (type === 'agenda') {
                    contentHtml = `
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
                            <tr style="background-color: #FF6B00; color: white;">
                                <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left;">Evento / Tarefa</th>
                                <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left;">Data</th>
                                <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left;">Responsável</th>
                                <th style="border: 1px solid #ddd; padding: 12px 8px; text-align: left;">Status</th>
                            </tr>
                            ${data.map((t: any, i: number) => `
                                <tr style="background-color: ${i % 2 === 0 ? '#fff' : '#f9f9f9'};">
                                    <td style="border: 1px solid #ddd; padding: 10px 8px; color: #444;">${t.title || 'Sem título'}</td>
                                    <td style="border: 1px solid #ddd; padding: 10px 8px; color: #444;">${new Date(t.due_date).toLocaleDateString('pt-BR')}</td>
                                    <td style="border: 1px solid #ddd; padding: 10px 8px; color: #444;">${t.assignee_name || 'Não atribuído'}</td>
                                    <td style="border: 1px solid #ddd; padding: 10px 8px; color: #444;">${t.status || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </table>
                    `;
                } else if (type === 'indicators') {
                    const p = data.tasksCount?.['pendente'] || 0;
                    const e = data.tasksCount?.['em_progresso'] || 0;
                    const c = data.tasksCount?.['concluida'] || 0;
                    const total = p + e + c;
                    
                    let donutChart = '<p style="text-align:center; color:#777;">Nenhuma tarefa encontrada.</p>';
                    if (total > 0) {
                        const r = 15.9155;
                        const pctP = p / total;
                        const pctE = e / total;
                        const pctC = c / total;
                        
                        const dashP = pctP * 100;
                        const dashE = pctE * 100;
                        const dashC = pctC * 100;
                        
                        const offsetP = 25; 
                        const offsetE = 100 - dashP + 25;
                        const offsetC = 100 - dashP - dashE + 25;
                        
                        donutChart = `
                            <div style="display: flex; justify-content: center; align-items: center; padding: 20px 0;">
                                <svg width="180px" height="180px" viewBox="0 0 50 50" style="display: block;">
                                    <circle cx="25" cy="25" r="${r}" fill="transparent" stroke="#FFBB28" stroke-width="6" stroke-dasharray="${dashP} ${100 - dashP}" stroke-dashoffset="${offsetP}"></circle>
                                    <circle cx="25" cy="25" r="${r}" fill="transparent" stroke="#00ADEF" stroke-width="6" stroke-dasharray="${dashE} ${100 - dashE}" stroke-dashoffset="${offsetE}"></circle>
                                    <circle cx="25" cy="25" r="${r}" fill="transparent" stroke="#00C49F" stroke-width="6" stroke-dasharray="${dashC} ${100 - dashC}" stroke-dashoffset="${offsetC}"></circle>
                                    <text x="25" y="24.5" text-anchor="middle" dominant-baseline="middle" font-size="8" font-family="Arial" fill="#333" font-weight="bold">${total}</text>
                                    <text x="25" y="30.5" text-anchor="middle" font-size="4" font-family="Arial" fill="#666">Total</text>
                                </svg>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-top: 5px; font-size: 11px; color: #555;">
                                <div style="display: flex; align-items: center;"><span style="color: #FFBB28; font-size: 14px; margin-right: 4px;">●</span> <b>Pendentes (${p})</b></div>
                                <div style="display: flex; align-items: center;"><span style="color: #00ADEF; font-size: 14px; margin-right: 4px;">●</span> <b>Em Progresso (${e})</b></div>
                                <div style="display: flex; align-items: center;"><span style="color: #00C49F; font-size: 14px; margin-right: 4px;">●</span> <b>Concluídas (${c})</b></div>
                            </div>
                        `;
                    }
                    
                    const sectors = ['Comercial', 'RH', 'Tech', 'Administração', 'Financeiro'];
                    const sectorColors: Record<string, string> = {
                        'Comercial': '#FF6B00',
                        'RH': '#7A00FF',
                        'Tech': '#00ADEF',
                        'Administração': '#00C49F',
                        'Financeiro': '#FFBB28',
                    };
                    
                    let maxSector = 1;
                    sectors.forEach(s => {
                        const val = data.sectorCount?.[s] || 0;
                        if (val > maxSector) maxSector = val;
                    });
                    
                    let barsHtml = '';
                    sectors.forEach(s => {
                        const val = data.sectorCount?.[s] || 0;
                        const heightPct = (val / maxSector) * 100;
                        barsHtml += `
                            <div style="display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 180px; width: 50px;">
                                <div style="font-size: 12px; margin-bottom: 5px; color: #444; font-weight: bold;">${val}</div>
                                <div style="width: 35px; height: ${Math.max(2, heightPct)}%; background-color: ${sectorColors[s]}; border-radius: 4px 4px 0 0;"></div>
                                <div style="font-size: 9px; margin-top: 8px; color: #555; text-align: center; font-weight: 500;">${s}</div>
                            </div>
                        `;
                    });
                    
                    const barChart = `
                        <div style="display: flex; justify-content: space-around; align-items: flex-end; height: 210px; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px;">
                            ${barsHtml}
                        </div>
                    `;

                    // Generate tasks table
                    const tasksList = data.tasksList || [];
                    let tasksTable = '<p style="color: #777; text-align: center;">Nenhuma tarefa encontrada.</p>';
                    if (tasksList.length > 0) {
                        tasksTable = `
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
                                <tr style="background-color: #f2f2f2; color: #333;">
                                    <th style="border: 1px solid #ddd; padding: 10px 8px; text-align: left;">Título</th>
                                    <th style="border: 1px solid #ddd; padding: 10px 8px; text-align: left;">Status</th>
                                    <th style="border: 1px solid #ddd; padding: 10px 8px; text-align: left;">Prioridade</th>
                                    <th style="border: 1px solid #ddd; padding: 10px 8px; text-align: left;">Responsável</th>
                                </tr>
                                ${tasksList.map((t: any, i: number) => `
                                    <tr style="background-color: ${i % 2 === 0 ? '#fff' : '#f9f9f9'};">
                                        <td style="border: 1px solid #ddd; padding: 8px; color: #444;">${t.title}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px; color: #444;">
                                            <span style="background: ${t.status === 'concluida' ? '#00C49F20' : t.status === 'em_progresso' ? '#00ADEF20' : '#FFBB2820'}; color: ${t.status === 'concluida' ? '#00C49F' : t.status === 'em_progresso' ? '#00ADEF' : '#FFBB28'}; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                                                ${t.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td style="border: 1px solid #ddd; padding: 8px; color: #444;">
                                            <span style="background: ${t.priority === 'alta' ? '#ff000020' : t.priority === 'media' ? '#FFBB2820' : '#00C49F20'}; color: ${t.priority === 'alta' ? '#ff0000' : t.priority === 'media' ? '#FFBB28' : '#00C49F'}; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                                                ${t.priority}
                                            </span>
                                        </td>
                                        <td style="border: 1px solid #ddd; padding: 8px; color: #444;">${t.assignee_name || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </table>
                        `;
                    }

                    contentHtml = `
                        <div style="margin-top: 20px; font-size: 15px; color: #444;">
                            <p style="color: #666; margin-bottom: 20px;">Abaixo estão os gráficos de desempenho extraídos automaticamente do seu painel, acompanhados da lista completa de tarefas e seus status.</p>
                            
                            <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                                <div style="flex: 1; padding: 20px; border: 1px solid #eee; border-radius: 8px; background: #fff;">
                                    <h3 style="color: #333; border-bottom: 2px solid #FF6B00; padding-bottom: 10px; margin-top: 0;">Progresso das Tarefas</h3>
                                    ${donutChart}
                                </div>
                                <div style="flex: 1; padding: 20px; border: 1px solid #eee; border-radius: 8px; background: #fff;">
                                    <h3 style="color: #333; border-bottom: 2px solid #FF6B00; padding-bottom: 10px; margin-top: 0;">Produtividade por Setor</h3>
                                    <p style="font-size: 10px; color: #777; margin-bottom: -15px;">Tarefas concluídas (por setor do responsável)</p>
                                    ${barChart}
                                </div>
                            </div>

                            <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; background: #fff;">
                                <h3 style="color: #333; border-bottom: 2px solid #FF6B00; padding-bottom: 10px; margin-top: 0;">Lista Detalhada de Tarefas</h3>
                                ${tasksTable}
                            </div>
                        </div>
                    `;
                }
                
                element.innerHTML = `
                    <div style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
                        ${generatePDFHeader(title)}
                        
                        <div style="margin-top: 10px;">
                            ${contentHtml}
                        </div>
                        
                        <br/><br/><br/>
                        <div style="text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 15px; margin-top: 40px;">
                            <p style="margin: 2px 0;">&copy; ${new Date().getFullYear()} Focus Tech<sup style="font-size: 7px;">&reg;</sup>. Todos os direitos reservados.</p>
                            <p style="margin: 2px 0;">Documento gerado automaticamente pelo Módulo de Relatórios do FocusHub.</p>
                        </div>
                    </div>
                `;

                const opt = {
                    margin:       0,
                    filename:     `${title.replace(/ /g, '_')}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2 },
                    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                };

                if (saveToDrive) {
                    alert(`Gerando relatório de ${title} para enviar ao Drive...`);
                    html2pdf().set(opt).from(element).toPdf().get('pdf').then(async (pdf: any) => {
                        const pdfBlob = pdf.output('blob');
                        const formData = new FormData();
                        const file = new File([pdfBlob], `${title.replace(/\\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`, { type: 'application/pdf' });
                        formData.append('file', file);
                        formData.append('folderId', 'root');
                        try {
                            await api.post('/drive/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                            alert(`Relatório '${title}' salvo no Google Drive com sucesso!`);
                        } catch (err: any) {
                            console.error("Erro ao salvar no Drive:", err);
                            const msg = err.response?.data?.error || err.message || "Erro desconhecido";
                            alert("Erro ao salvar no Drive: " + msg);
                        }
                    }).catch((err: any) => {
                        console.error("Erro interno no html2pdf:", err);
                        alert("Erro ao gerar arquivo PDF para o Drive.");
                    });
                } else {
                    html2pdf().set(opt).from(element).save();
                }
                
                // Add to history
                const newReportObj = {
                    id: Date.now().toString(),
                    title: title,
                    type: type === 'tasks' ? 'Tarefas' : type === 'team' ? 'Equipe' : type === 'indicators' ? 'Indicadores' : 'Agenda',
                    date: new Date().toISOString().split('T')[0],
                    htmlContent: element.innerHTML
                };
                
                setArchivedReports(prev => {
                    const updated = [newReportObj, ...prev];
                    localStorage.setItem('focus_archived_reports', JSON.stringify(updated));
                    return updated;
                });
            });
        } catch (error) {
            console.error("Erro ao gerar relatório do módulo:", error);
            alert("Erro ao extrair informações do módulo.");
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <header className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-white">Central de Relatórios</h1>
                    <p className="text-[#B3B3B3]">Gere, analise e exporte documentos corporativos.</p>
                </div>
            </header>

            <div className="flex space-x-4 border-b border-[#2E2E2E] pb-2">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'dashboard' ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}
                >
                    Painel Gerencial
                </button>
                <button 
                    onClick={() => setActiveTab('meeting')}
                    className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'meeting' ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}
                >
                    Ata de Reunião
                </button>
                <button 
                    onClick={() => setActiveTab('archive')}
                    className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'archive' ? 'text-[#FF6B00] border-b-2 border-[#FF6B00]' : 'text-[#B3B3B3] hover:text-white'}`}
                >
                    Arquivo
                </button>
            </div>

            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <ReportCard 
                        icon={FileText} 
                        title="Tarefas" 
                        description="Relatórios de produtividade, status de pendências e prazos." 
                        color="bg-blue-500" 
                        onClick={() => handleGenerateModuleReport('tasks', 'Relatório de Tarefas')}
                        onCloudClick={() => handleGenerateModuleReport('tasks', 'Relatório de Tarefas', true)}
                    />
                    <ReportCard 
                        icon={Calendar} 
                        title="Agenda" 
                        description="Extraia eventos do dia, semana ou consolidados mensais." 
                        color="bg-purple-500" 
                        onClick={() => handleGenerateModuleReport('agenda', 'Relatório de Agenda e Eventos')}
                        onCloudClick={() => handleGenerateModuleReport('agenda', 'Relatório de Agenda e Eventos', true)}
                    />
                    <ReportCard 
                        icon={BarChart2} 
                        title="Indicadores" 
                        description="Visão macro e gráficos de desempenho do sistema." 
                        color="bg-green-500" 
                        onClick={() => handleGenerateModuleReport('indicators', 'Relatório de Indicadores')}
                        onCloudClick={() => handleGenerateModuleReport('indicators', 'Relatório de Indicadores', true)}
                    />
                    <ReportCard 
                        icon={Users} 
                        title="Equipe" 
                        description="Atividade dos funcionários e colaboração por departamento." 
                        color="bg-yellow-500" 
                        onClick={() => handleGenerateModuleReport('team', 'Relatório de Equipe')}
                        onCloudClick={() => handleGenerateModuleReport('team', 'Relatório de Equipe', true)}
                    />
                </div>
            )}

            {activeTab === 'archive' && (
                <div className="flex flex-col h-full bg-[#1C1C1C] rounded-2xl p-6 border border-[#2E2E2E]">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold text-white flex items-center"><Folder className="w-6 h-6 mr-2 text-[#FF6B00]" /> Arquivo de Documentos</h2>
                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                            <select 
                                value={filterType} 
                                onChange={(e) => setFilterType(e.target.value)}
                                className="bg-[#0E0E0E] text-white border border-[#2E2E2E] rounded-lg px-4 py-2 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                            >
                                <option value="Todos">Todos os tipos</option>
                                <option value="Tarefas">Tarefas</option>
                                <option value="Agenda">Agenda</option>
                                <option value="Indicadores">Indicadores</option>
                                <option value="Equipe">Equipe</option>
                                <option value="Ata de Reunião">Ata de Reunião</option>
                            </select>
                            <input 
                                type="date" 
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="bg-[#0E0E0E] text-[#B3B3B3] border border-[#2E2E2E] rounded-lg px-4 py-2 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none custom-date-input"
                            />
                            <div className="relative flex-1 lg:w-64 min-w-[200px]">
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Pesquisar relatórios..." 
                                    className="w-full bg-[#0E0E0E] text-white border border-[#2E2E2E] rounded-lg pl-10 pr-4 py-2 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                                />
                                <Search className="absolute left-3 top-2.5 w-5 h-5 text-[#B3B3B3]" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {filteredReports.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <Folder className="w-16 h-16 text-[#2E2E2E] mx-auto mb-4" />
                                <p className="text-[#B3B3B3]">Nenhum relatório arquivado com esses filtros.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredReports.map(report => (
                                    <div key={report.id} onClick={() => setViewingReport(report)} className="flex items-center justify-between p-4 bg-[#2A2A2A] hover:bg-[#333] border border-[#3E3E3E] rounded-xl transition-colors group cursor-pointer">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center mr-4">
                                                <FileText className="w-5 h-5 text-[#FF6B00]" />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-lg group-hover:text-[#FF6B00] transition-colors">{report.title}</h4>
                                                <div className="flex items-center text-sm text-[#B3B3B3] mt-1 space-x-3">
                                                    <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date(report.date).toLocaleDateString('pt-BR')}</span>
                                                    <span className="flex items-center"><BarChart2 className="w-3 h-3 mr-1" /> {report.type}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); setViewingReport(report); }} className="p-2 text-[#B3B3B3] hover:text-white hover:bg-[#444] rounded-lg transition-colors" title="Visualizar Relatório">
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button onClick={(e) => handleDownloadArchive(e, report)} className="p-2 text-[#B3B3B3] hover:text-[#FF6B00] hover:bg-[#444] rounded-lg transition-colors" title="Baixar PDF">
                                                <Download className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'meeting' && (
                <div className="flex flex-col items-center justify-center p-12 bg-[#1C1C1C] rounded-2xl border border-[#2E2E2E] mt-4">
                    <FileSignature className="w-16 h-16 text-[#FF6B00] mb-6" />
                    <h2 className="text-2xl font-bold text-white mb-2">Relatório Inteligente de Reunião</h2>
                    <p className="text-[#B3B3B3] text-center max-w-lg mb-8">
                        Faça o upload de uma transcrição (TXT, DOCX, etc) de uma reunião. Nossa Inteligência Artificial vai analisar o documento e extrair os participantes, objetivos, decisões e próximos passos.
                    </p>
                    
                    <input 
                        type="file" 
                        accept=".txt,.md" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`bg-[#FF6B00] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#e66000] transition-colors flex items-center ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Upload className="w-5 h-5 mr-2" />
                        {isUploading ? 'Analisando via IA...' : 'Upload de Transcrição'}
                    </button>

                    {meetingAnalysis && (
                        <div className="mt-8 bg-[#2A2A2A] p-6 rounded-lg w-full max-w-3xl text-left border border-[#3E3E3E]">
                            <h3 className="text-xl text-white font-bold mb-4 flex justify-between items-center">
                                Resultados da IA
                                <div className="space-x-2 flex items-center">
                                    <button onClick={() => setIsEditingAta(!isEditingAta)} className="text-sm bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white font-semibold">
                                        {isEditingAta ? 'Concluir Edição' : 'Editar Ata'}
                                    </button>
                                    <button onClick={handleCopyToGoogleDocs} className="text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-semibold">
                                        Copiar (Docs)
                                    </button>
                                    <button onClick={handleExportPDF} className="text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white font-semibold">
                                        Baixar PDF
                                    </button>
                                    <button onClick={handleSaveToDrive} disabled={isSavingToDrive} className={`text-sm bg-[#FF6B00] hover:bg-[#e66000] px-4 py-2 rounded text-white font-semibold flex items-center ${isSavingToDrive ? 'opacity-50' : ''}`}>
                                        <Folder className="w-4 h-4 mr-1" />
                                        {isSavingToDrive ? 'Salvando...' : 'Salvar no Drive'}
                                    </button>
                                </div>
                            </h3>
                            <div className="space-y-6 text-gray-300 text-sm mt-6">
                                <div className="border-l-4 border-[#FF6B00] pl-4">
                                    <h4 className="text-white font-bold text-base mb-2">1. Objetivo da Reunião</h4>
                                    {isEditingAta ? (
                                        <textarea className="w-full bg-[#1C1C1C] border border-[#3E3E3E] rounded p-2 text-white h-24" value={meetingAnalysis.objective || ''} onChange={(e) => setMeetingAnalysis({...meetingAnalysis, objective: e.target.value})} />
                                    ) : (
                                        <p>{meetingAnalysis.objective || 'N/A'}</p>
                                    )}
                                </div>
                                <div className="border-l-4 border-[#FF6B00] pl-4">
                                    <h4 className="text-white font-bold text-base mb-2">2. Resumo Executivo</h4>
                                    {isEditingAta ? (
                                        <textarea className="w-full bg-[#1C1C1C] border border-[#3E3E3E] rounded p-2 text-white h-32" value={meetingAnalysis.executiveSummary || ''} onChange={(e) => setMeetingAnalysis({...meetingAnalysis, executiveSummary: e.target.value})} />
                                    ) : (
                                        <p>{meetingAnalysis.executiveSummary || 'N/A'}</p>
                                    )}
                                </div>
                                <div className="border-l-4 border-[#FF6B00] pl-4">
                                    <h4 className="text-white font-bold text-base mb-2">3. Participantes</h4>
                                    {isEditingAta ? (
                                        <div className="space-y-2">
                                            {(meetingAnalysis.participants || []).map((p: any, i: number) => (
                                                <div key={i} className="flex space-x-2">
                                                    <input className="bg-[#1C1C1C] border border-[#3E3E3E] rounded p-1 text-white flex-1" value={p.name || p} placeholder="Nome" onChange={(e) => { const newP = [...meetingAnalysis.participants]; if(typeof newP[i] === 'string') newP[i] = {name: e.target.value}; else newP[i].name = e.target.value; setMeetingAnalysis({...meetingAnalysis, participants: newP}); }} />
                                                    <input className="bg-[#1C1C1C] border border-[#3E3E3E] rounded p-1 text-white flex-1" value={p.role || ''} placeholder="Cargo" onChange={(e) => { const newP = [...meetingAnalysis.participants]; if(typeof newP[i] === 'string') newP[i] = {name: newP[i], role: e.target.value}; else newP[i].role = e.target.value; setMeetingAnalysis({...meetingAnalysis, participants: newP}); }} />
                                                    <input className="bg-[#1C1C1C] border border-[#3E3E3E] rounded p-1 text-white w-24" value={p.status || ''} placeholder="Status" onChange={(e) => { const newP = [...meetingAnalysis.participants]; if(typeof newP[i] === 'string') newP[i] = {name: newP[i], status: e.target.value}; else newP[i].status = e.target.value; setMeetingAnalysis({...meetingAnalysis, participants: newP}); }} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <ul className="list-disc pl-5">
                                            {(meetingAnalysis.participants || []).map((p: any, i: number) => (
                                                <li key={i}>{p.name || p} - <span className="text-gray-400">{p.role || 'N/A'}</span> ({p.status || 'Presente'})</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="border-l-4 border-[#FF6B00] pl-4">
                                    <h4 className="text-white font-bold text-base mb-2">4. Assuntos Discutidos</h4>
                                    {isEditingAta ? (
                                        <div className="space-y-2">
                                            {(meetingAnalysis.topicsDiscussed || []).map((t: any, i: number) => (
                                                <div key={i} className="flex flex-col space-y-1 mb-2 bg-[#1C1C1C] p-2 rounded">
                                                    <input className="bg-[#0E0E0E] border border-[#3E3E3E] rounded p-1 text-white font-bold" value={t.topic || t} placeholder="Tópico" onChange={(e) => { const newT = [...meetingAnalysis.topicsDiscussed]; if(typeof newT[i] === 'string') newT[i] = {topic: e.target.value}; else newT[i].topic = e.target.value; setMeetingAnalysis({...meetingAnalysis, topicsDiscussed: newT}); }} />
                                                    <textarea className="bg-[#0E0E0E] border border-[#3E3E3E] rounded p-1 text-white" value={t.description || ''} placeholder="Descrição" onChange={(e) => { const newT = [...meetingAnalysis.topicsDiscussed]; if(typeof newT[i] === 'string') newT[i] = {topic: newT[i], description: e.target.value}; else newT[i].description = e.target.value; setMeetingAnalysis({...meetingAnalysis, topicsDiscussed: newT}); }} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <ul className="list-disc pl-5">
                                            {(meetingAnalysis.topicsDiscussed || []).map((t: any, i: number) => (
                                                <li key={i}><strong className="text-gray-200">{t.topic || t}:</strong> {t.description || ''}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="border-l-4 border-[#FF6B00] pl-4">
                                    <h4 className="text-white font-bold text-base mb-2">5. Decisões Tomadas</h4>
                                    {isEditingAta ? (
                                        <textarea className="w-full bg-[#1C1C1C] border border-[#3E3E3E] rounded p-2 text-white h-24" value={(meetingAnalysis.decisions || []).join('\n')} onChange={(e) => setMeetingAnalysis({...meetingAnalysis, decisions: e.target.value.split('\n')})} placeholder="Uma decisão por linha..." />
                                    ) : (
                                        <ul className="list-disc pl-5 text-green-400">
                                            {(meetingAnalysis.decisions || []).map((d: string, i: number) => d.trim() ? <li key={i}>{d}</li> : null)}
                                        </ul>
                                    )}
                                </div>
                                <div className="border-l-4 border-[#FF6B00] pl-4">
                                    <h4 className="text-white font-bold text-base mb-2">6. Ações Definidas</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-gray-600">
                                                    <th className="p-2">Ação</th>
                                                    <th className="p-2">Responsável</th>
                                                    <th className="p-2">Prazo</th>
                                                    <th className="p-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(meetingAnalysis.actionItems || []).map((a: any, i: number) => (
                                                    <tr key={i} className="border-b border-gray-800">
                                                        {isEditingAta ? (
                                                            <>
                                                                <td className="p-1"><input className="bg-[#1C1C1C] border border-[#3E3E3E] rounded p-1 w-full text-white" value={a.action || a.task || a} onChange={(e) => { const newA = [...meetingAnalysis.actionItems]; if(typeof newA[i] === 'string') newA[i] = {action: e.target.value}; else { newA[i].action = e.target.value; newA[i].task = e.target.value; } setMeetingAnalysis({...meetingAnalysis, actionItems: newA}); }} /></td>
                                                                <td className="p-1"><input className="bg-[#1C1C1C] border border-[#3E3E3E] rounded p-1 w-full text-yellow-500" value={a.assignee || ''} onChange={(e) => { const newA = [...meetingAnalysis.actionItems]; if(typeof newA[i] === 'string') newA[i] = {action: newA[i], assignee: e.target.value}; else newA[i].assignee = e.target.value; setMeetingAnalysis({...meetingAnalysis, actionItems: newA}); }} /></td>
                                                                <td className="p-1"><input className="bg-[#1C1C1C] border border-[#3E3E3E] rounded p-1 w-full text-white" value={a.deadline || ''} onChange={(e) => { const newA = [...meetingAnalysis.actionItems]; if(typeof newA[i] === 'string') newA[i] = {action: newA[i], deadline: e.target.value}; else newA[i].deadline = e.target.value; setMeetingAnalysis({...meetingAnalysis, actionItems: newA}); }} /></td>
                                                                <td className="p-1"><input className="bg-[#1C1C1C] border border-[#3E3E3E] rounded p-1 w-full text-white" value={a.status || ''} onChange={(e) => { const newA = [...meetingAnalysis.actionItems]; if(typeof newA[i] === 'string') newA[i] = {action: newA[i], status: e.target.value}; else newA[i].status = e.target.value; setMeetingAnalysis({...meetingAnalysis, actionItems: newA}); }} /></td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="p-2">{a.action || a.task || a}</td>
                                                                <td className="p-2 text-yellow-500">{a.assignee || 'N/A'}</td>
                                                                <td className="p-2">{a.deadline || 'A definir'}</td>
                                                                <td className="p-2">{a.status || 'Pendente'}</td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="border-l-4 border-[#FF6B00] pl-4">
                                    <h4 className="text-white font-bold text-base mb-2">7. Próximos Passos</h4>
                                    {isEditingAta ? (
                                        <textarea className="w-full bg-[#1C1C1C] border border-[#3E3E3E] rounded p-2 text-white h-24" value={(meetingAnalysis.nextSteps || []).join('\n')} onChange={(e) => setMeetingAnalysis({...meetingAnalysis, nextSteps: e.target.value.split('\n')})} placeholder="Um passo por linha..." />
                                    ) : (
                                        <ol className="list-decimal pl-5">
                                            {(meetingAnalysis.nextSteps || []).map((s: string, i: number) => s.trim() ? <li key={i}>{s}</li> : null)}
                                        </ol>
                                    )}
                                </div>
                                <div className="border-l-4 border-red-600 pl-4">
                                    <h4 className="text-red-400 font-bold text-base mb-2">8. Pontos de Atenção</h4>
                                    {isEditingAta ? (
                                        <textarea className="w-full bg-[#1C1C1C] border border-[#3E3E3E] rounded p-2 text-white h-24" value={(meetingAnalysis.attentionPoints || meetingAnalysis.criticalPoints || []).join('\n')} onChange={(e) => setMeetingAnalysis({...meetingAnalysis, attentionPoints: e.target.value.split('\n')})} placeholder="Um ponto por linha..." />
                                    ) : (
                                        <ul className="list-disc pl-5 text-red-300">
                                            {(meetingAnalysis.attentionPoints || meetingAnalysis.criticalPoints || []).map((c: string, i: number) => c.trim() ? <li key={i}>{c}</li> : null)}
                                        </ul>
                                    )}
                                </div>
                                <div className="border-l-4 border-[#FF6B00] pl-4">
                                    <h4 className="text-white font-bold text-base mb-2">9. Observações Gerais</h4>
                                    {isEditingAta ? (
                                        <textarea className="w-full bg-[#1C1C1C] border border-[#3E3E3E] rounded p-2 text-white h-24" value={meetingAnalysis.generalObservations || ''} onChange={(e) => setMeetingAnalysis({...meetingAnalysis, generalObservations: e.target.value})} />
                                    ) : (
                                        <p>{meetingAnalysis.generalObservations || 'Nenhuma observação adicional.'}</p>
                                    )}
                                </div>
                                <div className="border-l-4 border-[#FF6B00] pl-4">
                                    <h4 className="text-white font-bold text-base mb-2">10. Conclusão</h4>
                                    {isEditingAta ? (
                                        <textarea className="w-full bg-[#1C1C1C] border border-[#3E3E3E] rounded p-2 text-white h-24" value={meetingAnalysis.conclusion || ''} onChange={(e) => setMeetingAnalysis({...meetingAnalysis, conclusion: e.target.value})} />
                                    ) : (
                                        <p>{meetingAnalysis.conclusion || 'Reunião encerrada com sucesso.'}</p>
                                    )}
                                </div>
                                {meetingAnalysis.transcriptUrl && (
                                    <div className="border-l-4 border-blue-500 pl-4">
                                        <h4 className="text-blue-400 font-bold text-base mb-2">Documento Original</h4>
                                        <a href={meetingAnalysis.transcriptUrl} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200 underline">
                                            📄 Baixar transcrição original
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {viewingReport && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col relative overflow-hidden">
                        <div className="bg-[#1C1C1C] text-white p-4 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-lg">{viewingReport.title}</h3>
                            <div className="flex space-x-2">
                                <button onClick={(e) => handleDownloadArchive(e, viewingReport)} className="bg-[#FF6B00] hover:bg-[#e66000] px-4 py-2 rounded text-sm font-bold transition-colors">
                                    Baixar PDF
                                </button>
                                <button onClick={() => setViewingReport(null)} className="bg-[#333] hover:bg-[#444] px-4 py-2 rounded text-sm font-bold transition-colors">
                                    Fechar
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div dangerouslySetInnerHTML={{ __html: viewingReport.htmlContent }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsScreen;
