"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const num = (f: FormData, k: string) => {
  const v = txt(f, k);
  if (!v) return 0;
  return Number(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v);
};
const caminho = (id: string) => `/empresas/${id}/financeiro`;

export async function criarConta(empresaId: string, form: FormData) {
  await exigir(...EQUIPE);
  await db.contaFinanceira.create({
    data: { empresaId, nome: String(form.get("nome")), banco: txt(form, "banco"), agencia: txt(form, "agencia"), numero: txt(form, "numero"), saldoInicial: num(form, "saldoInicial") },
  });
  revalidatePath(caminho(empresaId));
}

export async function criarCartao(empresaId: string, form: FormData) {
  await exigir(...EQUIPE);
  await db.cartao.create({
    data: {
      empresaId, nome: String(form.get("nome")), banco: txt(form, "banco"), bandeira: txt(form, "bandeira"), final: txt(form, "final"),
      limite: num(form, "limite"), diaFechamento: Number(form.get("diaFechamento")), diaVencimento: Number(form.get("diaVencimento")),
    },
  });
  revalidatePath(caminho(empresaId));
}

export async function criarEmprestimo(empresaId: string, form: FormData) {
  await exigir(...EQUIPE);
  await db.emprestimo.create({
    data: {
      empresaId, instituicao: String(form.get("instituicao")), modalidade: txt(form, "modalidade"),
      valorContratado: num(form, "valorContratado"), taxaMensal: txt(form, "taxaMensal") ? num(form, "taxaMensal") : null,
      parcelas: Number(form.get("parcelas")), valorParcela: num(form, "valorParcela"),
      primeiroVencimento: new Date(String(form.get("primeiroVencimento"))), parcelasPagas: Number(form.get("parcelasPagas") || 0),
    },
  });
  revalidatePath(caminho(empresaId));
}

export async function criarLancamento(empresaId: string, form: FormData) {
  await exigir(...EQUIPE);
  const origem = String(form.get("origem") || ""); // "conta:<id>" | "cartao:<id>" | ""
  const [tipoOrigem, origemId] = origem.split(":");
  const noCartao = tipoOrigem === "cartao";
  await db.lancamento.create({
    data: {
      empresaId,
      tipo: form.get("tipo") === "RECEITA" ? "RECEITA" : "DESPESA",
      descricao: String(form.get("descricao")),
      categoria: String(form.get("categoria")),
      valor: num(form, "valor"),
      data: new Date(String(form.get("data"))),
      // compra no cartão fica em aberto até a fatura ser paga
      pago: noCartao ? false : form.get("pago") !== "off",
      contaId: tipoOrigem === "conta" ? origemId : null,
      cartaoId: noCartao ? origemId : null,
    },
  });
  revalidatePath(caminho(empresaId));
}

export async function excluirLancamento(empresaId: string, id: string) {
  await exigir(...EQUIPE);
  await db.lancamento.delete({ where: { id, empresaId } });
  revalidatePath(caminho(empresaId));
}

/** Paga a fatura: baixa as compras em aberto do cartão, debitando da conta escolhida. */
export async function pagarFatura(empresaId: string, cartaoId: string, form: FormData) {
  await exigir(...EQUIPE);
  const contaId = String(form.get("contaId") || "");
  if (!contaId) return;
  await db.lancamento.updateMany({ where: { empresaId, cartaoId, pago: false }, data: { pago: true, contaId } });
  revalidatePath(caminho(empresaId));
}

/** Registra o pagamento de uma parcela do empréstimo como despesa na conta escolhida. */
export async function pagarParcela(empresaId: string, emprestimoId: string, form: FormData) {
  await exigir(...EQUIPE);
  const e = await db.emprestimo.findFirstOrThrow({ where: { id: emprestimoId, empresaId } });
  if (e.parcelasPagas >= e.parcelas) return;
  await db.$transaction([
    db.emprestimo.update({ where: { id: e.id }, data: { parcelasPagas: { increment: 1 } } }),
    db.lancamento.create({
      data: {
        empresaId, tipo: "DESPESA", categoria: "Empréstimo", valor: e.valorParcela, data: new Date(), pago: true,
        descricao: `Parcela ${e.parcelasPagas + 1}/${e.parcelas} - ${e.instituicao}`, contaId: txt(form, "contaId"),
      },
    }),
  ]);
  revalidatePath(caminho(empresaId));
}
