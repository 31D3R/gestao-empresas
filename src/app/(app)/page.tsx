import Link from "next/link";
import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";
import { brl } from "@/lib/documentos";
import { TIPOS_CERTIDAO, statusCertidao, ultimasPorTipo } from "@/lib/certidoes";

export default async function Painel() {
  await exigir(...EQUIPE);
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [empresas, socios, semConsent, restricao, custoMes, inativas] = await Promise.all([
    db.empresa.count(),
    db.socio.count(),
    db.socio.count({ where: { consentimentoConsulta: false } }),
    db.socio.count({ where: { situacaoCredito: "RESTRICAO" } }),
    db.consulta.aggregate({ _sum: { custo: true }, where: { criadoEm: { gte: inicioMes } } }),
    db.empresa.findMany({ where: { NOT: { situacaoCadastral: "ATIVA" }, situacaoCadastral: { not: null } }, select: { id: true, razaoSocial: true, situacaoCadastral: true } }),
  ]);
  const empresasCert = await db.empresa.findMany({ select: { id: true, razaoSocial: true, nomeFantasia: true, certidoes: true } });
  const alertasCert = empresasCert.flatMap((e) => {
    const ult = ultimasPorTipo(e.certidoes);
    return TIPOS_CERTIDAO.map((t) => ({ e, t, st: statusCertidao(ult.get(t.tipo)) })).filter((x) => x.st === "VENCIDA" || x.st === "VENCENDO" || x.st === "PENDENCIA");
  });
  const semCertidao = empresasCert.filter((e) => e.certidoes.length === 0).length;
  const cards = [
    { rotulo: "Empresas", valor: empresas, href: "/empresas" },
    { rotulo: "Sócios", valor: socios, href: "/socios" },
    { rotulo: "Sócios com restrição", valor: restricao, href: "/socios" },
    { rotulo: "Custo de consultas no mês", valor: brl(custoMes._sum.custo), href: "/consultas" },
  ];
  return (
    <div className="space-y-6">
      <h1 className="h1">Painel</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.rotulo} href={c.href} className="card hover:border-teal-300">
            <p className="text-xs text-slate-500">{c.rotulo}</p>
            <p className="mt-1 text-2xl font-semibold">{c.valor}</p>
          </Link>
        ))}
      </div>
      <div className="card space-y-2">
        <h2 className="font-semibold">Pontos de atenção</h2>
        {inativas.map((e) => (
          <p key={e.id} className="text-sm">⚠️ <Link className="underline" href={`/empresas/${e.id}`}>{e.razaoSocial}</Link> está com situação cadastral <strong>{e.situacaoCadastral}</strong> na Receita.</p>
        ))}
        {alertasCert.map(({ e, t, st }) => (
          <p key={e.id + t.tipo} className="text-sm">{st === "VENCENDO" ? "🟡" : "🔴"} Certidão {t.nome} de <Link className="underline" href={`/empresas/${e.id}`}>{e.nomeFantasia || e.razaoSocial}</Link> {st === "VENCIDA" ? "está vencida" : st === "VENCENDO" ? "vence em menos de 15 dias" : "tem pendência"}. Banco e licitação pedem certidões em dia.</p>
        ))}
        {semCertidao > 0 && <p className="text-sm">📄 {semCertidao} empresa(s) sem nenhuma certidão registrada.</p>}
        {semConsent > 0 && <p className="text-sm">📝 {semConsent} sócio(s) sem consentimento LGPD. Sem ele não dá para consultar o nome.</p>}
        {restricao > 0 && <p className="text-sm">🔴 {restricao} sócio(s) com restrição no CPF. Isso pesa na análise de crédito da empresa no banco.</p>}
        {!inativas.length && !semConsent && !restricao && !alertasCert.length && !semCertidao && <p className="text-sm text-slate-500">Nada pendente por enquanto.</p>}
      </div>
    </div>
  );
}
