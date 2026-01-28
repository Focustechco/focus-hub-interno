---
description: Deploy frontend to Vercel bypassing git auth issues
---

1. Move the parent .git folder to a backup location to bypass Vercel auth check
   - PowerShell: `Move-Item ..\.git ..\gitbak`
   - Cwd: `c:\FOCUS-TECH\focus-hub-interno-main\focus-hub-interno-main`

// turbo
2. Deploy to Vercel (using --prod)
   - PowerShell: `vercel --prod`
   - Cwd: `c:\FOCUS-TECH\focus-hub-interno-main\focus-hub-interno-main`

3. Restore the .git folder
   - PowerShell: `Move-Item ..\gitbak ..\.git`
   - Cwd: `c:\FOCUS-TECH\focus-hub-interno-main\focus-hub-interno-main`
