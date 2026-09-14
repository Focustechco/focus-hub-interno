# Focus Hub Backend

## Deploy no Render.com

Este backend está configurado para deploy no Render.

### Configuração

**Build Command:** `npm install`

**Start Command:** `npm start`

### Variáveis de Ambiente (configurar no Render Dashboard)

```
PORT=5000
DB_HOST=<sua-database.neon.tech>
DB_NAME=focus_hub
DB_USER=<seu-usuario>
DB_PASSWORD=<sua-senha>
DB_PORT=5432
JWT_SECRET=<gerar-chave-segura-32-chars-minimo>
ALLOWED_ORIGINS=https://focus-hub.vercel.app
```

### Health Check Path

`/api/health`
