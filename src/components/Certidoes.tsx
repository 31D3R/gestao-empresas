import type { Certidao } from "@prisma/client";
import { dataBR } from "@/lib/documentos";
import { TIPOS_CERTIDAO, SITUACOES, statusCertidao, ESTILO_STATUS, ultimasPorTipo } from "@/lib/certidoes";
import { registrarCertidao } from "@/app/actions/certidoes";

export function Certidoes({ empresaId, certidoes }: { empresaId: string; certidoes: Certidao[] }) {
  const ultimas = ultimasPorTipo(certidoes);
  const hoje = new Date().toISOString().slice(0, 10);
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Certidões negativas</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {TIPOS_CERTIDAO.map((t) => {
          const c = ultimas.get(t.tipo);
          const st = ESTILO_STATUS[statusCertidao(c)];
          return (
            <div key={t.tipo} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium">{t.nome}</p>
              <span className={`tag mt-1 ${st.cls}`}>{st.rotulo}</span>
              {c && <p className="mt-1 text-xs text-slate-500">Emitida {dataBR(c.emitidaEm)}{c.validade ? ` · válida até ${dataBR(c.validade)}` : ""}</p>}
              {c?.arquivoUrl && <a href={c.arquivoUrl} target="_blank" className="text-xs text-teal-800 underline">ver arquivo</a>}
              {t.link && <a href={t.link} target="_blank" className="mt-1 block text-xs text-teal-800 underline">emitir no site oficial</a>}
            </div>
          );
        })}
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-teal-800">+ Registrar certidão emitida</summary>
        <form action={registrarCertidao.bind(null, empresaId)} className="mt-2 grid gap-2 sm:grid-cols-3">
          <select name="tipo" className="input">{TIPOS_CERTIDAO.map((t) => <option key={t.tipo} value={t.tipo}>{t.nome}</option>)}</select>
          <select name="situacao" className="input">{SITUACOES.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}</select>
          <input name="codigo" placeholder="Código de controle" className="input" />
          <div><label className="label">Emitida em</label><input name="emitidaEm" type="date" defaultValue={hoje} required className="input" /></div>
          <div><label className="label">Válida até</label><input name="validade" type="date" className="input" /></div>
          <div><label className="label">Link do PDF (Drive etc.)</label><input name="arquivoUrl" type="url" className="input" /></div>
          <button className="btn sm:col-span-3 sm:w-fit">Registrar</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">A emissão automática (pagando por consulta) entra quando escolhermos o fornecedor.</p>
      </details>
    </div>
  );
}
