"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { criarSessao, encerrarSessao } from "@/lib/auth";

export async function entrar(_: unknown, form: FormData) {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const senha = String(form.get("senha") || "");
  const u = await db.usuario.findUnique({ where: { email } });
  if (!u || !u.ativo || !(await bcrypt.compare(senha, u.senhaHash))) return { erro: "E-mail ou senha inválidos." };
  await criarSessao({ id: u.id, nome: u.nome, perfil: u.perfil, socioId: u.socioId });
  redirect(u.perfil === "SOCIO" ? "/relatorios" : "/");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
