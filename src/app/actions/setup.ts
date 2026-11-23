"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { criarSessao } from "@/lib/auth";

/** Primeiro acesso: só funciona enquanto não existe nenhum usuário. */
export async function criarPrimeiroAdmin(_: unknown, form: FormData) {
  if ((await db.usuario.count()) > 0) redirect("/login");
  const nome = String(form.get("nome") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const senha = String(form.get("senha") || "");
  if (!nome || !email) return { erro: "Preencha nome e e-mail." };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  const u = await db.usuario.create({ data: { nome, email, senhaHash: await bcrypt.hash(senha, 10), perfil: "ADMIN" } });
  await criarSessao({ id: u.id, nome: u.nome, perfil: u.perfil });
  redirect("/");
}
