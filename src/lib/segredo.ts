// Segredo das sessões: AUTH_SECRET, ou derivado da DATABASE_URL (que já é secreta) quando não definido.
export function segredoSessao() {
  const s = process.env.AUTH_SECRET || (process.env.DATABASE_URL ? `sessao:${process.env.DATABASE_URL}` : "");
  if (!s && process.env.NODE_ENV === "production") throw new Error("Defina AUTH_SECRET ou DATABASE_URL");
  return new TextEncoder().encode(s || "dev-apenas-local");
}
