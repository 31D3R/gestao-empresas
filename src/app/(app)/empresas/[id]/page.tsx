import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";
import { brl, dataBR, formatarCNPJ, formatarCPF } from "@/lib/documentos";
import { consultarCNPJ, vincularSocio, desvincularSocio } from "@/app/actions/empresas";
import { FormEmpresa } from "@/components/FormEmpresa";
import type { SocioQSA } from "@/lib/consultas";

export default async function Empresa({ params }: { params: Promise<{ id: string }> }) {
  await exigir(...EQUIPE);
  const { id } = await params;
  const e = await db.empresa.findUnique({
    where: { id },
    include: { socios: { include: { socio: true } }, consultas: { orderBy: { criadoEm: "desc" }, take: 10 } },
  });
  if (!e) notFound();
  const todosSocios = await db.socio.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, cpf: true } });
  const qsa = ((e.dadosReceita as { qsa?: SocioQSA[] } | null)?.qsa ?? []) as SocioQSA[];
  const cnaes = (e.cnaesSecundarios as { codigo: string; descricao: string }[] | null) ?? [];
  const atualizar = async () => {
    "use server";
    const f = new FormData();
    f.set("cnpj", e.cnpj);
    await consultarCNPJ(null, f);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/empresas" className="text-sm text-slate-500">← Empresas</Link>
          <h1 className="h1">{e.nomeFantasia || e.razaoSocial}</h1>
          <p className="text-sm text-slate-500">{e.razaoSocial} · {formatarCNPJ(e.cnpj)}</p>
        </div>
        <form action={atualizar}><button className="btn-sec">Atualizar dados da Receita</button></form>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-2 text-sm lg:col-span-1">
          <h2 className="font-semibold">Receita Federal</h2>
          <p>Situação: <span className={`tag ${e.situacaoCadastral === "ATIVA" ? "bg-teal-100 text-teal-800" : "bg-red-100 text-red-800"}`}>{e.situacaoCadastral ?? "—"}</span></p>
          <p>Abertura: {dataBR(e.dataAbertura)}</p>
          <p>Natureza: {e.naturezaJuridica ?? "—"}</p>
          <p>Porte: {e.porte ?? "—"}</p>
          <p>Capital social: {e.capitalSocial ? brl(e.capitalSocial) : "—"}</p>
          <p>CNAE principal: {e.cnaePrincipal ?? "—"}</p>
          {cnaes.length > 0 && (
            <details><summary className="cursor-pointer">CNAEs secundários ({cnaes.length})</summary>
              <ul className="mt-1 list-disc pl-5 text-xs">{cnaes.map((c) => <li key={c.codigo}>{c.codigo} - {c.descricao}</li>)}</ul>
            </details>
          )}
          <p>Endereço: {[e.logradouro, e.numero, e.complemento, e.bairro, e.municipio, e.uf].filter(Boolean).join(", ") || "—"}</p>
          <p className="text-xs text-slate-500">Atualizado em {dataBR(e.receitaAtualizadaEm)}</p>
        </div>
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Dados complementares</h2>
          <FormEmpresa empresa={JSON.parse(JSON.stringify({ ...e, capitalSocial: e.capitalSocial?.toString() ?? null }))} />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Sócios</h2>
        <table className="tabela">
          <thead><tr><th>Nome</th><th>CPF</th><th>Qualificação</th><th>Part.</th><th>Nome limpo</th><th></th></tr></thead>
          <tbody>
            {e.socios.map(({ socio, qualificacao, participacao }) => (
              <tr key={socio.id}>
                <td><Link className="text-teal-800 hover:underline" href={`/socios/${socio.id}`}>{socio.nome}</Link></td>
                <td>{formatarCPF(socio.cpf)}</td>
                <td>{qualificacao ?? "—"}</td>
                <td>{participacao ? `${participacao}%` : "—"}</td>
                <td><SituacaoCredito s={socio.situacaoCredito} /></td>
                <td><form action={desvincularSocio.bind(null, e.id, socio.id)}><button className="text-xs text-red-600">remover</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
        <form action={vincularSocio.bind(null, e.id)} className="grid gap-2 sm:grid-cols-4 sm:items-end">
          <div className="sm:col-span-2">
            <label className="label">Vincular sócio</label>
            <select name="socioId" className="input" required defaultValue="">
              <option value="" disabled>Selecione...</option>
              {todosSocios.map((s) => <option key={s.id} value={s.id}>{s.nome} ({formatarCPF(s.cpf)})</option>)}
            </select>
          </div>
          <div><label className="label">Qualificação</label><input name="qualificacao" className="input" placeholder="Sócio-Administrador" /></div>
          <div className="flex gap-2"><div className="flex-1"><label className="label">Part. %</label><input name="participacao" className="input" /></div><button className="btn">Vincular</button></div>
        </form>
        <p className="text-xs text-slate-500">Não achou? <Link href="/socios/novo" className="underline">Cadastre o sócio</Link>.</p>
        {qsa.length > 0 && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="mb-1 font-medium">Quadro societário na Receita</p>
            <ul className="list-disc pl-5">{qsa.map((q, i) => <li key={i}>{q.nome} · {q.qualificacao}{q.dataEntrada ? ` · desde ${dataBR(q.dataEntrada)}` : ""}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">Histórico de consultas</h2>
        <ul className="text-sm">{e.consultas.map((c) => <li key={c.id}>{dataBR(c.criadoEm)} · {c.tipo} · {c.provedor} · {c.sucesso ? "ok" : `erro: ${c.erro}`} · {brl(c.custo)}</li>)}</ul>
      </div>
    </div>
  );
}

function SituacaoCredito({ s }: { s: string | null }) {
  if (s === "LIMPO") return <span className="tag bg-teal-100 text-teal-800">Limpo</span>;
  if (s === "RESTRICAO") return <span className="tag bg-red-100 text-red-800">Restrição</span>;
  return <span className="tag bg-slate-100 text-slate-600">Não consultado</span>;
}
