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
import { PLANOS, PRECO_DOMINIO_BR, PRECO_SITE_IA, plano as dadosPlano, type CodigoPlano } from "@/lib/presenca/planos";
import { gerarHtml } from "@/lib/presenca/siteia";

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
  const dom = await db.dominio.findUnique({ where: { nome: dominio } });
  const lim = dadosPlano(dom?.plano)?.emails;
  if (lim) {
    const atuais = await cpanel.listarEmails(dominio).catch(() => []);
    if (atuais.length >= lim) return { erro: `O plano ${dadosPlano(dom?.plano)!.nome} permite ${lim} caixa(s). Troque de plano para criar mais.` };
  }
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

// ---------- Contratação (como na loja Mídia Certa) ----------


/**
 * Contrata hospedagem: registra domínio + plano, lança as despesas no financeiro da empresa
 * e, se o domínio já for da empresa e o cPanel estiver configurado, ativa na hora.
 */
export async function contratar(empresaId: string, _: Estado, form: FormData): Promise<Estado> {
  await exigir(...MKT);
  const d = normalizarDominio(String(form.get("dominio") || ""));
  if (!dominioValido(d)) return { erro: "Domínio inválido. Exemplo: minhaempresa.com.br" };
  const codigo = String(form.get("plano")) as CodigoPlano;
  const p = PLANOS[codigo];
  if (!p) return { erro: "Escolha um plano." };
  const jaTenho = form.get("jaTenho") === "on";
  const comSite = form.get("siteIA") === "on";
  const existente = await db.dominio.findUnique({ where: { nome: d } });
  if (existente?.contratadoEm) return { erro: `${d} já tem hospedagem contratada.` };
  if (!jaTenho) {
    const livre = await dominioLivre(d);
    if (livre === false) return { erro: `${d} já tem dono. Se é da empresa, marque "já tenho este domínio".` };
  }
  const hoje = new Date();
  const umAno = new Date(hoje.getTime() + 365 * 86400000);
  const venc = new Date(hoje.getTime() + 3 * 86400000);
  const reg = registrador();
  const dom = await db.dominio.upsert({
    where: { nome: d },
    create: { empresaId, nome: d, status: jaTenho ? "REGISTRADO" : "PEDIDO", registrador: jaTenho ? "já existente" : reg.nome, plano: codigo, contratadoEm: hoje, venceEm: umAno, siteIA: comSite },
    update: { empresaId, plano: codigo, contratadoEm: hoje, venceEm: umAno, siteIA: comSite },
  });
  const despesas = [
    { descricao: `Hospedagem Mídia Certa, plano ${p.nome} (anual): ${d}`, valor: p.anual },
    ...(!jaTenho && d.endsWith(".br") ? [{ descricao: `Registro do domínio ${d} (1 ano)`, valor: PRECO_DOMINIO_BR }] : []),
    ...(comSite && PRECO_SITE_IA > 0 ? [{ descricao: `Site com IA Mídia Certa: ${d}`, valor: PRECO_SITE_IA }] : []),
  ];
  await db.lancamento.createMany({
    data: despesas.map((x) => ({ empresaId, tipo: "DESPESA" as const, categoria: "Marketing", descricao: x.descricao, valor: x.valor, data: hoje, vencimento: venc, pago: false })),
  });
  let msg = `Contratado: ${d}, plano ${p.nome}. ${despesas.length} despesa(s) lançada(s) no financeiro.`;
  if (jaTenho && cpanel.cpanelConfigurado()) {
    try {
      await cpanel.hospedarDominio(d);
      await db.dominio.update({ where: { id: dom.id }, data: { status: "HOSPEDADO", hospedadoEm: new Date(), pasta: d } });
      await db.empresa.update({ where: { id: empresaId }, data: { siteUrl: `https://${d}` } });
      msg += ` Hospedagem ativada. Aponte o DNS para ${cpanel.NAMESERVERS.join(" e ")}.`;
    } catch (e) {
      msg += ` A ativação automática falhou (${erroDe(e)}); use "Criar hospedagem" depois.`;
    }
  } else if (!jaTenho) {
    msg += " Registre o domínio no Registro.br e clique em \"Já registrei\" para ativar.";
  }
  revalidatePath(caminho(empresaId));
  revalidatePath(`/empresas/${empresaId}/financeiro`);
  return { ok: true, msg };
}

