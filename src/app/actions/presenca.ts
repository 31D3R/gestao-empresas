"use server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { exigir } from "@/lib/auth";
import { segredoSessao } from "@/lib/segredo";
import { deLocal } from "@/lib/datas";
import { dominioLivre, dominioValido, normalizarDominio, registrador } from "@/lib/presenca/dominios";
import * as cpanel from "@/lib/presenca/cpanel";
import { instagramConfigurado, urlAutorizar } from "@/lib/presenca/instagram";
import { gerarPosts, lerSite } from "@/lib/presenca/ia";
import { rodarFila } from "@/lib/presenca/fila";

const MKT = ["ADMIN", "MARKETING"] as const;
export type Estado = { ok?: boolean; erro?: string; msg?: string; senha?: string; livre?: boolean | null; dominio?: string; link?: string } | null;

const caminho = (empresaId: string) => `/empresas/${empresaId}/presenca`;
const erroDe = (e: unknown) => (e as Error).message || "Erro inesperado";

// ---------- Domínio e hospedagem ----------

export async function verificarDominio(_: Estado, form: FormData): Promise<Estado> {
  await exigir(...MKT);
  const d = normalizarDominio(String(form.get("dominio") || ""));
  if (!dominioValido(d)) return { erro: "Domínio inválido. Exemplo: minhaempresa.com.br" };
  const livre = await dominioLivre(d);
  return { dominio: d, livre, link: registrador().linkManual?.(d) };
}

export async function pedirDominio(empresaId: string, dominio: string) {
  await exigir(...MKT);
  const d = normalizarDominio(dominio);
  if (!dominioValido(d)) return;
  const reg = registrador();
  const e = await db.empresa.findUniqueOrThrow({ where: { id: empresaId } });
  let status: "PEDIDO" | "REGISTRADO" = "PEDIDO";
  let expiraEm: Date | undefined;
  if (reg.automatico) {
    expiraEm = (await reg.registrar(d, { documento: e.cnpj, nome: e.razaoSocial, email: e.email })).expiraEm;
    status = "REGISTRADO";
  }
  await db.dominio.upsert({
    where: { nome: d },
    create: { empresaId, nome: d, status, registrador: reg.nome, expiraEm },
    update: { empresaId, status, registrador: reg.nome, expiraEm },
  });
  revalidatePath(caminho(empresaId));
}

export async function marcarRegistrado(id: string, form: FormData) {
  await exigir(...MKT);
  const exp = String(form.get("expiraEm") || "");
  const d = await db.dominio.update({ where: { id }, data: { status: "REGISTRADO", expiraEm: exp ? new Date(exp) : null } });
  revalidatePath(caminho(d.empresaId));
}

export async function hospedar(id: string): Promise<Estado> {
  await exigir(...MKT);
  const d = await db.dominio.findUniqueOrThrow({ where: { id } });
  try {
    await cpanel.hospedarDominio(d.nome);
  } catch (e) {
    return { erro: erroDe(e) };
  }
  await db.dominio.update({ where: { id }, data: { status: "HOSPEDADO", hospedadoEm: new Date(), pasta: d.nome } });
  await db.empresa.update({ where: { id: d.empresaId }, data: { siteUrl: `https://${d.nome}` } });
  revalidatePath(caminho(d.empresaId));
  return { ok: true, msg: `Site ${d.nome} criado no Plano M. Aponte o DNS para ${cpanel.NAMESERVERS.join(" e ")}.` };
}

/** Liga à empresa um domínio que já está hospedado no Plano M. */
export async function vincularExistente(empresaId: string, form: FormData) {
  await exigir(...MKT);
  const d = normalizarDominio(String(form.get("dominio") || ""));
  if (!dominioValido(d)) return;
  await db.dominio.upsert({
    where: { nome: d },
    create: { empresaId, nome: d, status: "HOSPEDADO", registrador: "já existente", pasta: d },
    update: { empresaId, status: "HOSPEDADO" },
  });
  const e = await db.empresa.findUnique({ where: { id: empresaId }, select: { siteUrl: true } });
  if (!e?.siteUrl) await db.empresa.update({ where: { id: empresaId }, data: { siteUrl: `https://${d}` } });
  revalidatePath(caminho(empresaId));
}

export async function removerDominio(id: string) {
  await exigir(...MKT);
  const d = await db.dominio.delete({ where: { id } });
  revalidatePath(caminho(d.empresaId));
}

// ---------- E-mails ----------

export async function criarCaixa(dominio: string, empresaId: string, _: Estado, form: FormData): Promise<Estado> {
  await exigir(...MKT);
  const usuario = String(form.get("usuario") || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{1,64}$/.test(usuario)) return { erro: "Nome da caixa inválido (use letras, números, ponto, hífen)." };
  const senha = String(form.get("senha") || "") || randomBytes(9).toString("base64url") + "#9";
  try {
    await cpanel.criarEmail(usuario, dominio, senha, Number(form.get("cota") || 1024));
  } catch (e) {
    return { erro: erroDe(e) };
  }
  revalidatePath(caminho(empresaId));
  return { ok: true, msg: `Caixa ${usuario}@${dominio} criada.`, senha: form.get("senha") ? undefined : senha };
}

