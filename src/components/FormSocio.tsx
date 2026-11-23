"use client";
import { useActionState } from "react";
import { salvarSocio } from "@/app/actions/socios";
import { TEXTO_CONSENTIMENTO } from "@/lib/lgpd";
import { Campo } from "./Campo";

type S = Record<string, string | number | boolean | null>;
const v = (s: S | undefined, k: string) => (s?.[k] as string | number | null) ?? null;

export function FormSocio({ socio }: { socio?: S }) {
  const [estado, acao, pendente] = useActionState(salvarSocio.bind(null, socio ? String(socio.id) : null), null);
  return (
    <form action={acao} className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Campo nome="nome" rotulo="Nome completo *" valor={v(socio, "nome")} required className="sm:col-span-2" />
        <Campo nome="cpf" rotulo="CPF *" valor={v(socio, "cpf")} required disabled={!!socio} inputMode="numeric" />
        <Campo nome="rg" rotulo="RG" valor={v(socio, "rg")} />
        <Campo nome="dataNascimento" rotulo="Nascimento" valor={v(socio, "dataNascimento")} tipo="date" />
        <div>
          <label className="label">Estado civil</label>
          <select name="estadoCivil" defaultValue={String(v(socio, "estadoCivil") ?? "")} className="input">
            <option value="">—</option>
            <option>Solteiro(a)</option><option>Casado(a)</option><option>União estável</option>
            <option>Divorciado(a)</option><option>Viúvo(a)</option>
          </select>
        </div>
        <Campo nome="profissao" rotulo="Profissão" valor={v(socio, "profissao")} />
        <Campo nome="nomeMae" rotulo="Nome da mãe" valor={v(socio, "nomeMae")} className="sm:col-span-2" />
        <Campo nome="email" rotulo="E-mail" valor={v(socio, "email")} tipo="email" />
        <Campo nome="telefone" rotulo="Telefone / WhatsApp" valor={v(socio, "telefone")} />
        <Campo nome="rendaMensal" rotulo="Renda mensal (R$)" valor={v(socio, "rendaMensal")} />
      </section>
      <section className="grid gap-3 sm:grid-cols-6">
        <Campo nome="cep" rotulo="CEP" valor={v(socio, "cep")} />
        <Campo nome="logradouro" rotulo="Endereço" valor={v(socio, "logradouro")} className="sm:col-span-3" />
        <Campo nome="numero" rotulo="Número" valor={v(socio, "numero")} />
        <Campo nome="complemento" rotulo="Compl." valor={v(socio, "complemento")} />
        <Campo nome="bairro" rotulo="Bairro" valor={v(socio, "bairro")} className="sm:col-span-2" />
        <Campo nome="municipio" rotulo="Cidade" valor={v(socio, "municipio")} className="sm:col-span-3" />
        <Campo nome="uf" rotulo="UF" valor={v(socio, "uf")} maxLength={2} />
      </section>
      <div>
        <label className="label">Observações</label>
        <textarea name="observacoes" defaultValue={String(v(socio, "observacoes") ?? "")} className="input" rows={2} />
      </div>
      <label className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <input type="checkbox" name="consentimento" defaultChecked={!!socio?.consentimentoConsulta} className="mt-1" />
        <span>
          <strong>Consentimento LGPD para consulta de crédito.</strong> {TEXTO_CONSENTIMENTO}
          <br />
          <span className="text-xs text-slate-500">Marque somente com o termo assinado pelo sócio arquivado.</span>
        </span>
      </label>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pendente}>{socio ? "Salvar" : "Cadastrar sócio"}</button>
        {estado?.erro && <span className="text-sm text-red-600">{estado.erro}</span>}
        {estado?.ok && <span className="text-sm text-teal-700">{estado.ok}</span>}
      </div>
    </form>
  );
}
