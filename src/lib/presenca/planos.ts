/** Planos anuais da hospedagem Mídia Certa (mesmos da loja painel.midiacerta.com.br). */
export const PLANOS = {
  ECONOMICO: { nome: "Econômico", anual: 119.88, mensal: 9.99, espacoMB: 300, emails: 1, desc: "Site simples e um e-mail profissional." },
  INTERMEDIARIO: { nome: "Intermediário", anual: 359.88, mensal: 29.99, espacoMB: 1024, emails: 5, desc: "Site completo e e-mails para a equipe." },
  PLENO: { nome: "Pleno", anual: 599.88, mensal: 49.99, espacoMB: 5120, emails: 15, desc: "Espaço de sobra para site, loja e muitos e-mails." },
} as const;
export type CodigoPlano = keyof typeof PLANOS;

/** Registro .br no Registro.br: R$ 40/ano. */
export const PRECO_DOMINIO_BR = Number(process.env.PRECO_DOMINIO_BR || 40);
/** Site com IA (1 ano de ajustes). Definir SITE_IA_PRECO na Vercel; 0 = sem cobrança. */
export const PRECO_SITE_IA = Number(process.env.SITE_IA_PRECO || 0);

export const plano = (c?: string | null) => (c && c in PLANOS ? PLANOS[c as CodigoPlano] : null);
export const espacoTexto = (mb: number) => (mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`);
