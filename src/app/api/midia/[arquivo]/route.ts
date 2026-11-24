import sharp from "sharp";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/** Imagem pública do post (o Instagram busca por aqui). Converte para JPEG 1080px, proporção 4:5 a 1.91:1. */
export async function GET(_: Request, { params }: { params: Promise<{ arquivo: string }> }) {
  const id = (await params).arquivo.replace(/\.jpg$/, "");
  const p = await db.postagem.findUnique({ where: { id }, select: { imagem: true, imagemUrl: true } });
  if (!p) return new Response("não encontrado", { status: 404 });
  let bruto: Buffer | null = p.imagem ? Buffer.from(p.imagem) : null;
  if (!bruto && p.imagemUrl) {
    const r = await fetch(p.imagemUrl, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return new Response("imagem indisponível", { status: 502 });
    bruto = Buffer.from(await r.arrayBuffer());
  }
  if (!bruto) return new Response("sem imagem", { status: 404 });
  const img = sharp(bruto).rotate();
  const { width = 1080, height = 1080 } = await img.metadata();
  const prop = width / height;
  const alvo = prop < 0.8 ? 0.8 : prop > 1.91 ? 1.91 : prop;
  const w = 1080;
  const h = Math.round(w / alvo);
  const jpg = await img.resize(w, h, { fit: "cover" }).flatten({ background: "#ffffff" }).jpeg({ quality: 88 }).toBuffer();
  return new Response(new Uint8Array(jpg), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" } });
}
