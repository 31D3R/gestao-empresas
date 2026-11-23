import type { TipoCertidao, SituacaoCertidao } from "@prisma/client";

export const TIPOS_CERTIDAO: { tipo: TipoCertidao; nome: string; link?: string }[] = [
  { tipo: "FEDERAL", nome: "Federal (Receita/PGFN)", link: "https://solucoes.receita.fazenda.gov.br/servicos/certidaointernet/pj/emitir" },
  { tipo: "FGTS", nome: "FGTS (CRF Caixa)", link: "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf" },
  { tipo: "TRABALHISTA", nome: "Trabalhista (CNDT/TST)", link: "https://cndt-certidao.tst.jus.br/inicio.faces" },
  { tipo: "ESTADUAL", nome: "Estadual (SEFAZ)" },
  { tipo: "MUNICIPAL", nome: "Municipal (Prefeitura)" },
];

export const SITUACOES: { valor: SituacaoCertidao; rotulo: string }[] = [
  { valor: "NEGATIVA", rotulo: "Negativa" },
  { valor: "POSITIVA_COM_EFEITO_NEGATIVA", rotulo: "Positiva com efeito de negativa" },
  { valor: "POSITIVA", rotulo: "Positiva (pendência)" },
  { valor: "ERRO", rotulo: "Não foi possível emitir" },
];

export type StatusCert = "OK" | "VENCENDO" | "VENCIDA" | "PENDENCIA" | "FALTANDO";

export function statusCertidao(c?: { situacao: SituacaoCertidao; validade: Date | null } | null, hoje = new Date()): StatusCert {
  if (!c) return "FALTANDO";
  if (c.situacao === "POSITIVA" || c.situacao === "ERRO") return "PENDENCIA";
  if (c.validade && c.validade < hoje) return "VENCIDA";
  if (c.validade && c.validade.getTime() - hoje.getTime() < 15 * 864e5) return "VENCENDO";
  return "OK";
}

export const ESTILO_STATUS: Record<StatusCert, { rotulo: string; cls: string }> = {
  OK: { rotulo: "Em dia", cls: "bg-teal-100 text-teal-800" },
  VENCENDO: { rotulo: "Vence em breve", cls: "bg-amber-100 text-amber-800" },
  VENCIDA: { rotulo: "Vencida", cls: "bg-red-100 text-red-800" },
  PENDENCIA: { rotulo: "Com pendência", cls: "bg-red-100 text-red-800" },
  FALTANDO: { rotulo: "Não emitida", cls: "bg-slate-100 text-slate-600" },
};

/** Última certidão de cada tipo. */
export function ultimasPorTipo<T extends { tipo: TipoCertidao; emitidaEm: Date }>(lista: T[]) {
  const m = new Map<TipoCertidao, T>();
  for (const c of [...lista].sort((a, b) => b.emitidaEm.getTime() - a.emitidaEm.getTime())) if (!m.has(c.tipo)) m.set(c.tipo, c);
  return m;
}
