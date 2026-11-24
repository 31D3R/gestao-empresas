/** Geração de posts com Claude (Anthropic). Variável: ANTHROPIC_API_KEY. */
export function iaConfigurada() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface IdeiaPost { tema: string; legenda: string; imagem?: string | null }

/** Lê o texto e as imagens principais do site. */
export async function lerSite(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "Mozilla/5.0 (GestaoEmpresas)" } });
  if (!r.ok) throw new Error(`Não consegui abrir o site (HTTP ${r.status})`);
  const html = await r.text();
  const base = new URL(r.url);
  const imagens = [...html.matchAll(/(?:<img[^>]+src|<meta[^>]+property=["']og:image["'][^>]+content)=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/gi)]
    .map((m) => { try { return new URL(m[1], base).href; } catch { return null; } })
    .filter((u): u is string => Boolean(u) && !/logo|icon|favicon|sprite/i.test(u!));
  const texto = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
  return { texto, imagens: [...new Set(imagens)].slice(0, 30) };
}

export async function gerarPosts(opts: { empresa: string; site: string; texto: string; imagens: string[]; quantidade: number; instrucoes?: string }): Promise<IdeiaPost[]> {
  if (!iaConfigurada()) throw new Error("IA não configurada: falta ANTHROPIC_API_KEY na Vercel.");
  const prompt = `Você é social media de uma empresa brasileira. Crie ${opts.quantidade} posts para o Instagram da empresa "${opts.empresa}" com base no conteúdo do site ${opts.site}.
Regras: português do Brasil, tom profissional e próximo, cada legenda com gancho na primeira linha, 2 a 4 parágrafos curtos, chamada para ação (WhatsApp/site) e 5 a 10 hashtags locais e do nicho no final. Varie os temas (serviços, diferenciais, dúvidas comuns, bastidores, datas comemorativas próximas). Não invente preços nem promessas que não estejam no site.
${opts.instrucoes ? `Instruções extras: ${opts.instrucoes}\n` : ""}Para cada post escolha, se fizer sentido, uma imagem da lista (copie a URL exata) ou deixe null.
Imagens do site:\n${opts.imagens.join("\n") || "(nenhuma)"}
Conteúdo do site:\n${opts.texto}
Responda só com JSON no formato {"posts":[{"tema":"...","legenda":"...","imagem":"url ou null"}]}`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(120000),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`IA: ${j?.error?.message || r.status}`);
  const txt: string = (j.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
  const json = txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1);
  const posts: IdeiaPost[] = JSON.parse(json).posts || [];
  return posts.filter((p) => p.legenda).map((p) => ({ ...p, imagem: p.imagem && opts.imagens.includes(p.imagem) ? p.imagem : null }));
}
