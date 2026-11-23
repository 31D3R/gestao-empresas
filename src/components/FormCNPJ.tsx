"use client";
import { useActionState } from "react";
import { consultarCNPJ } from "@/app/actions/empresas";

export function FormCNPJ() {
  const [estado, acao, pendente] = useActionState(consultarCNPJ, null);
  return (
    <form action={acao} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="label">CNPJ</label>
        <input name="cnpj" required placeholder="00.000.000/0000-00" className="input" inputMode="numeric" />
      </div>
      <button className="btn" disabled={pendente}>{pendente ? "Consultando..." : "Consultar e cadastrar"}</button>
      {estado?.erro && <p className="text-sm text-red-600 sm:ml-2">{estado.erro}</p>}
    </form>
  );
}