export async function renovar(id: string) {
  await exigir(...MKT);
  const d = await db.dominio.findUniqueOrThrow({ where: { id } });
  const p = dadosPlano(d.plano);
  if (!p) return;
  const base = d.venceEm && d.venceEm > new Date() ? d.venceEm : new Date();
  await db.dominio.update({ where: { id }, data: { venceEm: new Date(base.getTime() + 365 * 86400000) } });
  await db.lancamento.create({ data: { empresaId: d.empresaId, tipo: "DESPESA", categoria: "Marketing", descricao: `Renovação hospedagem Mídia Certa, plano ${p.nome}: ${d.nome}`, valor: p.anual, data: new Date(), vencimento: base, pago: false } });
  revalidatePath(caminho(d.empresaId));
}

export async function trocarPlano(id: string, form: FormData) {
  await exigir(...MKT);
  const codigo = String(form.get("plano"));
  if (!(codigo in PLANOS)) return;
  const d = await db.dominio.update({ where: { id }, data: { plano: codigo } });
  revalidatePath(caminho(d.empresaId));
}

// ---------- Site com IA ----------

async function guardarImagens(dominioId: string, form: FormData) {
  const arquivos = form.getAll("imagens").filter((f): f is File => f instanceof File && f.size > 0);
  for (const f of arquivos) {
    if (f.size > 4 * 1024 * 1024) throw new Error(`${f.name} passa de 4 MB.`);
    const nome = f.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.]+/g, "-").replace(/^-+/, "");
    const dados = Buffer.from(await f.arrayBuffer());
    await db.imagemSite.upsert({ where: { dominioId_nome: { dominioId, nome } }, create: { dominioId, nome, tipo: f.type || "image/jpeg", dados }, update: { tipo: f.type || "image/jpeg", dados } });
  }
}

export async function pedirSite(dominioId: string, _: Estado, form: FormData): Promise<Estado> {
  await exigir(...MKT);
  const pedido = String(form.get("pedido") || "").trim();
  if (!pedido) return { erro: "Escreva o que você quer no site (ou o ajuste)." };
  const dom = await db.dominio.findUniqueOrThrow({ where: { id: dominioId }, include: { empresa: true, versoes: { orderBy: { criadoEm: "desc" }, take: 1 } } });
  try {
    await guardarImagens(dominioId, form);
    const imagens = await db.imagemSite.findMany({ where: { dominioId }, orderBy: { criadoEm: "asc" } });
    const e = dom.empresa;
    const dadosEmpresa = [
      `Nome: ${e.nomeFantasia || e.razaoSocial}`, `Razão social: ${e.razaoSocial}`, `Domínio: ${dom.nome}`,
      e.telefone && `Telefone/WhatsApp: ${e.telefone}`, e.email && `E-mail: ${e.email}`,
      `Endereço: ${[e.logradouro, e.numero, e.bairro, e.municipio, e.uf].filter(Boolean).join(", ")}`,
      e.cnaePrincipal && `Atividade: ${e.cnaePrincipal}`, e.instagram && `Instagram: ${e.instagram}`,
    ].filter(Boolean).join("\n");
    const anterior = form.get("novo") === "on" ? null : dom.versoes[0]?.html;
    const { html, custoUsd } = await gerarHtml({ pedido, dadosEmpresa, imagens, htmlAnterior: anterior });
    await db.versaoSite.create({ data: { dominioId, pedido: pedido.slice(0, 4000), html, custoUsd } });
  } catch (err) {
    return { erro: erroDe(err) };
  }
  revalidatePath(caminho(dom.empresaId));
  return { ok: true, msg: "Nova versão pronta. Veja a prévia e publique quando gostar." };
}

export async function publicarVersao(versaoId: string): Promise<Estado> {
  await exigir(...MKT);
  const v = await db.versaoSite.findUniqueOrThrow({ where: { id: versaoId }, include: { dominio: { include: { imagens: true } } } });
  if (v.dominio.status !== "HOSPEDADO") return { erro: "Crie a hospedagem do domínio antes de publicar." };
  try {
    await cpanel.enviarArquivos(v.dominio.nome, "img", v.dominio.imagens.map((i) => ({ nome: i.nome, tipo: i.tipo, dados: i.dados })));
    await cpanel.salvarArquivo(v.dominio.nome, "index.html", v.html);
  } catch (err) {
    return { erro: erroDe(err) };
  }
  await db.versaoSite.update({ where: { id: versaoId }, data: { publicadaEm: new Date() } });
  revalidatePath(caminho(v.dominio.empresaId));
  return { ok: true, msg: `Publicado em https://${v.dominio.nome}` };
}
