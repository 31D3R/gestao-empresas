import Link from "next/link";
import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";
import { brl } from "@/lib/documentos";

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
        {semConsent > 0 && <p className="text-sm">📝 {semConsent} sócio(s) sem consentimento LGPD. Sem ele não dá para consultar o nome.</p>}
        {restricao > 0 && <p className="text-sm">🔴 {restricao} sócio(s) com restrição no CPF. Isso pesa na análise de crédito da empresa no banco.</p>}
        {!inativas.length && !semConsent && !restricao && <p className="text-sm text-slate-500">Nada pendente por enquanto.</p>}
      </div>
    </div>
  );
}
