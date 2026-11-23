import { db } from "@/lib/db";
import { exigir } from "@/lib/auth";
import { formatarCNPJ } from "@/lib/documentos";

// Portal do sócio: somente leitura. Relatórios financeiros e score entram na Fase 5.
export default async function Relatorios() {
  const s = await exigir();
  const empresas = s.socioId
    ? await db.empresa.findMany({ where: { socios: { some: { socioId: s.socioId } } } })
    : s.perfil === "SOCIO" ? [] : await db.empresa.findMany();
  return (
    <div className="space-y-6">
      <h1 className="h1">Relatórios</h1>
      {empresas.map((e) => (
        <div key={e.id} className="card">
          <h2 className="font-semibold">{e.nomeFantasia || e.razaoSocial}</h2>
          <p className="text-sm text-slate-500">{formatarCNPJ(e.cnpj)} · {e.situacaoCadastral}</p>
          <p className="mt-3 text-sm text-slate-500">Relatório financeiro e score de saúde chegam nas próximas fases.</p>
        </div>
      ))}
      {!empresas.length && <p className="text-slate-500">Nenhuma empresa vinculada ao seu acesso.</p>}
    </div>
  );
}
