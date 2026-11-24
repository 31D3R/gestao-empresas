/** Criador de site com IA (mesma ideia do painel Mídia Certa): conversa, logotipo e fotos, prévia, versões e publicação. */
import { iaConfigurada } from "./ia";

export interface ImagemRef { nome: string; tipo: string; dados: Uint8Array }

const SISTEMA = `Você é um web designer sênior que cria sites institucionais para pequenas empresas brasileiras.
Entregue SEMPRE um único arquivo HTML completo (<!doctype html> ... </html>), responsivo, em português do Brasil, com CSS no próprio arquivo (sem frameworks externos, apenas Google Fonts se quiser).
Estrutura padrão: topo com logotipo e menu, seção principal com chamada forte e botão de WhatsApp, serviços/produtos, diferenciais, sobre, depoimentos só se o cliente fornecer, contato com endereço, telefone, e-mail, mapa (iframe do Google Maps pelo endereço) e rodapé.
Use as cores do logotipo quando houver. Use as imagens enviadas pelo caminho exato "img/NOME" informado. Não use imagens de terceiros.
Inclua meta description, Open Graph e dados estruturados LocalBusiness (JSON-LD). Botão flutuante de WhatsApp se houver telefone.
Estilo (regra do cliente, obrigatório): nada de "cara de IA". Proibido degradê, faixa de texto rolando (marquee/ticker), grade de cards arredondados genéricos com ícone, emojis como ícone e frases clichê ("soluções inovadoras", "excelência"). Busque um visual moderno de agência: tipografia forte, bom espaçamento, fotos reais grandes, cores sólidas da marca, navegação simples e óbvia, menu fixo enxuto e botões claros.
Nunca escreva "sem juros" em parcelamento.
Não invente preços, números ou depoimentos. Responda apenas com o HTML, sem explicações.`;

export async function gerarHtml(opts: { pedido: string; dadosEmpresa: string; imagens: ImagemRef[]; htmlAnterior?: string | null }) {
  if (!iaConfigurada()) throw new Error("IA não configurada: falta ANTHROPIC_API_KEY na Vercel.");
  const conteudo: unknown[] = [];
  for (const im of opts.imagens.slice(0, 6)) {
    if (/^image\/(png|jpeg|webp|gif)$/.test(im.tipo) && im.dados.length < 4_500_000) {
      conteudo.push({ type: "text", text: `Imagem disponível: img/${im.nome}` });
      conteudo.push({ type: "image", source: { type: "base64", media_type: im.tipo, data: Buffer.from(im.dados).toString("base64") } });
    }
  }
  const outras = opts.imagens.slice(6).map((i) => `img/${i.nome}`);
  if (outras.length) conteudo.push({ type: "text", text: `Outras imagens disponíveis: ${outras.join(", ")}` });
  conteudo.push({
    type: "text",
    text: opts.htmlAnterior
      ? `Este é o site atual:\n${opts.htmlAnterior}\n\nAplique este pedido de ajuste e devolva o HTML completo atualizado:\n${opts.pedido}`
      : `Dados da empresa:\n${opts.dadosEmpresa}\n\nPedido do cliente:\n${opts.pedido}`,
  });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: 16000, system: SISTEMA, messages: [{ role: "user", content: conteudo }] }),
    signal: AbortSignal.timeout(280000),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`IA: ${j?.error?.message || r.status}`);
  let html: string = (j.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
  const ini = html.search(/<!doctype html|<html/i);
  const fim = html.toLowerCase().lastIndexOf("</html>");
  if (ini < 0 || fim < 0) throw new Error("A IA não devolveu um HTML completo. Tente de novo.");
  html = html.slice(ini, fim + 7);
  // custo aproximado (Sonnet: US$3/M entrada, US$15/M saída)
  const custoUsd = ((j.usage?.input_tokens ?? 0) * 3 + (j.usage?.output_tokens ?? 0) * 15) / 1_000_000;
  return { html, custoUsd };
}
