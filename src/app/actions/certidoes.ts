"use server";
import { revalidatePath } from "next/cache";
import type { SituacaoCertidao, TipoCertidao } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir, EQUIPE } from "@/lib/auth";

export async function registrarCertidao(empresaId: string, form: FormData) {
  await exigir(...EQUIPE);
  const validade = String(form.get("validade") || "");
  await db.certidao.create({
    data: {
      empresaId,
      tipo: String(form.get("tipo")) as TipoCertidao,
      situacao: String(form.get("situacao")) as SituacaoCertidao,
      emitidaEm: new Date(String(form.get("emitidaEm"))),
      validade: validade ? new Date(validade) : null,
      codigo: String(form.get("codigo") || "") || null,
      arquivoUrl: String(form.get("arquivoUrl") || "") || null,
    },
  });
  revalidatePath(`/empresas/${empresaId}`);
  revalidatePath("/");
}
