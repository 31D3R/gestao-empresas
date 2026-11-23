import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";
import { brl, dataBR } from "@/lib/documentos";
import { resumoFinanceiro, CATEGORIAS_DESPESA, CATEGORIAS_RECEITA } from "@/lib/financeiro";
import { criarConta, criarCartao, criarEmprestimo, criarLancamento, excluirLancamento, pagarFatura, pagarParcela } from "@/app/actions/financeiro";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const corUso = (v: number) => (v <= 0.3 ? "bg-teal-600" : v <= 0.7 ? "bg-amber-500" : "bg-red-600");

export default async function Financeiro({ params }: { params: Promise<{ id: string }> }) {
  await exigir(...EQUIPE);
  const { id } = await params;
  const empresa = await db.empresa.findUnique({ where: { id }, select: { id: true, razaoSocial: true, nomeFantasia: true } });
  if (!empresa) notFound();
  const r = await resumoFinanceiro(id);
  const lancamentos = await db.lancamento.findMany({
    where: { empresaId: id }, orderBy: [{ data: "desc" }, { criadoEm: "desc" }], take: 50,
    include: { conta: { select: { nome: true } }, cartao: { select: { nome: true } } },
  });
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/empresas/${id}`} className="text-sm text-slate-500">← {empresa.nomeFantasia || empresa.razaoSocial}</Link>
        <h1 className="h1">Financeiro</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Saldo em contas" valor={brl(r.saldoTotal)} />
        <Indicador rotulo="Resultado do mês" valor={brl(r.resultadoMes)} detalhe={`Receitas ${brl(r.receitasMes)} · Despesas ${brl(r.despesasMes)}`} alerta={r.resultadoMes < 0} />
        <Indicador rotulo="Uso dos cartões" valor={pct(r.usoCartoes)} detalhe={`${brl(r.usadoTotal)} de ${brl(r.limiteTotal)}`} alerta={r.usoCartoes > 0.3} />
        <Indicador rotulo="Dívida de empréstimos" valor={brl(r.dividaEmprestimos)} detalhe={`Parcelas/mês ${brl(r.parcelasMensais)}`} />
      </div>

      <section className="card space-y-4">
        <h2 className="font-semibold">Novo lançamento</h2>
        <form action={criarLancamento.bind(null, id)} className="grid gap-2 sm:grid-cols-6 sm:items-end">
          <div><label className="label">Tipo</label><select name="tipo" className="input"><option value="DESPESA">Despesa</option><option value="RECEITA">Receita</option></select></div>
          <div className="sm:col-span-2"><label className="label">Descrição</label><input name="descricao" required className="input" /></div>
          <div><label className="label">Categoria</label>
            <select name="categoria" className="input" required>
              <optgroup label="Despesas">{CATEGORIAS_DESPESA.map((c) => <option key={c}>{c}</option>)}</optgroup>
              <optgroup label="Receitas">{CATEGORIAS_RECEITA.map((c) => <option key={c}>{c}</option>)}</optgroup>
            </select>
          </div>
          <div><label className="label">Valor (R$)</label><input name="valor" required className="input" inputMode="decimal" /></div>
          <div><label className="label">Data</label><input name="data" type="date" defaultValue={hoje} required className="input" /></div>
          <div className="sm:col-span-3"><label className="label">Onde (conta ou cartão)</label>
            <select name="origem" className="input">
              <option value="">Sem conta definida</option>
              {r.contas.map((c) => <option key={c.id} value={`conta:${c.id}`}>Conta · {c.nome}</option>)}
              {r.cartoes.map((c) => <option key={c.id} value={`cartao:${c.id}`}>Cartão · {c.nome}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3"><button className="btn w-full sm:w-auto">Lançar</button></div>
        </form>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-semibold">Cartões de crédito</h2>
          {r.cartoes.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex justify-between text-sm"><strong>{c.nome}</strong><span>{brl(c.usado)} / {brl(c.limite)}</span></div>
              <div className="mt-2 h-2 rounded bg-slate-100"><div className={`h-2 rounded ${corUso(c.uso)}`} style={{ width: `${Math.min(100, c.uso * 100)}%` }} /></div>
              <p className="mt-1 text-xs text-slate-500">Uso {pct(c.uso)} · fecha dia {c.diaFechamento} · vence dia {c.diaVencimento}{c.uso > 0.3 ? " · acima de 30% pesa no seu score bancário" : ""}</p>
              {c.usado > 0 && r.contas.length > 0 && (
                <form action={pagarFatura.bind(null, id, c.id)} className="mt-2 flex gap-2">
                  <select name="contaId" className="input">{r.contas.map((ct) => <option key={ct.id} value={ct.id}>{ct.nome}</option>)}</select>
                  <button className="btn-sec whitespace-nowrap">Pagar fatura</button>
                </form>
              )}
            </div>
          ))}
          <details><summary className="cursor-pointer text-sm text-teal-800">+ Adicionar cartão</summary>
            <form action={criarCartao.bind(null, id)} className="mt-2 grid grid-cols-2 gap-2">
              <input name="nome" required placeholder="Nome (ex.: Nubank PJ)" className="input col-span-2" />
              <input name="banco" placeholder="Banco" className="input" />
              <input name="final" placeholder="Final (4 dígitos)" maxLength={4} className="input" />
              <input name="limite" required placeholder="Limite (R$)" className="input" />
              <input name="bandeira" placeholder="Bandeira" className="input" />
              <input name="diaFechamento" type="number" min={1} max={31} required placeholder="Dia fechamento" className="input" />
              <input name="diaVencimento" type="number" min={1} max={31} required placeholder="Dia vencimento" className="input" />
              <button className="btn col-span-2">Salvar cartão</button>
            </form>
          </details>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">Contas bancárias</h2>
          {r.contas.map((c) => (
            <div key={c.id} className="flex justify-between rounded-lg border border-slate-200 p-3 text-sm">
              <span><strong>{c.nome}</strong><br /><span className="text-xs text-slate-500">{[c.banco, c.agencia && `ag ${c.agencia}`, c.numero && `cc ${c.numero}`].filter(Boolean).join(" · ")}</span></span>
              <span className={c.saldo < 0 ? "text-red-600" : ""}>{brl(c.saldo)}</span>
            </div>
          ))}
          <details><summary className="cursor-pointer text-sm text-teal-800">+ Adicionar conta</summary>
            <form action={criarConta.bind(null, id)} className="mt-2 grid grid-cols-2 gap-2">
              <input name="nome" required placeholder="Nome (ex.: Itaú PJ)" className="input col-span-2" />
              <input name="banco" placeholder="Banco" className="input" />
              <input name="agencia" placeholder="Agência" className="input" />
              <input name="numero" placeholder="Conta" className="input" />
              <input name="saldoInicial" placeholder="Saldo inicial (R$)" className="input" />
              <button className="btn col-span-2">Salvar conta</button>
            </form>
          </details>
        </section>
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Empréstimos e financiamentos</h2>
        {r.emprestimos.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm">
            <span><strong>{e.instituicao}</strong> · {e.modalidade ?? "—"}<br />
              <span className="text-xs text-slate-500">Contratado {brl(e.valorContratado)} · {e.parcelasPagas}/{e.parcelas} parcelas de {brl(e.valorParcela)}{e.taxaMensal ? ` · ${e.taxaMensal}% a.m.` : ""} · 1º venc. {dataBR(e.primeiroVencimento)}</span>
            </span>
            <span className="flex items-center gap-2">
              <span>Saldo devedor <strong>{brl(e.saldoDevedor)}</strong></span>
              {e.parcelasPagas < e.parcelas && (
                <form action={pagarParcela.bind(null, id, e.id)} className="flex gap-1">
                  <select name="contaId" className="input">{r.contas.map((ct) => <option key={ct.id} value={ct.id}>{ct.nome}</option>)}</select>
                  <button className="btn-sec whitespace-nowrap">Pagar parcela</button>
                </form>
              )}
            </span>
          </div>
        ))}
        <details><summary className="cursor-pointer text-sm text-teal-800">+ Adicionar empréstimo</summary>
          <form action={criarEmprestimo.bind(null, id)} className="mt-2 grid gap-2 sm:grid-cols-4">
            <input name="instituicao" required placeholder="Instituição" className="input" />
            <input name="modalidade" placeholder="Modalidade (capital de giro, Pronampe...)" className="input sm:col-span-2" />
            <input name="valorContratado" required placeholder="Valor contratado" className="input" />
            <input name="taxaMensal" placeholder="Taxa % a.m." className="input" />
            <input name="parcelas" type="number" min={1} required placeholder="Nº parcelas" className="input" />
            <input name="valorParcela" required placeholder="Valor parcela" className="input" />
            <input name="parcelasPagas" type="number" min={0} placeholder="Já pagas" className="input" />
            <div className="sm:col-span-2"><label className="label">1º vencimento</label><input name="primeiroVencimento" type="date" required className="input" /></div>
            <button className="btn sm:col-span-2 sm:self-end">Salvar empréstimo</button>
          </form>
        </details>
      </section>

      <section className="card overflow-x-auto p-0">
        <h2 className="p-5 pb-2 font-semibold">Lançamentos</h2>
        <table className="tabela">
          <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Onde</th><th className="text-right">Valor</th><th></th></tr></thead>
          <tbody>
            {lancamentos.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{dataBR(l.data)}</td>
                <td>{l.descricao}{!l.pago && <span className="tag ml-2 bg-amber-100 text-amber-800">em aberto</span>}</td>
                <td>{l.categoria}</td>
                <td className="text-xs">{l.cartao ? `Cartão · ${l.cartao.nome}` : l.conta?.nome ?? "—"}</td>
                <td className={`whitespace-nowrap text-right ${l.tipo === "RECEITA" ? "text-teal-700" : "text-red-700"}`}>{l.tipo === "RECEITA" ? "+" : "−"} {brl(l.valor)}</td>
                <td><form action={excluirLancamento.bind(null, id, l.id)}><button className="text-xs text-slate-400 hover:text-red-600">excluir</button></form></td>
              </tr>
            ))}
            {!lancamentos.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">Nenhum lançamento.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Indicador({ rotulo, valor, detalhe, alerta }: { rotulo: string; valor: string; detalhe?: string; alerta?: boolean }) {
  return (
    <div className={`card ${alerta ? "border-amber-300" : ""}`}>
      <p className="text-xs text-slate-500">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
      {detalhe && <p className="text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
}
