# Gestão de Empresas

Sistema web (instalável no celular como app) para gestão de empresas e sócios: cadastro pela consulta de CNPJ, sócios com consulta de nome limpo (LGPD), certidões, financeiro por CNPJ e relatórios para o sócio.

## Rodar localmente
```bash
cp .env.example .env   # ajuste DATABASE_URL e AUTH_SECRET
npm install
npx prisma migrate deploy
npm run db:seed        # cria admin@empresa.com / trocar123
npm run dev
```

## Publicar sem custo (teste)
1. **Supabase** (supabase.com, plano Free): crie um projeto e copie a connection string (Settings > Database > Connection string, modo "Session").
2. **Vercel** (vercel.com, plano Hobby): importe este repositório e defina as variáveis `DATABASE_URL`, `AUTH_SECRET`, `CNPJ_PROVIDER=brasilapi`, `CREDITO_PROVIDER=mock`.
3. Rode `npx prisma migrate deploy` e `npm run db:seed` apontando para o banco do Supabase.

## Consultas (provedores plugáveis)
Ficam em `src/lib/consultas`. Cada consulta é registrada com provedor e custo (tela "Consultas e custos").
- CNPJ: `brasilapi` (gratuito) ou `mock`.
- Crédito CPF: `mock` até contratar Serasa/Boa Vista/BigDataCorp. Só roda com consentimento LGPD registrado.

## Perfis
ADMIN, CONTADOR, MARKETING (equipe) e SOCIO (somente relatórios das próprias empresas).
