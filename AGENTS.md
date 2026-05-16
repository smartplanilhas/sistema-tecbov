<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Gesmart — Fluxo de Deploy

## Branches
- `master` → produção (Vercel production)
- `develop` → staging (Vercel preview)

## Desenvolvimento e testes
```bash
git checkout develop
git add .
git commit -m "descrição da mudança"
git push origin develop    # deploy automático no staging
```

## Subir para produção (após validar no staging)
```bash
git checkout master
git merge develop
git push origin master     # deploy automático em produção
git checkout develop       # volta para develop
```

## Banco de dados
Por enquanto staging e produção compartilham o mesmo Supabase. Quando separado, as variáveis de ambiente serão configuradas por ambiente na Vercel (Settings → Environment Variables).