export async function apagarCaixa(email: string, empresaId: string) {
  await exigir("ADMIN");
  await cpanel.apagarEmail(email);
  revalidatePath(caminho(empresaId));
}

// ---------- Instagram ----------

export async function iniciarInstagram(empresaId: string) {
  await exigir(...MKT);
  if (!instagramConfigurado()) redirect(`${caminho(empresaId)}?ig=config`);
  const state = await new SignJWT({ empresaId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("15m").sign(segredoSessao());
  redirect(urlAutorizar(state));
}

export async function desconectarInstagram(empresaId: string) {
  await exigir(...MKT);
  await db.contaInstagram.deleteMany({ where: { empresaId } });
  revalidatePath(caminho(empresaId));
}

// ---------- Postagens ----------

async function lerImagem(form: FormData) {
  const f = form.get("arquivo");
  if (f instanceof File && f.size > 0) {
    if (f.size > 4 * 1024 * 1024) throw new Error("Imagem acima de 4 MB. Reduza o tamanho ou use um link.");
    return { imagem: Buffer.from(await f.arrayBuffer()), imagemTipo: f.type || "image/jpeg", imagemUrl: null };
  }
  const url = String(form.get("imagemUrl") || "").trim();
  return url ? { imagemUrl: url } : {};
}

export async function gerarComIA(empresaId: string, _: Estado, form: FormData): Promise<Estado> {
  await exigir(...MKT);
  const e = await db.empresa.findUniqueOrThrow({ where: { id: empresaId } });
  const site = String(form.get("site") || e.siteUrl || "").trim();
  if (!site) return { erro: "Informe o site da empresa." };
  const qtd = Math.min(Math.max(Number(form.get("quantidade") || 6), 1), 30);
  const intervalo = Math.max(Number(form.get("intervalo") || 2), 1);
  const inicio = String(form.get("inicio") || "");
  try {
    const { texto, imagens } = await lerSite(site.startsWith("http") ? site : `https://${site}`);
    const posts = await gerarPosts({ empresa: e.nomeFantasia || e.razaoSocial, site, texto, imagens, quantidade: qtd, instrucoes: String(form.get("instrucoes") || "") });
    const base = inicio ? deLocal(inicio) : null;
    await db.postagem.createMany({
      data: posts.map((p, i) => ({
        empresaId,
        tema: p.tema?.slice(0, 200),
        legenda: p.legenda.slice(0, 2200),
        imagemUrl: p.imagem || null,
        agendadaPara: base ? new Date(base.getTime() + i * intervalo * 86400000) : null,
        status: "RASCUNHO" as const,
      })),
    });
    revalidatePath(caminho(empresaId));
    return { ok: true, msg: `${posts.length} posts criados como rascunho. Revise e clique em Agendar.` };
  } catch (err) {
    return { erro: erroDe(err) };
  }
}

export async function criarPostagem(empresaId: string, _: Estado, form: FormData): Promise<Estado> {
  await exigir(...MKT);
  const legenda = String(form.get("legenda") || "").trim();
  if (!legenda) return { erro: "Escreva a legenda." };
  try {
    const img = await lerImagem(form);
    const quando = String(form.get("agendadaPara") || "");
    await db.postagem.create({
      data: { empresaId, legenda: legenda.slice(0, 2200), tema: String(form.get("tema") || "") || null, ...img, agendadaPara: quando ? deLocal(quando) : null, status: quando ? "AGENDADA" : "RASCUNHO" },
    });
  } catch (err) {
    return { erro: erroDe(err) };
  }
  revalidatePath(caminho(empresaId));
  return { ok: true, msg: "Post salvo." };
}

export async function salvarPostagem(id: string, form: FormData) {
  await exigir(...MKT);
  const quando = String(form.get("agendadaPara") || "");
  const acao = String(form.get("acao") || "salvar");
  const img = await lerImagem(form);
  const p = await db.postagem.update({
    where: { id },
    data: {
      legenda: String(form.get("legenda") || "").slice(0, 2200),
      ...img,
      agendadaPara: quando ? deLocal(quando) : null,
      ...(acao === "agendar" ? { status: "AGENDADA", erro: null } : acao === "pausar" ? { status: "RASCUNHO" } : {}),
    },
  });
  revalidatePath(caminho(p.empresaId));
}

export async function agendarTodos(empresaId: string) {
  await exigir(...MKT);
  await db.postagem.updateMany({ where: { empresaId, status: "RASCUNHO", agendadaPara: { not: null } }, data: { status: "AGENDADA" } });
  revalidatePath(caminho(empresaId));
}

export async function publicarAgora(id: string) {
  await exigir(...MKT);
  const p = await db.postagem.update({ where: { id }, data: { status: "AGENDADA", agendadaPara: new Date(), erro: null } });
  await rodarFila(1, id);
  revalidatePath(caminho(p.empresaId));
}

export async function excluirPostagem(id: string) {
  await exigir(...MKT);
  const p = await db.postagem.delete({ where: { id } });
  revalidatePath(caminho(p.empresaId));
}
