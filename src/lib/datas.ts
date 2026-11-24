/** Horário de Brasília (sem horário de verão desde 2019). */
export const FUSO = "America/Sao_Paulo";

/** Converte "2026-11-24T09:30" (digitado no navegador) para Date em horário de Brasília. */
export function deLocal(v: string) {
  return new Date(`${v.length === 16 ? v + ":00" : v}-03:00`);
}

/** Date -> "2026-11-24T09:30" no horário de Brasília (para inputs datetime-local). */
export function paraLocal(d: Date) {
  return new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 16);
}

export const dataHoraBR = (d?: Date | null) =>
  d ? d.toLocaleString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
