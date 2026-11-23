import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";
import { brl } from "@/lib/documentos";

export default async function Consultas() {
  await exigir(...EQUIPE);
  const [lista, porTipo] = await Promise.all([
    db.consulta.findMany({ orderBy: { criadoEm: "desc" }, take: 100, include: { empresa: { select: { razaoSocial: true } }, socio: { select: { nome: true } }, usuario: { select: { nome: true } } } }),
    db.consulta.groupBy({ by: ["tipo"], _sum: { custo: true }, _count: true }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="h1">Consultas e custos</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {porTipo.map((t) => (
          <div key={t.tipo} className="card"><p className="text-xs text-slate-500">{t.tipo}</p><p className="text-xl font-semibold">{t._count} · {brl(t._sum.custo)}</p></div>
        ))}
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="tabela">
          <thead><tr><th>Data</th><th>Tipo</th><th>Alvo</th><th>Provedor</th><th>Resultado</th><th>Custo</th><th>Por</th></tr></thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}>
                <td className="whitespace-nowrap">{c.criadoEm.toLocaleString("pt-BR")}</td>
                <td>{c.tipo}</td>
                <td>{c.empresa?.razaoSocial ?? c.socio?.nome ?? c.documento}</td>
                <td>{c.provedor}</td>
                <td>{c.sucesso ? "ok" : <span className="text-red-600">{c.erro}</span>}</td>
                <td>{brl(c.custo)}</td>
                <td>{c.usuario?.nome ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
