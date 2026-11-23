import Link from "next/link";
import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";
import { formatarCNPJ } from "@/lib/documentos";
import { FormCNPJ } from "@/components/FormCNPJ";

export default async function Empresas() {
  await exigir(...EQUIPE);
  const empresas = await db.empresa.findMany({ orderBy: { razaoSocial: "asc" }, include: { _count: { select: { socios: true } } } });
  return (
    <div className="space-y-6">
      <h1 className="h1">Empresas</h1>
      <div className="card">
        <h2 className="mb-3 font-semibold">Nova empresa</h2>
        <FormCNPJ />
        <p className="mt-2 text-xs text-slate-500">Buscamos os dados na Receita (razão social, situação, CNAEs, endereço e quadro societário).</p>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="tabela">
          <thead><tr><th>Razão social</th><th>CNPJ</th><th>Situação</th><th>Regime</th><th>Sócios</th></tr></thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td><Link className="font-medium text-teal-800 hover:underline" href={`/empresas/${e.id}`}>{e.nomeFantasia || e.razaoSocial}</Link><div className="text-xs text-slate-500">{e.razaoSocial}</div></td>
                <td className="whitespace-nowrap">{formatarCNPJ(e.cnpj)}</td>
                <td><span className={`tag ${e.situacaoCadastral === "ATIVA" ? "bg-teal-100 text-teal-800" : "bg-red-100 text-red-800"}`}>{e.situacaoCadastral ?? "—"}</span></td>
                <td>{e.regimeTributario ?? "—"}</td>
                <td>{e._count.socios}</td>
              </tr>
            ))}
            {!empresas.length && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Nenhuma empresa cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
