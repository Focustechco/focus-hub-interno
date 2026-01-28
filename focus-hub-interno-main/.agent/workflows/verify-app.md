---
description: How to verify Focus Hub application and manage changes
---

# Focus Hub - Application Verification & Change Management

## Pre-Change Verification

Before making any changes, always:

1. **Verify git status is clean**
```bash
git status
```
If `.git` folder is named `.git-bak`, restore it:
```powershell
Rename-Item -Path ".git-bak" -NewName ".git"
```

2. **Check application is running correctly**
- Open the deployed app (focus-hub-interno.vercel.app)
- Verify Dashboard loads with all sections:
  - Próximos Eventos
  - Status do Ponto
  - Último Post do Mural
  - Minhas Tarefas do Dia (with progress bar)
  - Minhas Tarefas Pendentes
  - Resumo do Dia (4 cards at bottom)

3. **Pull latest changes**
```bash
git pull origin main
```

## Safe Change Process

1. **Create a backup branch before major changes**
```bash
git checkout -b backup-YYYY-MM-DD
git checkout main
```

2. **Make small, incremental changes**
- Commit after each logical unit of work
- Test locally after each change if possible

3. **Verify build locally before pushing**
```bash
npm run build
```
// turbo

4. **Push and verify Vercel deployment**
```bash
git add -A
git commit -m "description of change"
git push origin main
```

## Post-Change Verification

After pushing, wait for Vercel build and check:

1. **Build Status**: Check Vercel dashboard or wait for build notification
2. **Visual Inspection**: 
   - Dashboard loads correctly
   - All cards have proper styling (borders, colors)
   - Text is visible in dropdowns and inputs
   - Sidebar navigation is highlighted correctly
3. **Functional Check**:
   - Can create/edit tasks
   - Can register check-in/check-out
   - Can view checklist

## Rollback Procedure

If something breaks:

1. **Find last working commit**
```bash
git log --oneline -10
```

2. **Revert to working state**
```bash
git reset --hard <commit-hash>
git push --force origin main
```

## Common Issues & Solutions

### 1. Import Path Errors
Files in `src/utils/` must be imported as `./src/utils/file` from root components.

### 2. CSS Variables Not Working
Semantic Tailwind classes like `text-text` require:
- Proper CSS variables in `index.css`
- Proper `tailwind.config.js` color definitions
Use hardcoded colors (`text-white`, `bg-[#1C1C1C]`) as fallback.

### 3. Git Repository Not Found
If `.git` became `.git-bak`:
```powershell
Rename-Item -Path ".git-bak" -NewName ".git"
```

## Pending Features (Not Yet Implemented)

- [ ] Admin Checklist Management (view/assign tasks to any user)
- [ ] Bar Chart with all 5 sectors
- [ ] Check-in timezone fix (backend needs `toISOString()` conversion)
- [ ] Light mode full support
