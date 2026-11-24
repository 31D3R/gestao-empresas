"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";
import { soDigitos, validarCPF } from "@/lib/documentos";
import { provedorCredito } from "@/lib/consultas";
import { TEXTO_CONSENTIMENTO } from "@/lib/lgpd";

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const dataOuNull = (v: string | null) => (v ? new Date(v) : null);

function camposSocio(form: FormData) {
  const renda = txt(form, "rendaMensal");
  return {
    nome: String(form.get("nome") || "").trim(),
    rg: txt(form, "rg"),
    dataNascimento: dataOuNull(txt(form, "dataNascimento")),
    estadoCivil: txt(form, "estadoCivil"),
    profissao: txt(form, "profissao"),
    nomeMae: txt(form, "nomeMae"),
    email: txt(form, "email"),
    telefone: txt(form, "telefone"),
    cep: txt(form, "cep"),
    logradouro: txt(form, "logradouro"),
    numero: txt(form, "numero"),
    complemento: txt(form, "complemento"),
    bairro: txt(form, "bairro"),
    municipio: txt(form, "municipio"),
    uf: txt(form, "uf"),
    rendaMensal: renda ? Number(renda.replace(/\./g, "").replace(",", ".")) : null,
    observacoes: txt(form, "observacoes"),
  };
}

export async function salvarSocio(id: string | null, _: unknown, form: FormData) {
  await exigir(...EQUIPE);
  const campos = camposSocio(form);
  if (!campos.nome) return { erro: "Informe o nome." };
  const consentiu = form.get("consentimento") === "on";

  if (!id) {
    const cpf = soDigitos(String(form.get("cpf") || ""));
    if (!validarCPF(cpf)) return { erro: "CPF inválido." };
    if (await db.socio.findUnique({ where: { cpf } })) return { erro: "Já existe sócio com este CPF." };
    const novo = await db.socio.create({
      data: {
        cpf,
        ...campos,
        consentimentoConsulta: consentiu,
        consentimentoEm: consentiu ? new Date() : null,
        consentimentoTexto: consentiu ? TEXTO_CONSENTIMENTO : null,
        situacaoCredito: "NAO_CONSULTADO",
      },
    });
    redirect(`/socios/${novo.id}`);
  }

  const atual = await db.socio.findUniqueOrThrow({ where: { id } });
  await db.socio.update({
    where: { id },
    data: {
      ...campos,
      ...(consentiu && !atual.consentimentoConsulta
        ? { consentimentoConsulta: true, consentimentoEm: new Date(), consentimentoTexto: TEXTO_CONSENTIMENTO }
        : {}),
      ...(!consentiu && atual.consentimentoConsulta ? { consentimentoConsulta: false } : {}),
    },
  });
  revalidatePath(`/socios/${id}`);
  return { ok: "Dados salvos." };
}

/** Consulta de crédito do CPF. Só roda com consentimento registrado. */
export async function consultarCredito(id: string) {
  const s = await exigir(...EQUIPE);
  const socio = await db.socio.findUniqueOrThrow({ where: { id } });
  if (!socio.consentimentoConsulta) return { erro: "Sem consentimento LGPD registrado para este sócio." };
  const r = await provedorCredito().consultarCPF(socio.cpf);
  await db.consulta.create({
    data: {
      tipo: "CPF_CREDITO",
      provedor: r.provedor,
      documento: socio.cpf,
      sucesso: r.ok,
      custo: r.custo,
      erro: r.erro,
      resposta: (r.dados as unknown as Prisma.InputJsonValue) ?? undefined,
      socioId: id,
      usuarioId: s.id,
    },
  });
  if (r.ok && r.dados) {
    await db.socio.update({
      where: { id },
      data: { situacaoCredito: r.dados.situacao, scoreCredito: r.dados.score ?? null, creditoAtualizadoEm: new Date() },
    });
  }
  revalidatePath(`/socios/${id}`);
  return r.ok ? { ok: "Consulta realizada." } : { erro: r.erro };
}

/** Exclui o sócio, seus vínculos com empresas e o acesso dele ao portal. Só administrador. */
export async function excluirSocio(id: string) {
  await exigir("ADMIN");
  await db.$transaction([
    db.usuario.deleteMany({ where: { socioId: id, perfil: "SOCIO" } }),
    db.socio.delete({ where: { id } }),
  ]);
  revalidatePath("/socios");
  redirect("/socios");
}
