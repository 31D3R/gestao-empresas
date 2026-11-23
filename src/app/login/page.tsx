"use client";
import { useActionState } from "react";
import { entrar } from "../actions/auth";

export default function Login() {
  const [estado, acao, pendente] = useActionState(entrar, null);
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={acao} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="h1">Gestão de Empresas</h1>
          <p className="text-sm text-slate-500">Entre com seu acesso</p>
        </div>
        <div>
          <label className="label">E-mail</label>
          <input name="email" type="email" required className="input" autoComplete="username" />
        </div>
        <div>
          <label className="label">Senha</label>
          <input name="senha" type="password" required className="input" autoComplete="current-password" />
        </div>
        {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
        <button className="btn w-full" disabled={pendente}>{pendente ? "Entrando..." : "Entrar"}</button>
      </form>
    </main>
  );
}
