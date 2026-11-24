"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";
import { soDigitos, validarCNPJ } from "@/lib/documentos";
import { provedorCNPJ, type DadosCNPJ } from "@/lib/consultas";

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

function camposDaReceita(d: DadosCNPJ) {
  return {
    razaoSocial: d.razaoSocial,
    nomeFantasia: d.nomeFantasia ?? null,
    situacaoCadastral: d.situacaoCadastral ?? null,
    dataAbertura: d.dataAbertura ? new Date(d.dataAbertura) : null,
    naturezaJuridica: d.naturezaJuridica ?? null,
    porte: d.porte ?? null,
    regimeTributario: d.regimeTributario ?? null,
    capitalSocial: d.capitalSocial ?? null,
    cnaePrincipal: d.cnaePrincipal ?? null,
    cnaesSecundarios: d.cnaesSecundarios ?? [],
    email: d.email ?? null,
    telefone: d.telefone ?? null,
    cep: d.cep ?? null,
    logradouro: d.logradouro ?? null,
    numero: d.numero ?? null,
    complemento: d.complemento ?? null,
    bairro: d.bairro ?? null,
    municipio: d.municipio ?? null,
    uf: d.uf ?? null,
    dadosReceita: { qsa: d.qsa, bruto: d.bruto } as unknown as Prisma.InputJsonValue,
    receitaAtualizadaEm: new Date(),
  };
}

/** Consulta o CNPJ no provedor, registra o custo e cria ou atualiza a empresa. */
export async function consultarCNPJ(_: unknown, form: FormData) {
  const s = await exigir(...EQUIPE);
  const cnpj = soDigitos(String(form.get("cnpj") || ""));
  if (!validarCNPJ(cnpj)) return { erro: "CNPJ inválido." };

  const p = provedorCNPJ();
  const r = await p.consultarCNPJ(cnpj);
  const existente = await db.empresa.findUnique({ where: { cnpj } });

  let empresaId = existente?.id;
  if (r.ok && r.dados) {
    const campos = camposDaReceita(r.dados);
    const e = existente
      ? await db.empresa.update({ where: { id: existente.id }, data: campos })
      : await db.empresa.create({ data: { cnpj, ...campos } });
    empresaId = e.id;
  }
  await db.consulta.create({
    data: {
      tipo: "CNPJ_RECEITA",
      provedor: r.provedor,
      documento: cnpj,
      sucesso: r.ok,
      custo: r.custo,
      erro: r.erro,
      resposta: (r.dados?.bruto ?? undefined) as Prisma.InputJsonValue | undefined,
      empresaId,
      usuarioId: s.id,
    },
  });
  if (!r.ok) return { erro: r.erro ?? "Não foi possível consultar." };
  revalidatePath("/empresas");
  redirect(`/empresas/${empresaId}`);
}

export async function salvarEmpresa(id: string, _: unknown, form: FormData) {
  await exigir(...EQUIPE);
  const capital = txt(form, "capitalSocial");
  await db.empresa.update({
    where: { id },
    data: {
      nomeFantasia: txt(form, "nomeFantasia"),
      regimeTributario: txt(form, "regimeTributario"),
      inscricaoEstadual: txt(form, "inscricaoEstadual"),
      inscricaoMunicipal: txt(form, "inscricaoMunicipal"),
      email: txt(form, "email"),
      telefone: txt(form, "telefone"),
      siteUrl: txt(form, "siteUrl"),
      instagram: txt(form, "instagram"),
      capitalSocial: capital ? Number(capital.replace(/\./g, "").replace(",", ".")) : null,
      observacoes: txt(form, "observacoes"),
    },
  });
  revalidatePath(`/empresas/${id}`);
  return { ok: "Dados salvos." };
}

export async function vincularSocio(empresaId: string, form: FormData) {
  await exigir(...EQUIPE);
  const socioId = String(form.get("socioId") || "");
  if (!socioId) return;
  const part = txt(form, "participacao");
  await db.empresaSocio.upsert({
    where: { empresaId_socioId: { empresaId, socioId } },
    update: { qualificacao: txt(form, "qualificacao"), participacao: part ? Number(part.replace(",", ".")) : null },
    create: { empresaId, socioId, qualificacao: txt(form, "qualificacao"), participacao: part ? Number(part.replace(",", ".")) : null },
  });
  revalidatePath(`/empresas/${empresaId}`);
}

export async function desvincularSocio(empresaId: string, socioId: string) {
  await exigir(...EQUIPE);
  await db.empresaSocio.delete({ where: { empresaId_socioId: { empresaId, socioId } } });
  revalidatePath(`/empresas/${empresaId}`);
}

/** Exclui a empresa e tudo ligado a ela (financeiro, certidões, vínculos). Só administrador. */
export async function excluirEmpresa(id: string) {
  await exigir("ADMIN");
  await db.empresa.delete({ where: { id } });
  revalidatePath("/empresas");
  redirect("/empresas");
}
