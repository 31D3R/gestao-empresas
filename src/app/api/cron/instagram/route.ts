import { rodarFila } from "@/lib/presenca/fila";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Publica os posts agendados cujo horário já passou.
 * É seguro deixar aberto: só publica o que a equipe já agendou, nunca antes da hora.
 * Chamado 1x/dia pela Vercel (plano grátis) e a cada 15 min pelo cron do cPanel.
 */
export async function GET() {
  return Response.json(await rodarFila());
}
