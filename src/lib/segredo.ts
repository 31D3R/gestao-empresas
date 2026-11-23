// Usa AUTH_SECRET; na Vercel com Supabase, cai para SUPABASE_JWT_SECRET (já vem da integração).
export function segredoSessao() {
  const s = process.env.AUTH_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("Defina AUTH_SECRET");
  return new TextEncoder().encode(s || "dev-apenas-local");
}
