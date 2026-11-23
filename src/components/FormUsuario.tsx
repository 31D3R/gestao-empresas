"use client";
import { useActionState, useState } from "react";
import { criarUsuario } from "@/app/actions/usuarios";

export function FormUsuario({ socios }: { socios: { id: string; nome: string }[] }) {
  const [estado, acao, pendente] = useActionState(criarUsuario, null);
  const [perfil, setPerfil] = useState("CONTADOR");
  return (
    <form action={acao} className="grid gap-2 sm:grid-cols-3">
      <input name="nome" required placeholder="Nome" className="input" />
      <input name="email" type="email" required placeholder="E-mail" className="input" />
      <input name="senha" type="password" minLength={8} required placeholder="Senha inicial" className="input" />
      <select name="perfil" value={perfil} onChange={(e) => setPerfil(e.target.value)} className="input">
        <option value="ADMIN">Administrador</option>
        <option value="CONTADOR">Contador</option>
        <option value="MARKETING">Marketing</option>
        <option value="SOCIO">Sócio (só relatórios)</option>
      </select>
      {perfil === "SOCIO" && (
        <select name="socioId" required className="input" defaultValue="">
          <option value="" disabled>Qual sócio?</option>
          {socios.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      )}
      <button className="btn" disabled={pendente}>Criar acesso</button>
      {estado?.erro && <p className="text-sm text-red-600 sm:col-span-3">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm text-teal-700 sm:col-span-3">{estado.ok}</p>}
    </form>
  );
}
