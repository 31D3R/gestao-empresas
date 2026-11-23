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
1. Crie o repositório no GitHub e envie o código.
2. **Vercel** (plano Hobby): importe o repositório e adicione o banco **Prisma Postgres** (gratuito) nas integrações; ele cria `DATABASE_URL`. Opcional: `AUTH_SECRET` (sem ele, a sessão usa um segredo derivado da `DATABASE_URL`).
3. O build (`vercel-build`) aplica as migrações. No primeiro acesso, a tela de login pede para criar o administrador.

## Consultas (provedores plugáveis)
Ficam em `src/lib/consultas`. Cada consulta é registrada com provedor e custo (tela "Consultas e custos").
- CNPJ: `brasilapi` (gratuito) ou `mock`.
- Crédito CPF: `mock` até contratar Serasa/Boa Vista/BigDataCorp. Só roda com consentimento LGPD registrado.

## Perfis
ADMIN, CONTADOR, MARKETING (equipe) e SOCIO (somente relatórios das próprias empresas).
