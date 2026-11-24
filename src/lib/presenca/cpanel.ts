/**
 * Hospedagem no Plano M (cPanel) via API com token.
 * Variáveis: CPANEL_HOST (ex.: br132.hostgator.com.br), CPANEL_USER, CPANEL_TOKEN.
 */
export const NAMESERVERS = (process.env.CPANEL_NAMESERVERS || "ns132.hostgator.com.br,ns133.hostgator.com.br").split(",");

export function cpanelConfigurado() {
  return Boolean(process.env.CPANEL_HOST && process.env.CPANEL_USER && process.env.CPANEL_TOKEN);
}

function base() {
  if (!cpanelConfigurado()) throw new Error("Hospedagem não configurada: falta CPANEL_HOST, CPANEL_USER ou CPANEL_TOKEN na Vercel.");
  return `https://${process.env.CPANEL_HOST}:2083`;
}

async function chamar(url: string) {
  const r = await fetch(url, {
    headers: { Authorization: `cpanel ${process.env.CPANEL_USER}:${process.env.CPANEL_TOKEN}` },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`cPanel respondeu HTTP ${r.status}`);
  return r.json();
}

/** UAPI: /execute/Modulo/funcao */
export async function uapi<T = unknown>(modulo: string, funcao: string, params: Record<string, string | number> = {}): Promise<T> {
  const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const j = await chamar(`${base()}/execute/${modulo}/${funcao}?${q}`);
  if (!j.status) throw new Error((j.errors || ["Erro no cPanel"]).join(" "));
  return j.data as T;
}

/** API2 (necessária para criar domínio adicional). */
async function api2(modulo: string, funcao: string, params: Record<string, string>) {
  const q = new URLSearchParams({
    cpanel_jsonapi_user: process.env.CPANEL_USER!,
    cpanel_jsonapi_apiversion: "2",
    cpanel_jsonapi_module: modulo,
    cpanel_jsonapi_func: funcao,
    ...params,
  });
  const j = await chamar(`${base()}/json-api/cpanel?${q}`);
  const d = j?.cpanelresult?.data?.[0];
  if (j?.cpanelresult?.error || (d && d.result === 0)) throw new Error(j?.cpanelresult?.error || d?.reason || "Erro no cPanel");
  return d;
}

export interface DominioHospedado { dominio: string; pasta: string; tipo: string }

export async function listarDominios(): Promise<DominioHospedado[]> {
  const d = await uapi<{ main_domain: { domain: string; documentroot: string }; addon_domains: { domain: string; documentroot: string }[] }>("DomainInfo", "domains_data");
  return [
    { dominio: d.main_domain.domain, pasta: d.main_domain.documentroot, tipo: "principal" },
    ...d.addon_domains.map((a) => ({ dominio: a.domain, pasta: a.documentroot, tipo: "adicional" })),
  ];
}

/** Cria o site no Plano M (domínio adicional com pasta própria) e pede SSL. */
export async function hospedarDominio(dominio: string) {
  const sub = dominio.replace(/\./g, "").slice(0, 30);
  await api2("AddonDomain", "addaddondomain", { newdomain: dominio, subdomain: sub, dir: dominio });
  try { await uapi("SSL", "start_autossl_check"); } catch {}
  return dominio;
}

export interface CaixaEmail { email: string; usado: string; cota: string }

export async function listarEmails(dominio: string): Promise<CaixaEmail[]> {
  const d = await uapi<{ email: string; humandiskused: string; humandiskquota: string }[]>("Email", "list_pops_with_disk", { domain: dominio });
  return d.map((e) => ({ email: e.email, usado: e.humandiskused, cota: e.humandiskquota }));
}

export async function criarEmail(usuario: string, dominio: string, senha: string, cotaMB = 1024) {
  await uapi("Email", "add_pop", { email: usuario, domain: dominio, password: senha, quota: cotaMB });
}

export async function apagarEmail(email: string) {
  const [u, d] = email.split("@");
  await uapi("Email", "delete_pop", { email: u, domain: d });
}

export async function trocarSenhaEmail(email: string, senha: string) {
  const [u, d] = email.split("@");
  await uapi("Email", "passwd_pop", { email: u, domain: d, password: senha });
}

export function webmailUrl() {
  return process.env.CPANEL_HOST ? `https://${process.env.CPANEL_HOST}:2096` : null;
}

async function postar(url: string, body: BodyInit) {
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `cpanel ${process.env.CPANEL_USER}:${process.env.CPANEL_TOKEN}` },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error(`cPanel respondeu HTTP ${r.status}`);
  const j = await r.json();
  if (!j.status) throw new Error((j.errors || ["Erro no cPanel"]).join(" "));
  return j.data;
}

/** Pasta do site no Plano M (domínio adicional criado com dir = domínio). */
export const pastaSite = (dominio: string) => `/home/${process.env.CPANEL_USER}/${dominio}`;

/** Grava um arquivo de texto (ex.: index.html) na pasta do site. */
export async function salvarArquivo(dominio: string, arquivo: string, conteudo: string) {
  return postar(`${base()}/execute/Fileman/save_file_content`, new URLSearchParams({ dir: pastaSite(dominio), file: arquivo, content: conteudo, from_charset: "UTF-8", to_charset: "UTF-8" }));
}

/** Envia arquivos binários (imagens) para uma subpasta do site. */
export async function enviarArquivos(dominio: string, subpasta: string, arquivos: { nome: string; tipo: string; dados: Uint8Array }[]) {
  if (!arquivos.length) return;
  try { await uapi("Fileman", "mkdir", { path: pastaSite(dominio), name: subpasta }); } catch {}
  const f = new FormData();
  f.set("dir", `${pastaSite(dominio)}/${subpasta}`);
  f.set("overwrite", "1");
  arquivos.forEach((a, i) => f.set(`file-${i + 1}`, new Blob([new Uint8Array(a.dados)], { type: a.tipo }), a.nome));
  return postar(`${base()}/execute/Fileman/upload_files`, f);
}

const HTACCESS_HTTPS = `# Força https (gerado pelo sistema de gestão)
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [L,R=301]
`;

/** Garante https forçado: cria .htaccess só se o site ainda não tiver um. */
export async function forcarHttps(dominio: string) {
  const arquivos = await uapi<{ file: string }[]>("Fileman", "list_files", { dir: pastaSite(dominio), show_hidden: 1 });
  if (arquivos.some((a) => a.file === ".htaccess")) return false;
  await salvarArquivo(dominio, ".htaccess", HTACCESS_HTTPS);
  return true;
}

/** Confere se o site responde em https com certificado válido. */
export async function sslOk(dominio: string) {
  try {
    const r = await fetch(`https://${dominio}/`, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(10000), cache: "no-store" });
    return r.status < 500;
  } catch {
    return false;
  }
}
