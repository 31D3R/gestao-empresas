/**
 * Instagram (API com login do Instagram, igual ao site Prateleiras de Aço).
 * Variáveis: IG_APP_ID, IG_APP_SECRET. URL de retorno a cadastrar no app da Meta:
 *   {APP_URL}/api/instagram/retorno
 * Escopos: instagram_business_basic, instagram_business_content_publish.
 */
import { db } from "@/lib/db";
import { cifrar, decifrar } from "@/lib/cripto";

const GRAPH = "https://graph.instagram.com/v21.0";

export function instagramConfigurado() {
  return Boolean(process.env.IG_APP_ID && process.env.IG_APP_SECRET);
}

export function urlApp() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export const urlRetorno = () => `${urlApp()}/api/instagram/retorno`;

export function urlAutorizar(state: string) {
  const q = new URLSearchParams({
    client_id: process.env.IG_APP_ID!,
    redirect_uri: urlRetorno(),
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_content_publish",
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${q}`;
}

async function json(r: Response) {
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error?.message || j.error_message || `Instagram HTTP ${r.status}`);
  return j;
}

/** Troca o código por token de longa duração (60 dias) e grava a conta. */
export async function conectar(empresaId: string, code: string) {
  const curto = await json(await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.IG_APP_ID!,
      client_secret: process.env.IG_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: urlRetorno(),
      code,
    }),
  }));
  const longo = await json(await fetch(`https://graph.instagram.com/access_token?${new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: process.env.IG_APP_SECRET!,
    access_token: curto.access_token,
  })}`));
  const eu = await json(await fetch(`${GRAPH}/me?fields=user_id,username&access_token=${longo.access_token}`));
  const dados = {
    igUserId: String(eu.user_id || curto.user_id),
    usuario: eu.username ?? null,
    tokenCifrado: cifrar(longo.access_token),
    tokenExpiraEm: new Date(Date.now() + (longo.expires_in ?? 5184000) * 1000),
    conectadoEm: new Date(),
  };
  await db.contaInstagram.upsert({ where: { empresaId }, create: { empresaId, ...dados }, update: dados });
  if (eu.username) await db.empresa.update({ where: { id: empresaId }, data: { instagram: `@${eu.username}` } });
}

/** Renova o token quando faltam menos de 10 dias. */
async function tokenValido(empresaId: string) {
  const c = await db.contaInstagram.findUnique({ where: { empresaId } });
  if (!c) throw new Error("Instagram não conectado para esta empresa.");
  let token = decifrar(c.tokenCifrado);
  if (c.tokenExpiraEm && c.tokenExpiraEm.getTime() - Date.now() < 10 * 86400000) {
    const n = await json(await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`));
    token = n.access_token;
    await db.contaInstagram.update({
      where: { empresaId },
      data: { tokenCifrado: cifrar(token), tokenExpiraEm: new Date(Date.now() + (n.expires_in ?? 5184000) * 1000) },
    });
  }
  return { token, igUserId: c.igUserId };
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Publica uma imagem com legenda. A imagem precisa estar numa URL pública (JPEG). */
export async function publicarImagem(empresaId: string, imagemUrl: string, legenda: string) {
  const { token, igUserId } = await tokenValido(empresaId);
  const cont = await json(await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    body: new URLSearchParams({ image_url: imagemUrl, caption: legenda, access_token: token }),
  }));
  for (let i = 0; i < 10; i++) {
    const st = await json(await fetch(`${GRAPH}/${cont.id}?fields=status_code&access_token=${token}`));
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("Instagram recusou a imagem (use JPEG até 8 MB, proporção entre 4:5 e 1.91:1).");
    await esperar(2000);
  }
  const pub = await json(await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: cont.id, access_token: token }),
  }));
  return String(pub.id);
}
