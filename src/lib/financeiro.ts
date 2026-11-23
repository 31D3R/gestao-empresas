import { db } from "./db";

export const CATEGORIAS_DESPESA = [
  "Impostos e tributos", "Folha e pró-labore", "Aluguel", "Fornecedores", "Marketing", "Software e assinaturas",
  "Contabilidade", "Tarifas bancárias", "Juros e multas", "Empréstimo", "Energia, água e internet", "Outras despesas",
];
export const CATEGORIAS_RECEITA = ["Vendas", "Serviços", "Aporte de sócio", "Empréstimo recebido", "Outras receitas"];

const n = (v: unknown) => Number(v ?? 0);

/** Resumo financeiro da empresa: saldos, uso de cartões, dívidas e resultado do mês. */
export async function resumoFinanceiro(empresaId: string, ref = new Date()) {
  const inicio = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), 1));
  const fim = new Date(Date.UTC(ref.getFullYear(), ref.getMonth() + 1, 1));
  const [contas, cartoes, emprestimos, mes] = await Promise.all([
    db.contaFinanceira.findMany({ where: { empresaId }, include: { lancamentos: { where: { pago: true }, select: { tipo: true, valor: true } } } }),
    db.cartao.findMany({ where: { empresaId }, include: { lancamentos: { where: { pago: false }, select: { valor: true } } } }),
    db.emprestimo.findMany({ where: { empresaId } }),
    db.lancamento.groupBy({ by: ["tipo"], where: { empresaId, data: { gte: inicio, lt: fim } }, _sum: { valor: true } }),
  ]);

  const contasR = contas.map((c) => ({
    ...c,
    saldo: n(c.saldoInicial) + c.lancamentos.reduce((s, l) => s + (l.tipo === "RECEITA" ? n(l.valor) : -n(l.valor)), 0),
  }));
  const cartoesR = cartoes.map((c) => {
    const usado = c.lancamentos.reduce((s, l) => s + n(l.valor), 0);
    return { ...c, usado, uso: n(c.limite) ? usado / n(c.limite) : 0 };
  });
  const emprestimosR = emprestimos.map((e) => ({
    ...e,
    saldoDevedor: (e.parcelas - e.parcelasPagas) * n(e.valorParcela),
  }));
  const receitasMes = n(mes.find((m) => m.tipo === "RECEITA")?._sum.valor);
  const despesasMes = n(mes.find((m) => m.tipo === "DESPESA")?._sum.valor);
  const limiteTotal = cartoesR.reduce((s, c) => s + n(c.limite), 0);
  const usadoTotal = cartoesR.reduce((s, c) => s + c.usado, 0);

  return {
    contas: contasR,
    cartoes: cartoesR,
    emprestimos: emprestimosR,
    saldoTotal: contasR.reduce((s, c) => s + c.saldo, 0),
    limiteTotal,
    usadoTotal,
    usoCartoes: limiteTotal ? usadoTotal / limiteTotal : 0,
    dividaEmprestimos: emprestimosR.reduce((s, e) => s + e.saldoDevedor, 0),
    parcelasMensais: emprestimosR.filter((e) => e.parcelasPagas < e.parcelas).reduce((s, e) => s + n(e.valorParcela), 0),
    receitasMes,
    despesasMes,
    resultadoMes: receitasMes - despesasMes,
  };
}
