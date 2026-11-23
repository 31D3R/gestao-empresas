import { db } from "@/lib/db";
import { exigir } from "@/lib/auth";
import { brl, formatarCNPJ } from "@/lib/documentos";
import { resumoFinanceiro } from "@/lib/financeiro";
import { saudeEmpresa } from "@/lib/saude";
import { PainelSaude } from "@/components/PainelSaude";

// Portal do sócio: somente leitura, apenas as empresas dele.
export default async function Relatorios() {
  const s = await exigir();
  const empresas = s.perfil === "SOCIO"
    ? s.socioId ? await db.empresa.findMany({ where: { socios: { some: { socioId: s.socioId } } } }) : []
    : await db.empresa.findMany({ orderBy: { razaoSocial: "asc" } });
  const inicio = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1));

  const blocos = await Promise.all(empresas.map(async (e) => ({
    e,
    fin: await resumoFinanceiro(e.id),
    saude: await saudeEmpresa(e.id),
    cats: await db.lancamento.groupBy({ by: ["categoria"], where: { empresaId: e.id, tipo: "DESPESA", data: { gte: inicio } }, _sum: { valor: true }, orderBy: { _sum: { valor: "desc" } } }),
  })));

  return (
    <div className="space-y-8">
      <h1 className="h1">Relatórios</h1>
      {blocos.map(({ e, fin, saude, cats }) => (
        <section key={e.id} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{e.nomeFantasia || e.razaoSocial}</h2>
            <p className="text-sm text-slate-500">{formatarCNPJ(e.cnpj)} · {e.situacaoCadastral}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[["Saldo em contas", brl(fin.saldoTotal)], ["Resultado do mês", brl(fin.resultadoMes)], ["Uso dos cartões", `${Math.round(fin.usoCartoes * 100)}%`], ["Dívida de empréstimos", brl(fin.dividaEmprestimos)]].map(([r, v]) => (
              <div key={r} className="card"><p className="text-xs text-slate-500">{r}</p><p className="mt-1 text-xl font-semibold">{v}</p></div>
            ))}
          </div>
          <PainelSaude saude={saude} completo={s.perfil !== "SOCIO"} />
          <div className="card">
            <p className="mb-2 text-sm font-medium">Despesas do mês por categoria</p>
            {cats.map((c) => {
              const v = Number(c._sum.valor ?? 0);
              return (
                <div key={c.categoria} className="mb-1 text-sm">
                  <div className="flex justify-between"><span>{c.categoria}</span><span>{brl(v)}</span></div>
                  <div className="h-1.5 rounded bg-slate-100"><div className="h-1.5 rounded bg-teal-600" style={{ width: `${fin.despesasMes ? (v / fin.despesasMes) * 100 : 0}%` }} /></div>
                </div>
              );
            })}
            {!cats.length && <p className="text-sm text-slate-500">Sem despesas lançadas neste mês.</p>}
          </div>
        </section>
      ))}
      {!empresas.length && <p className="text-slate-500">Nenhuma empresa vinculada ao seu acesso.</p>}
    </div>
  );
}
