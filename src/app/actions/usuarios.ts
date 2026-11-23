"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Perfil } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir } from "@/lib/auth";

export async function criarUsuario(_: unknown, form: FormData) {
  await exigir("ADMIN");
  const email = String(form.get("email") || "").trim().toLowerCase();
  const senha = String(form.get("senha") || "");
  const perfil = String(form.get("perfil")) as Perfil;
  const socioId = String(form.get("socioId") || "") || null;
  if (senha.length < 8) return { erro: "Senha com no mínimo 8 caracteres." };
  if (perfil === "SOCIO" && !socioId) return { erro: "Escolha a qual sócio este acesso pertence." };
  if (await db.usuario.findUnique({ where: { email } })) return { erro: "E-mail já cadastrado." };
  await db.usuario.create({
    data: { nome: String(form.get("nome")), email, perfil, senhaHash: await bcrypt.hash(senha, 10), socioId: perfil === "SOCIO" ? socioId : null },
  });
  revalidatePath("/usuarios");
  return { ok: "Usuário criado." };
}

export async function alternarAtivo(id: string) {
  const s = await exigir("ADMIN");
  if (id === s.id) return;
  const u = await db.usuario.findUniqueOrThrow({ where: { id } });
  await db.usuario.update({ where: { id }, data: { ativo: !u.ativo } });
  revalidatePath("/usuarios");
}
