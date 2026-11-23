"use client";
import { useActionState } from "react";
import { entrar } from "../actions/auth";
import { criarPrimeiroAdmin } from "../actions/setup";

export function FormLogin() {
  const [estado, acao, pendente] = useActionState(entrar, null);
  return (
    <form action={acao} className="card w-full max-w-sm space-y-4">
      <div>
        <h1 className="h1">Gestão de Empresas</h1>
        <p className="text-sm text-slate-500">Entre com seu acesso</p>
      </div>
      <div><label className="label">E-mail</label><input name="email" type="email" required className="input" autoComplete="username" /></div>
      <div><label className="label">Senha</label><input name="senha" type="password" required className="input" autoComplete="current-password" /></div>
      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button className="btn w-full" disabled={pendente}>{pendente ? "Entrando..." : "Entrar"}</button>
    </form>
  );
}

export function FormPrimeiroAcesso() {
  const [estado, acao, pendente] = useActionState(criarPrimeiroAdmin, null);
  return (
    <form action={acao} className="card w-full max-w-sm space-y-4">
      <div>
        <h1 className="h1">Primeiro acesso</h1>
        <p className="text-sm text-slate-500">Crie o usuário administrador do sistema.</p>
      </div>
      <div><label className="label">Nome</label><input name="nome" required className="input" /></div>
      <div><label className="label">E-mail</label><input name="email" type="email" required className="input" /></div>
      <div><label className="label">Senha (mín. 8 caracteres)</label><input name="senha" type="password" minLength={8} required className="input" /></div>
      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button className="btn w-full" disabled={pendente}>{pendente ? "Criando..." : "Criar administrador"}</button>
    </form>
  );
}
