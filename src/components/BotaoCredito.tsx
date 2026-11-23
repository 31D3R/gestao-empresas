"use client";
import { useState, useTransition } from "react";
import { consultarCredito } from "@/app/actions/socios";

export function BotaoCredito({ socioId, habilitado }: { socioId: string; habilitado: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        className="btn"
        disabled={!habilitado || pendente}
        onClick={() =>
          iniciar(async () => {
            if (!confirm("Esta consulta pode ser cobrada pelo provedor. Continuar?")) return;
            const r = await consultarCredito(socioId);
            setMsg(r.ok ?? r.erro ?? null);
          })
        }
      >
        {pendente ? "Consultando..." : "Consultar nome limpo (CPF)"}
      </button>
      {!habilitado && <span className="text-xs text-slate-500">Registre o consentimento LGPD para habilitar.</span>}
      {msg && <span className="text-sm">{msg}</span>}
    </div>
  );
}
