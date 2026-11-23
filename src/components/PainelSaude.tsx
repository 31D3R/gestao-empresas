import type { Saude } from "@/lib/saude";

const cor = (f: Saude["faixa"]) => (f === "Saudável" ? "text-teal-700" : f === "Atenção" ? "text-amber-600" : "text-red-600");

export function PainelSaude({ saude, completo = true }: { saude: Saude; completo?: boolean }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="font-semibold">Saúde da empresa</h2>
        <p className={`text-3xl font-bold ${cor(saude.faixa)}`}>{saude.score}<span className="text-base font-normal text-slate-500">/100 · {saude.faixa}</span></p>
      </div>
      {completo && (
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {saude.itens.map((i) => (
            <li key={i.nome} className="flex justify-between rounded bg-slate-50 px-3 py-1.5">
              <span>{i.pontos === i.max ? "✅" : i.pontos > 0 ? "🟡" : "🔴"} {i.nome}</span>
              <span className="text-slate-500">{i.pontos}/{i.max}</span>
            </li>
          ))}
        </ul>
      )}
      <div>
        <p className="mb-1 text-sm font-medium">O que fazer agora</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">{saude.dicas.map((d) => <li key={d}>{d}</li>)}</ol>
      </div>
    </div>
  );
}
