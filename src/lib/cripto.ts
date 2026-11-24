import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/** Chave derivada do segredo do sistema (AUTH_SECRET ou DATABASE_URL). */
function chave() {
  const base = process.env.AUTH_SECRET || `sessao:${process.env.DATABASE_URL ?? "dev"}`;
  return createHash("sha256").update(`cripto:${base}`).digest();
}

/** Cifra textos sensíveis (tokens) antes de gravar no banco. */
export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dado = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dado].map((b) => b.toString("base64url")).join(".");
}

export function decifrar(cifrado: string) {
  const [iv, tag, dado] = cifrado.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dado), d.final()]).toString("utf8");
}
