# Focus Hub - Documentação Completa 2.0

**Versão:** 2.0.1
**Data:** 25/12/2024
**Status:** Produção

---

## 1. Visão Geral do Sistema

O **Focus Hub** é uma plataforma centralizada para gestão de operações diárias, tarefas, metas e comunicação de equipe. O sistema foi desenvolvido com foco em performance, offline-first e experiência do usuário.

### Stack Tecnológica
- **Frontend:** React 19, TypeScript, Vite, TailwindCSS
- **Backend:** Node.js, Express, PostgreSQL (Neon DB)
- **Infraestrutura:** Vercel (Frontend), Render (Backend)
- **Estado/Cache:** localStorage, IndexedDB (Offline)
- **Testes:** Vitest, React Testing Library

---

## 2. Funcionalidades Implementadas

### Core
- **Autenticação:** Login, Recuperação de Senha, Gestão de Sessão (JWT)
- **Tarefas:** CRUD completo, Kanban/Lista/Calendário, Comentários, Tags
- **Metas:** Rastreamento de objetivos, progresso visual
- **Check-in:** Registro de ponto, status online/offline
- **Mural:** Feed de notícias e avisos da equipe

### Melhorias Recentes (Meta Planning)
1.  **UX/UI:**
    - Dark/Light Mode Real (Toggle no header)
    - Toast Notifications (feedback visual para todas ações)
    - Loading Spinners & Skeletons (feedback de carregamento)
    - PWA (Instalável, Service Worker, Ícones)

2.  **Performance & Offline:**
    - Lazy Loading de rotas (Tasks, Admin, Goals)
    - Cache Offline (IndexedDB) para tarefas e dados críticos
    - Sincronização Automática quando online
    - Hooks de performance (`useDebounce`, `useMemo`)

3.  **Admin & Segurança:**
    - Dashboard de Métricas Administrativas
    - Logs de Auditoria (quem fez o que e quando)
    - Sistema de Permissões Granular (RBAC)
    - Backup Automático e Exportação JSON/CSV

4.  **Integrações:**
    - Google Calendar (Exportação .ics)
    - Push Notifications (Web Push API)
    - Webhooks (Slack/Discord ready)

---

## 3. Arquitetura de Código

### Estrutura de Diretórios
```
/backend
  ├── server.js           # API Gateway & Logic
  ├── migrate.js          # Auto-migrations
  └── openapi.yaml        # Documentação API
/src
  ├── components/         # UI Reutilizável (Button, Card, Inputs)
  ├── contexts/           # Estado Global (Auth, Theme)
  ├── hooks/              # Lógica Reutilizável (useAuth, useLocalStorage)
  ├── screens/            # Páginas da Aplicação
  ├── services/           # Comunicação API (Axios instance)
  ├── utils/              # Helpers (Formatters, Validators, Sync)
  └── test/               # Configuração e Utilitários de Teste
```

### Utilitários Chave (`src/utils/`)
- **api.ts:** Cliente HTTP com retry automático e interceptors.
- **offlineCache.ts:** Gerenciador do IndexedDB e Fila de Sincronização.
- **onlineSync.ts:** Detecta conexão e processa a fila offline.
- **permissions.ts:** Validação centralizada de permissões por cargo.
- **calendar.ts:** Geração de arquivos .ics e links do Google Calendar.

---

## 4. Guia de Desenvolvimento

### Rodando Localmente
1. **Frontend:** `npm run dev` (Porta 5173)
2. **Backend:** `node backend/server.js` (Porta 5000)
3. **Testes:** `npm test` (Vitest)

### Adicionando Novas Features
1. Crie os tipos em `types.ts`
2. Implemente a UI em `components/` ou `screens/`
3. Adicione a rota no backend se necessário
4. Atualize o `offlineCache` se for dados críticos

---

## 5. API Reference (Resumo)

Consulte `backend/openapi.yaml` para detalhes completos.

- `POST /auth/login`: Autenticação
- `GET /tasks`: Listar tarefas
- `POST /tasks`: Criar tarefa (sincroniza se offline)
- `GET /admin/metrics`: Dados para dashboard

---

**Mantenha este documento atualizado a cada major release.**
