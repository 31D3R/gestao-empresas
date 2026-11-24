import Link from "next/link";
import { db } from "@/lib/db";
import { exigir } from "@/lib/auth";
import { dataHoraBR } from "@/lib/datas";

export default async function Marketing() {
  await exigir("ADMIN", "MARKETING");
  const empresas = await db.empresa.findMany({
    orderBy: { razaoSocial: "asc" },
    select: {
      id: true, razaoSocial: true, nomeFantasia: true, siteUrl: true,
      dominios: { select: { nome: true, status: true, plano: true, venceEm: true } },
      instagramConta: { select: { usuario: true } },
      postagens: { where: { status: { in: ["AGENDADA", "ERRO"] } }, select: { status: true, agendadaPara: true }, orderBy: { agendadaPara: "asc" } },
    },
  });
  return (
    <div className="space-y-6">
      <h1 className="h1">Marketing</h1>
      <div className="card overflow-x-auto">
        <table className="tabela">
          <thead><tr><th>Empresa</th><th>Site</th><th>Plano / renova</th><th>Instagram</th><th>Agendados</th><th>Próximo post</th><th>Erros</th></tr></thead>
          <tbody>
            {empresas.map((e) => {
              const ag = e.postagens.filter((p) => p.status === "AGENDADA");
              const err = e.postagens.length - ag.length;
              return (
                <tr key={e.id}>
                  <td><Link href={`/empresas/${e.id}/presenca`} className="text-teal-800 hover:underline">{e.nomeFantasia || e.razaoSocial}</Link></td>
                  <td className="text-xs">{e.dominios.find((d) => d.status === "HOSPEDADO")?.nome ?? e.dominios[0]?.nome ?? e.siteUrl ?? "—"}</td>
                  <td className="text-xs">{(() => { const d = e.dominios.find((x) => x.plano); return d ? `${d.plano!.toLowerCase()} · ${dataHoraBR(d.venceEm).slice(0, 10)}` : "—"; })()}</td>
                  <td className="text-xs">{e.instagramConta ? `@${e.instagramConta.usuario}` : "não conectado"}</td>
                  <td>{ag.length}</td>
                  <td className="text-xs">{dataHoraBR(ag[0]?.agendadaPara)}</td>
                  <td>{err > 0 ? <span className="tag bg-red-100 text-red-800">{err}</span> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
