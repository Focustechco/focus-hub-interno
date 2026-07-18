const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

// Ensure GEMINI_API_KEY is configured in .env
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Apply authentication middleware
router.use(authMiddleware);

// GET /api/reports - List saved reports
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, title, type, author_id, department, is_favorite, created_at FROM reports ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// GET /api/reports/:id - Get a specific report
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Relatório não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// POST /api/reports - Save a new report
router.post('/', async (req, res, next) => {
    try {
        const { id, title, type, content, department, metadata } = req.body;
        const author_id = req.user.id;
        
        await pool.query(
            `INSERT INTO reports (id, title, type, content, author_id, department, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id || `req-${Date.now()}`, title, type, content, author_id, department, metadata]
        );
        
        res.status(201).json({ message: 'Relatório salvo com sucesso.' });
    } catch (error) {
        next(error);
    }
});

// POST /api/reports/meeting/upload - Upload transcript for AI processing
router.post('/meeting/upload', upload.single('transcript'), async (req, res, next) => {
    try {
        if (!ai) {
            return res.status(500).json({ message: 'A Chave da API do Gemini não está configurada no backend.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
        }

        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        console.log(`[Upload] File content length: ${fileContent.length} chars. Path: ${req.file.path}`);
        
        if (!fileContent.trim()) {
            return res.status(400).json({ message: 'O arquivo enviado está vazio ou não pôde ser lido corretamente. Por favor, envie um arquivo .txt com a transcrição.' });
        }
        
        // Save to storage folder
        const storageDir = path.join(__dirname, '../storage/transcripts');
        if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
        
        const newFilename = `${Date.now()}-${req.file.originalname}`;
        const newPath = path.join(storageDir, newFilename);
        fs.renameSync(req.file.path, newPath);

        const transcriptUrl = `${req.protocol}://${req.get('host')}/storage/transcripts/${newFilename}`;

        const prompt = `
# MASTER PROMPT — GERAÇÃO AUTOMÁTICA DE ATA DE REUNIÃO (FOCUSHUB)

Você é um assistente corporativo especializado em documentação executiva.
Sua missão é transformar automaticamente a transcrição de reunião enviada abaixo em uma **Ata de Reunião profissional**.
O objetivo é gerar um documento claro, executivo e padronizado, sem copiar literalmente toda a transcrição. A IA deve interpretar o conteúdo, identificar os pontos relevantes e organizá-los em uma ata objetiva.

# REGRAS DA IA
Você nunca deverá copiar integralmente a transcrição.
Você deverá:
- resumir;
- reorganizar;
- remover repetições;
- eliminar conversas paralelas;
- destacar decisões importantes;
- destacar responsáveis;
- identificar prazos;
- produzir linguagem profissional.

# FORMATO DE SAÍDA (Obrigatório)
Retorne APENAS um objeto JSON válido (sem marcação de bloco de código) com o seguinte formato exato, extraindo as informações exigidas nas 10 seções estruturais da ata:

{
  "title": "Título sugerido para a reunião",
  "date": "Data da reunião no formato DD/MM/AAAA (Identificar a data em que ocorreu. Se não encontrar, retorne 'Data não identificada')",
  "time": "Horário da reunião (Identificar o horário em que ocorreu. Se não encontrar, retorne 'Horário não identificado')",
  "department": "Departamento inferido (ou Geral)",
  "project": "Projeto inferido (ou N/A)",
  "objective": "Objetivo da Reunião (Identificar automaticamente o propósito principal da reunião e descrevê-lo em um ou dois parágrafos.)",
  "executiveSummary": "Resumo Executivo (Gerar um resumo objetivo contendo apenas os principais assuntos tratados. 5 a 10 linhas.)",
  "participants": [
    { "name": "Nome", "role": "Cargo (ou N/A)", "status": "Participação (Presente/Ausente)" }
  ],
  "topicsDiscussed": [
    { "topic": "Nome do tópico", "description": "Breve explicação do assunto" }
  ],
  "decisions": ["Decisão tomada 1", "Decisão tomada 2"],
  "actionItems": [
    { "action": "Descrição da ação", "assignee": "Responsável", "deadline": "Prazo (ou 'A definir')", "status": "Pendente" }
  ],
  "nextSteps": ["Próximo passo 1", "Próximo passo 2"],
  "attentionPoints": ["Riscos, pendências, dependências, bloqueios, decisões pendentes ou informações críticas"],
  "generalObservations": "Observações Gerais (Qualquer informação relevante que não tenha sido incluída nas seções anteriores.)",
  "conclusion": "Conclusão (Pequeno encerramento resumindo o resultado da reunião.)"
}

Transcrição:
${fileContent.substring(0, 30000)}
        `;

        let response;
        let retries = 0;
        const maxRetries = 6;
        
        while (retries < maxRetries) {
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-3.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                    }
                });
                break;
            } catch (err) {
                const isRateLimit = err.status === 429 || err.status === 503 || err.status === 500 || (err.message && (err.message.includes('429') || err.message.includes('503') || err.message.includes('500')));
                if (isRateLimit && retries < maxRetries - 1) {
                    retries++;
                    
                    // Parse exact requested wait time from Google's error message, default to 15s if not found
                    let waitTimeMs = 15000;
                    const match = err.message ? err.message.match(/retry in ([\d\.]+)s/i) : null;
                    if (match && match[1]) {
                        waitTimeMs = Math.ceil(parseFloat(match[1]) * 1000) + 1500; // Add 1.5s buffer
                    } else {
                        waitTimeMs = (retries * 6000) + (Math.random() * 3000);
                    }
                    
                    console.log(`[Rate Limit] Gemini API rate limit hit. Google requested wait. Retrying in ${Math.round(waitTimeMs)}ms (Attempt ${retries}/${maxRetries - 1})...`);
                    await new Promise(resolve => setTimeout(resolve, waitTimeMs));
                } else {
                    throw err;
                }
            }
        }

        const analysisText = response.text;
        // Strip markdown blocks if present
        const cleanText = analysisText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        const analysis = JSON.parse(cleanText);
        
        // Add the link to the original document
        analysis.transcriptUrl = transcriptUrl;
        
        res.json(analysis);

    } catch (error) {
        console.error('Error processing transcript:', error);
        res.status(500).json({ message: 'Erro da IA: ' + error.message });
    }
});

