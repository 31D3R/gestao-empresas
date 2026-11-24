import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";
import { brl, dataBR, formatarCNPJ, formatarCPF } from "@/lib/documentos";
import { FormSocio } from "@/components/FormSocio";
import { BotaoCredito } from "@/components/BotaoCredito";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { excluirSocio } from "@/app/actions/socios";
import type { ResultadoCredito } from "@/lib/consultas";

export default async function Socio({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigir(...EQUIPE);
  const { id } = await params;
  const s = await db.socio.findUnique({
    where: { id },
    include: {
      empresas: { include: { empresa: true } },
      consultas: { where: { tipo: "CPF_CREDITO" }, orderBy: { criadoEm: "desc" }, take: 10 },
    },
  });
  if (!s) notFound();
  const ultima = s.consultas.find((c) => c.sucesso)?.resposta as ResultadoCredito | undefined;
  const dados = JSON.parse(JSON.stringify({
    ...s,
    rendaMensal: s.rendaMensal?.toString() ?? null,
    dataNascimento: s.dataNascimento?.toISOString().slice(0, 10) ?? null,
    cpf: formatarCPF(s.cpf),
    empresas: undefined, consultas: undefined,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/socios" className="text-sm text-slate-500">← Sócios</Link>
          <h1 className="h1">{s.nome}</h1>
          <p className="text-sm text-slate-500">CPF {formatarCPF(s.cpf)}</p>
        </div>
        {sessao.perfil === "ADMIN" && <BotaoExcluir acao={excluirSocio.bind(null, s.id)} aviso={`Excluir ${s.nome}? O sócio sai de todas as empresas e o acesso dele ao portal é apagado. As empresas continuam. Não dá para desfazer.`} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card space-y-3 lg:col-span-1">
          <h2 className="font-semibold">Nome limpo</h2>
          <p className="text-sm">
            Situação:{" "}
            {s.situacaoCredito === "LIMPO" ? <span className="tag bg-teal-100 text-teal-800">Limpo</span> : s.situacaoCredito === "RESTRICAO" ? <span className="tag bg-red-100 text-red-800">Com restrição</span> : <span className="tag bg-slate-100 text-slate-600">Não consultado</span>}
          </p>
          {s.scoreCredito != null && <p className="text-sm">Score: <strong>{s.scoreCredito}</strong></p>}
          {s.creditoAtualizadoEm && <p className="text-xs text-slate-500">Última consulta: {dataBR(s.creditoAtualizadoEm)}</p>}
          {ultima?.pendencias?.length ? (
            <ul className="space-y-1 text-sm">
              {ultima.pendencias.map((p, i) => <li key={i} className="rounded bg-red-50 p-2">{p.tipo} · {p.credor} · {brl(p.valor)} · {dataBR(p.data)}</li>)}
            </ul>
          ) : null}
          {s.situacaoCredito === "RESTRICAO" && (
            <p className="rounded bg-amber-50 p-2 text-xs">Dica: negocie e quite as pendências antes de pedir crédito para a empresa. O banco olha o CPF dos sócios na análise.</p>
          )}
          <BotaoCredito socioId={s.id} habilitado={s.consentimentoConsulta} />
          {s.consentimentoEm && <p className="text-xs text-slate-500">Consentimento registrado em {dataBR(s.consentimentoEm)}.</p>}
        </div>
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Cadastro</h2>
          <FormSocio socio={dados} />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">Empresas</h2>
        <ul className="text-sm">
          {s.empresas.map((v) => (
            <li key={v.id}><Link className="text-teal-800 hover:underline" href={`/empresas/${v.empresaId}`}>{v.empresa.nomeFantasia || v.empresa.razaoSocial}</Link> · {formatarCNPJ(v.empresa.cnpj)} · {v.qualificacao ?? "sócio"}{v.participacao ? ` · ${v.participacao}%` : ""}</li>
          ))}
          {!s.empresas.length && <li className="text-slate-500">Nenhuma empresa vinculada.</li>}
        </ul>
      </div>
    </div>
  );
}
