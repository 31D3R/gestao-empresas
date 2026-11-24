import { db } from "@/lib/db";
import { publicarImagem, urlApp } from "./instagram";

/** Sempre servida pela nossa rota, que converte para JPEG 1080 no formato aceito pelo Instagram. */
export function urlImagemPost(p: { id: string; imagemUrl: string | null; imagemTipo: string | null }) {
  if (!p.imagemTipo && !p.imagemUrl) return null;
  return `${urlApp()}/api/midia/${p.id}.jpg`;
}

/** Publica as postagens agendadas cujo horário já chegou. */
export async function rodarFila(limite = 10, id?: string) {
  const pendentes = await db.postagem.findMany({
    where: { status: "AGENDADA", agendadaPara: { lte: new Date() }, ...(id ? { id } : {}) },
    orderBy: { agendadaPara: "asc" },
    take: limite,
    select: { id: true, empresaId: true, legenda: true, imagemUrl: true, imagemTipo: true },
  });
  const resultado = { publicadas: 0, erros: 0 };
  for (const p of pendentes) {
    const trava = await db.postagem.updateMany({ where: { id: p.id, status: "AGENDADA" }, data: { status: "PUBLICANDO" } });
    if (!trava.count) continue;
    try {
      const url = urlImagemPost(p);
      if (!url) throw new Error("Post sem imagem: o Instagram exige uma imagem.");
      const mediaId = await publicarImagem(p.empresaId, url, p.legenda);
      await db.postagem.update({ where: { id: p.id }, data: { status: "PUBLICADA", igMediaId: mediaId, publicadaEm: new Date(), erro: null } });
      resultado.publicadas++;
    } catch (e) {
      await db.postagem.update({ where: { id: p.id }, data: { status: "ERRO", erro: (e as Error).message.slice(0, 500) } });
      resultado.erros++;
    }
  }
  return resultado;
}
