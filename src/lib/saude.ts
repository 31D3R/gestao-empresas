import { db } from "./db";
import { resumoFinanceiro } from "./financeiro";
import { TIPOS_CERTIDAO, statusCertidao, ultimasPorTipo } from "./certidoes";

export interface ItemSaude { nome: string; pontos: number; max: number; dica?: string }
export interface Saude { score: number; faixa: "Saudável" | "Atenção" | "Crítica"; itens: ItemSaude[]; dicas: string[] }

const n = (v: unknown) => Number(v ?? 0);

/**
 * Score de saúde da empresa (0 a 100) com foco no que bancos e Fisco olham:
 * regularidade, uso de crédito, CPF dos sócios, resultado, reserva e endividamento.
 */
export async function saudeEmpresa(empresaId: string): Promise<Saude> {
  const empresa = await db.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    include: { certidoes: true, socios: { include: { socio: { select: { situacaoCredito: true } } } } },
  });
  const fin = await resumoFinanceiro(empresaId);
  const tres = new Date(); tres.setMonth(tres.getMonth() - 3);
  const hist = await db.lancamento.groupBy({ by: ["tipo"], where: { empresaId, data: { gte: tres } }, _sum: { valor: true } });
  const despMedia = n(hist.find((h) => h.tipo === "DESPESA")?._sum.valor) / 3;
  const recMedia = n(hist.find((h) => h.tipo === "RECEITA")?._sum.valor) / 3;
  const itens: ItemSaude[] = [];

  // 1. Situação cadastral
  const ativa = empresa.situacaoCadastral === "ATIVA";
  itens.push({ nome: "CNPJ ativo na Receita", pontos: ativa ? 10 : 0, max: 10,
    dica: ativa ? undefined : "O CNPJ não está ATIVO na Receita. Regularize com o contador antes de qualquer pedido de crédito." });

  // 2. Certidões
  const ult = ultimasPorTipo(empresa.certidoes);
  const certOk = TIPOS_CERTIDAO.filter((t) => ["OK", "VENCENDO"].includes(statusCertidao(ult.get(t.tipo))));
  const faltam = TIPOS_CERTIDAO.filter((t) => !certOk.includes(t)).map((t) => t.nome.split(" ")[0]);
  itens.push({ nome: "Certidões negativas em dia", pontos: certOk.length * 5, max: 25,
    dica: faltam.length ? `Emita ou regularize as certidões: ${faltam.join(", ")}. Banco, licitação e fornecedores grandes pedem todas em dia.` : undefined });

  // 3. Uso do limite de cartões
  const uso = fin.usoCartoes;
  const ptsUso = !fin.cartoes.length ? 10 : uso <= 0.3 ? 15 : uso <= 0.5 ? 8 : uso <= 0.7 ? 4 : 0;
  itens.push({ nome: "Uso do limite de cartões até 30%", pontos: ptsUso, max: 15,
    dica: uso > 0.3 ? `Os cartões estão com ${Math.round(uso * 100)}% do limite usado. Mantenha abaixo de 30% e pague a fatura inteira: rotativo é o crédito mais caro e derruba o score.`
      : !fin.cartoes.length ? "Ter um cartão PJ usado com moderação e pago em dia ajuda a construir histórico de crédito da empresa." : undefined });

  // 4. CPF dos sócios
  const socios = empresa.socios.map((s) => s.socio.situacaoCredito);
  const restr = socios.filter((s) => s === "RESTRICAO").length;
  const limpos = socios.filter((s) => s === "LIMPO").length;
  const ptsCpf = !socios.length ? 0 : restr ? 0 : Math.round((limpos / socios.length) * 15);
  itens.push({ nome: "Sócios com nome limpo", pontos: ptsCpf, max: 15,
    dica: !socios.length ? "Vincule os sócios à empresa." : restr ? "Há sócio com restrição no CPF. O banco analisa o CPF dos sócios junto com o CNPJ: negocie e quite antes de pedir crédito."
      : limpos < socios.length ? "Consulte o CPF de todos os sócios para confirmar que estão com nome limpo." : undefined });

  // 5. Resultado do mês
  itens.push({ nome: "Resultado do mês positivo", pontos: fin.resultadoMes >= 0 ? 10 : 0, max: 10,
    dica: fin.resultadoMes < 0 ? "O mês está no vermelho. Revise despesas por categoria e não cubra o caixa com cartão ou cheque especial." : undefined });

  // 6. Reserva de caixa
  const meses = despMedia ? fin.saldoTotal / despMedia : fin.saldoTotal > 0 ? 3 : 0;
  itens.push({ nome: "Reserva de caixa (3 meses de despesas)", pontos: meses >= 3 ? 15 : meses >= 1 ? 8 : 0, max: 15,
    dica: meses < 3 ? `O caixa cobre ${meses.toFixed(1)} mês(es) de despesas. Separe um valor fixo todo mês até chegar a 3 meses: é isso que dá capital de giro sem depender de empréstimo.` : undefined });

  // 7. Comprometimento com parcelas
  const comp = recMedia ? fin.parcelasMensais / recMedia : fin.parcelasMensais ? 1 : 0;
  itens.push({ nome: "Parcelas até 30% da receita", pontos: comp <= 0.3 ? 10 : comp <= 0.5 ? 5 : 0, max: 10,
    dica: comp > 0.3 ? `As parcelas de empréstimos consomem ${Math.round(comp * 100)}% da receita média. Evite novas dívidas e tente renegociar taxa ou prazo.` : undefined });

  const score = itens.reduce((s, i) => s + i.pontos, 0);
  const dicas = itens.filter((i) => i.dica).map((i) => i.dica!);
  // Hábitos que o sistema não mede, mas que o banco observa
  dicas.push(
    "Movimente as receitas da empresa na conta PJ e não misture gastos pessoais. Retire dinheiro só como pró-labore ou distribuição de lucros.",
    "Concentre o faturamento em um ou dois bancos: movimentação recorrente é o que libera limite e taxas melhores.",
    "Pague impostos e boletos até o vencimento. Atraso aparece no SCR do Banco Central e pesa em qualquer análise."
  );
  // Sem regularidade fiscal completa a empresa não é "Saudável", mesmo com bom caixa
  const regular = ativa && faltam.length === 0;
  const faixa = score >= 75 && regular ? "Saudável" : score >= 50 ? "Atenção" : "Crítica";
  return { score, faixa, itens, dicas };
}
