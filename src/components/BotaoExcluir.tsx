"use client";
import { useTransition } from "react";

export function BotaoExcluir({ acao, aviso, rotulo = "Excluir" }: { acao: () => Promise<void>; aviso: string; rotulo?: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => { if (confirm(aviso)) iniciar(() => acao()); }}
      className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {pendente ? "Excluindo..." : rotulo}
    </button>
  );
}
