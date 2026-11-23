import Link from "next/link";
import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";
import { formatarCPF } from "@/lib/documentos";

export default async function Socios() {
  await exigir(...EQUIPE);
  const socios = await db.socio.findMany({ orderBy: { nome: "asc" }, include: { empresas: { include: { empresa: { select: { razaoSocial: true, nomeFantasia: true } } } } } });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h1">Sócios</h1>
        <Link href="/socios/novo" className="btn">Novo sócio</Link>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="tabela">
          <thead><tr><th>Nome</th><th>CPF</th><th>Empresas</th><th>LGPD</th><th>Nome limpo</th><th>Score</th></tr></thead>
          <tbody>
            {socios.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td><Link className="font-medium text-teal-800 hover:underline" href={`/socios/${s.id}`}>{s.nome}</Link></td>
                <td className="whitespace-nowrap">{formatarCPF(s.cpf)}</td>
                <td className="text-xs">{s.empresas.map((v) => v.empresa.nomeFantasia || v.empresa.razaoSocial).join(", ") || "—"}</td>
                <td>{s.consentimentoConsulta ? "✅" : "—"}</td>
                <td>{s.situacaoCredito === "LIMPO" ? <span className="tag bg-teal-100 text-teal-800">Limpo</span> : s.situacaoCredito === "RESTRICAO" ? <span className="tag bg-red-100 text-red-800">Restrição</span> : <span className="tag bg-slate-100 text-slate-600">Não consultado</span>}</td>
                <td>{s.scoreCredito ?? "—"}</td>
              </tr>
            ))}
            {!socios.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">Nenhum sócio cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
