import { db } from "@/lib/db";
import { sessaoAtual } from "@/lib/auth";

export const runtime = "nodejs";

/** Prévia de uma versão do site (só equipe logada). /api/site/ID/ = HTML, /api/site/ID/img/x.jpg = imagem. */
export async function GET(_: Request, { params }: { params: Promise<{ versao: string; caminho?: string[] }> }) {
  const s = await sessaoAtual();
  if (!s || s.perfil === "SOCIO") return new Response("não autorizado", { status: 401 });
  const { versao, caminho = [] } = await params;
  const v = await db.versaoSite.findUnique({ where: { id: versao }, select: { html: true, dominioId: true } });
  if (!v) return new Response("não encontrado", { status: 404 });
  if (caminho[0] === "img" && caminho[1]) {
    const im = await db.imagemSite.findUnique({ where: { dominioId_nome: { dominioId: v.dominioId, nome: caminho[1] } } });
    if (!im) return new Response("não encontrado", { status: 404 });
    return new Response(new Uint8Array(im.dados), { headers: { "Content-Type": im.tipo } });
  }
  return new Response(v.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
