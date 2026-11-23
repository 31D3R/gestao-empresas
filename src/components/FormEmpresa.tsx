"use client";
import { useActionState } from "react";
import { salvarEmpresa } from "@/app/actions/empresas";
import { Campo } from "./Campo";

type E = Record<string, string | number | null>;

export function FormEmpresa({ empresa }: { empresa: E }) {
  const [estado, acao, pendente] = useActionState(salvarEmpresa.bind(null, String(empresa.id)), null);
  return (
    <form action={acao} className="grid gap-3 sm:grid-cols-2">
      <Campo nome="nomeFantasia" rotulo="Nome fantasia" valor={empresa.nomeFantasia} />
      <div>
        <label className="label">Regime tributário</label>
        <select name="regimeTributario" defaultValue={String(empresa.regimeTributario ?? "")} className="input">
          <option value="">—</option>
          <option>MEI</option>
          <option>Simples Nacional</option>
          <option>Lucro Presumido</option>
          <option>Lucro Real</option>
        </select>
      </div>
      <Campo nome="inscricaoEstadual" rotulo="Inscrição estadual" valor={empresa.inscricaoEstadual} />
      <Campo nome="inscricaoMunicipal" rotulo="Inscrição municipal" valor={empresa.inscricaoMunicipal} />
      <Campo nome="email" rotulo="E-mail" valor={empresa.email} tipo="email" />
      <Campo nome="telefone" rotulo="Telefone" valor={empresa.telefone} />
      <Campo nome="siteUrl" rotulo="Site" valor={empresa.siteUrl} placeholder="https://" />
      <Campo nome="instagram" rotulo="Instagram" valor={empresa.instagram} placeholder="@perfil" />
      <Campo nome="capitalSocial" rotulo="Capital social (R$)" valor={empresa.capitalSocial} />
      <div className="sm:col-span-2">
        <label className="label">Observações</label>
        <textarea name="observacoes" defaultValue={String(empresa.observacoes ?? "")} className="input" rows={3} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn" disabled={pendente}>Salvar</button>
        {estado?.ok && <span className="text-sm text-teal-700">{estado.ok}</span>}
      </div>
    </form>
  );
}
