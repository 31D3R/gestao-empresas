import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Perfil } from "@prisma/client";
import { segredoSessao } from "./segredo";

const COOKIE = "sessao";
const segredo = segredoSessao;

export interface Sessao {
  id: string;
  nome: string;
  perfil: Perfil;
  socioId?: string | null;
}

export async function criarSessao(s: Sessao) {
  const token = await new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(segredo());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function lerToken(token?: string): Promise<Sessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    return payload as unknown as Sessao;
  } catch {
    return null;
  }
}

export async function sessaoAtual() {
  return lerToken((await cookies()).get(COOKIE)?.value);
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

/** Exige login e, opcionalmente, um dos perfis. */
export async function exigir(...perfis: Perfil[]): Promise<Sessao> {
  const s = await sessaoAtual();
  if (!s) redirect("/login");
  if (perfis.length && !perfis.includes(s.perfil)) redirect(s.perfil === "SOCIO" ? "/relatorios" : "/");
  return s;
}

export const EQUIPE: Perfil[] = ["ADMIN", "CONTADOR", "MARKETING"];
export const COOKIE_SESSAO = COOKIE;