// POST /api/reports/export/doc - Export HTML content to DOC
router.post('/export/doc', async (req, res, next) => {
    try {
        const { htmlContent, title } = req.body;
        
        if (!htmlContent) {
            return res.status(400).json({ message: 'Conteúdo HTML é obrigatório.' });
        }

        const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const postHtml = "</body></html>";
        const html = preHtml + htmlContent + postHtml;

        res.set({
            'Content-Type': 'application/vnd.ms-word',
            'Content-Disposition': `attachment; filename="${title || 'relatorio'}.doc"`,
        });

        res.send(html);
    } catch (error) {
        console.error('Error generating DOC:', error);
        res.status(500).json({ message: 'Erro ao gerar arquivo DOC.' });
    }
});

// GET /api/reports/dashboard/stats - Get aggregated stats for the dashboard
router.get('/dashboard/stats', async (req, res, next) => {
    try {
        const tasksResult = await pool.query('SELECT status, COUNT(*) FROM tasks GROUP BY status');
        const tasksCount = tasksResult.rows.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), {});
        
        res.json({
            tasks: tasksCount,
            totalTasks: Object.values(tasksCount).reduce((a, b) => a + b, 0)
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/reports/generate/:type - Extract raw data for reports
router.get('/generate/:type', async (req, res, next) => {
    try {
        const { type } = req.params;
        const { start, end } = req.query;
        let data;

        if (type === 'tasks') {
            let query = `
                SELECT t.id, t.title, t.status, t.priority, t.due_date, u.name as assignee_name
                FROM tasks t
                LEFT JOIN users u ON t.assignee_id = u.id
                WHERE 1=1
            `;
            let params = [];
            let pIdx = 1;
            if (start) { query += ` AND t.created_at >= $${pIdx++}`; params.push(start); }
            if (end) { query += ` AND t.created_at <= $${pIdx++}`; params.push(end + ' 23:59:59'); }
            query += ` ORDER BY t.created_at DESC`;
            const result = await pool.query(query, params);
            data = result.rows;
        } else if (type === 'team') {
            const usersResult = await pool.query('SELECT id, name, email, sector, role FROM users ORDER BY name');
            const teamMembers = usersResult.rows;
            
            let query = `
                SELECT u.name as user_name, u.sector, c.timestamp as check_in_time, c.check_out_time, c.daily_report
                FROM check_ins c
                JOIN users u ON c.user_id = u.id
                WHERE 1=1
            `;
            let params = [];
            let pIdx = 1;
            if (start) { query += ` AND c.timestamp >= $${pIdx++}`; params.push(start); }
            if (end) { query += ` AND c.timestamp <= $${pIdx++}`; params.push(end + ' 23:59:59'); }
            query += ` ORDER BY c.timestamp DESC LIMIT 50`;
            const activityResult = await pool.query(query, params);
            const recentActivity = activityResult.rows;
            
            data = { teamMembers, recentActivity };
        } else if (type === 'agenda') {
            try {
                let query = `
                    SELECT 
                        id, 
                        title, 
                        description, 
                        start_time as due_date, 
                        'Agendado' as status, 
                        organizer_name as assignee_name
                    FROM google_calendar_events
                    WHERE start_time IS NOT NULL
                `;
                let params = [];
                let pIdx = 1;
                if (start) { query += ` AND start_time >= $${pIdx++}`; params.push(start); }
                if (end) { query += ` AND start_time <= $${pIdx++}`; params.push(end + ' 23:59:59'); }
                query += ` ORDER BY start_time ASC`;
                const result = await pool.query(query, params);
                data = result.rows;
            } catch(e) {
                console.error("Error fetching agenda for report:", e);
                data = [];
            }
        } else if (type === 'indicators') {
            let filterString = '';
            let params = [];
            let pIdx = 1;
            if (start) { filterString += ` AND t.created_at >= $${pIdx++}`; params.push(start); }
            if (end) { filterString += ` AND t.created_at <= $${pIdx++}`; params.push(end + ' 23:59:59'); }

            const tasksResult = await pool.query(`SELECT t.status, COUNT(*) FROM tasks t WHERE 1=1 ${filterString} GROUP BY t.status`, params);
            const tasksCount = tasksResult.rows.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), {});
            
            // Get completed tasks by sector
            const sectorResult = await pool.query(`
                SELECT u.sector, COUNT(t.id) as count
                FROM tasks t
                JOIN users u ON t.assignee_id = u.id
                WHERE t.status = 'concluida' AND u.sector IS NOT NULL ${filterString}
                GROUP BY u.sector
            `, params);
            const sectorCount = sectorResult.rows.reduce((acc, row) => ({ ...acc, [row.sector]: parseInt(row.count) }), {});
            
            // Get list of tasks for the table
            const tasksListResult = await pool.query(`
                SELECT t.id, t.title, t.status, t.priority, t.due_date, u.name as assignee_name
                FROM tasks t
                LEFT JOIN users u ON t.assignee_id = u.id
                WHERE 1=1 ${filterString}
                ORDER BY t.created_at DESC
            `, params);
            const tasksList = tasksListResult.rows;
            
            data = { tasksCount, sectorCount, tasksList };
        } else {
            return res.status(400).json({ message: 'Tipo de relatório inválido' });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({ message: 'Erro ao gerar dados do relatório.' });
    }
});

module.exports = router;
