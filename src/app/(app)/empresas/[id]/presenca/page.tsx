import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigir } from "@/lib/auth";
import { dataBR } from "@/lib/documentos";
import { dataHoraBR, paraLocal } from "@/lib/datas";
import * as cpanel from "@/lib/presenca/cpanel";
import { registrador } from "@/lib/presenca/dominios";
import { instagramConfigurado, urlRetorno } from "@/lib/presenca/instagram";
import { iaConfigurada } from "@/lib/presenca/ia";
import { urlImagemPost } from "@/lib/presenca/fila";
import { marcarRegistrado, vincularExistente, removerDominio, apagarCaixa, iniciarInstagram, desconectarInstagram, salvarPostagem, agendarTodos, publicarAgora, excluirPostagem } from "@/app/actions/presenca";
import { BotaoExcluir } from "@/components/BotaoExcluir";
import { BuscaDominio, BotaoHospedar, NovaCaixa, GerarPosts, NovoPost } from "@/components/Presenca";

const ST_DOM = { DISPONIVEL: ["Livre", "bg-slate-100 text-slate-700"], PEDIDO: ["Aguardando registro", "bg-amber-100 text-amber-800"], REGISTRADO: ["Registrado", "bg-sky-100 text-sky-800"], HOSPEDADO: ["No ar (Plano M)", "bg-teal-100 text-teal-800"] } as const;
const ST_POST = { RASCUNHO: ["Rascunho", "bg-slate-100 text-slate-700"], AGENDADA: ["Agendado", "bg-sky-100 text-sky-800"], PUBLICANDO: ["Publicando", "bg-amber-100 text-amber-800"], PUBLICADA: ["Publicado", "bg-teal-100 text-teal-800"], ERRO: ["Erro", "bg-red-100 text-red-800"] } as const;

function Pendente({ falta }: { falta: string }) {
  return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Falta configurar na Vercel: <code>{falta}</code>. Enquanto isso, esta parte fica só para consulta.</p>;
}

export default async function Presenca({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const sessao = await exigir("ADMIN", "MARKETING");
  const { id } = await params;
  const sp = await searchParams;
  const e = await db.empresa.findUnique({
    where: { id },
    include: {
      dominios: { orderBy: { criadoEm: "asc" } },
      instagramConta: true,
      postagens: { orderBy: [{ agendadaPara: "asc" }, { criadoEm: "asc" }], select: { id: true, tema: true, legenda: true, imagemUrl: true, imagemTipo: true, agendadaPara: true, status: true, erro: true, publicadaEm: true } },
    },
  });
  if (!e) notFound();

  const temCpanel = cpanel.cpanelConfigurado();
  let noPlanoM: cpanel.DominioHospedado[] = [];
  let erroCpanel = "";
  const emails = new Map<string, cpanel.CaixaEmail[]>();
  if (temCpanel) {
    try {
      noPlanoM = await cpanel.listarDominios();
      for (const d of e.dominios.filter((d) => d.status === "HOSPEDADO")) emails.set(d.nome, await cpanel.listarEmails(d.nome));
    } catch (err) {
      erroCpanel = (err as Error).message;
    }
  }
  const jaLigados = new Set((await db.dominio.findMany({ select: { nome: true } })).map((d) => d.nome));
  const reg = registrador();
  const amanha9 = paraLocal(new Date(new Date().setUTCHours(12, 0, 0, 0) + 86400000));
  const rascunhosComData = e.postagens.filter((p) => p.status === "RASCUNHO" && p.agendadaPara).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/empresas/${e.id}`} className="text-sm text-slate-500">← {e.nomeFantasia || e.razaoSocial}</Link>
        <h1 className="h1">Site, e-mails e Instagram</h1>
      </div>

      {/* DOMÍNIO E HOSPEDAGEM */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Domínio e hospedagem</h2>
        {!temCpanel && <Pendente falta="CPANEL_HOST, CPANEL_USER e CPANEL_TOKEN" />}
        {erroCpanel && <p className="text-sm text-red-700">cPanel: {erroCpanel}</p>}
        {e.dominios.length > 0 && (
          <table className="tabela">
            <thead><tr><th>Domínio</th><th>Situação</th><th>Registro</th><th></th></tr></thead>
            <tbody>
              {e.dominios.map((d) => (
                <tr key={d.id}>
                  <td><a href={`https://${d.nome}`} target="_blank" className="text-teal-800 hover:underline">{d.nome}</a></td>
                  <td><span className={`tag ${ST_DOM[d.status][1]}`}>{ST_DOM[d.status][0]}</span></td>
                  <td className="text-xs text-slate-500">{d.registrador ?? "—"}{d.expiraEm ? ` · vence ${dataBR(d.expiraEm)}` : ""}</td>
                  <td className="space-y-2">
                    {d.status === "PEDIDO" && (
                      <form action={marcarRegistrado.bind(null, d.id)} className="flex flex-wrap items-center gap-2">
                        <input name="expiraEm" type="date" className="input w-40" title="Vencimento" />
                        <button className="btn-sec">Já registrei</button>
                      </form>
                    )}
                    {d.status === "REGISTRADO" && temCpanel && <BotaoHospedar id={d.id} />}
                    {sessao.perfil === "ADMIN" && <BotaoExcluir rotulo="Remover" acao={removerDominio.bind(null, d.id)} aviso={`Remover ${d.nome} desta empresa? Só tira do sistema: o site e os e-mails no Plano M continuam.`} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Novo domínio</p>
            <BuscaDominio empresaId={e.id} automatico={reg.automatico} />
            {!reg.automatico && <p className="mt-2 text-xs text-slate-500">A compra automática entra quando escolhermos o registrador com API. Hoje o pedido fica registrado aqui, a equipe registra no Registro.br e marca &quot;Já registrei&quot;. Depois é só criar a hospedagem e apontar o DNS para {cpanel.NAMESERVERS.join(" e ")}.</p>}
          </div>
          {temCpanel && noPlanoM.length > 0 && (
            <form action={vincularExistente.bind(null, e.id)}>
              <p className="mb-2 text-sm font-medium">Já está no Plano M? Ligar a esta empresa</p>
              <div className="flex gap-2">
                <select name="dominio" className="input">
                  {noPlanoM.filter((d) => d.tipo === "adicional" && !jaLigados.has(d.dominio)).map((d) => <option key={d.dominio}>{d.dominio}</option>)}
                </select>
                <button className="btn-sec">Ligar</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* E-MAILS */}
      {e.dominios.some((d) => d.status === "HOSPEDADO") && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Caixas de e-mail</h2>
          {!temCpanel && <Pendente falta="CPANEL_TOKEN" />}
          {e.dominios.filter((d) => d.status === "HOSPEDADO").map((d) => (
            <div key={d.id} className="space-y-2">
              <p className="text-sm font-medium">{d.nome}</p>
              {(emails.get(d.nome) ?? []).length > 0 ? (
                <table className="tabela">
                  <thead><tr><th>E-mail</th><th>Uso</th><th></th></tr></thead>
                  <tbody>
                    {(emails.get(d.nome) ?? []).map((c) => (
                      <tr key={c.email}>
                        <td>{c.email}</td><td className="text-xs">{c.usado} de {c.cota}</td>
                        <td>{sessao.perfil === "ADMIN" && <BotaoExcluir acao={apagarCaixa.bind(null, c.email, e.id)} aviso={`Apagar a caixa ${c.email}? Todas as mensagens dela serão perdidas. Não dá para desfazer.`} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : temCpanel && <p className="text-sm text-slate-500">Nenhuma caixa ainda.</p>}
              {temCpanel && <NovaCaixa dominio={d.nome} empresaId={e.id} />}
            </div>
          ))}
          {cpanel.webmailUrl() && <a href={cpanel.webmailUrl()!} target="_blank" className="text-sm text-teal-800 underline">Abrir webmail</a>}
        </div>
      )}

      {/* INSTAGRAM */}
      <div className="card space-y-3">
        <h2 className="font-semibold">Instagram</h2>
        {sp.ig === "ok" && <p className="text-sm text-teal-800">Instagram conectado.</p>}
        {sp.ig === "erro" && <p className="text-sm text-red-700">Não conectou: {sp.msg}</p>}
        {(sp.ig === "config" || !instagramConfigurado()) && <Pendente falta="IG_APP_ID e IG_APP_SECRET" />}
        {e.instagramConta ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Conectado como <b>@{e.instagramConta.usuario}</b>, token válido até {dataBR(e.instagramConta.tokenExpiraEm)} (renova sozinho).</span>
            <form action={iniciarInstagram.bind(null, e.id)}><button className="btn-sec">Reconectar</button></form>
            <form action={desconectarInstagram.bind(null, e.id)}><button className="btn-sec">Desconectar</button></form>
          </div>
        ) : (
          <form action={iniciarInstagram.bind(null, e.id)} className="space-y-1">
            <button className="btn">Conectar Instagram</button>
            <p className="text-xs text-slate-500">A conta precisa ser Profissional (Empresa ou Criador). URL de retorno cadastrada no app da Meta: <code>{urlRetorno()}</code></p>
          </form>
        )}
      </div>

      {/* POSTAGENS */}
      <div className="card space-y-4">
        <h2 className="font-semibold">Postagens</h2>
        <details open={e.postagens.length === 0}>
          <summary className="cursor-pointer text-sm text-teal-800">Gerar posts com IA a partir do site</summary>
          <div className="mt-3">{iaConfigurada() ? <GerarPosts empresaId={e.id} site={e.siteUrl ?? ""} inicio={amanha9} /> : <Pendente falta="ANTHROPIC_API_KEY" />}</div>
        </details>
        <details>
          <summary className="cursor-pointer text-sm text-teal-800">+ Criar post manualmente</summary>
          <div className="mt-3"><NovoPost empresaId={e.id} /></div>
        </details>
        {rascunhosComData > 0 && (
          <form action={agendarTodos.bind(null, e.id)} className="flex items-center gap-3 rounded-lg bg-sky-50 p-3 text-sm">
            <span>{rascunhosComData} rascunho(s) com data definida.</span>
            <button className="btn">Agendar todos</button>
          </form>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {e.postagens.map((p) => {
            const img = urlImagemPost(p);
            const travado = p.status === "PUBLICADA" || p.status === "PUBLICANDO";
            return (
              <div key={p.id} className="space-y-2 rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`tag ${ST_POST[p.status][1]}`}>{ST_POST[p.status][0]}</span>
                  <span className="text-xs text-slate-500">{p.status === "PUBLICADA" ? `publicado ${dataHoraBR(p.publicadaEm)}` : dataHoraBR(p.agendadaPara)}</span>
                </div>
                {p.tema && <p className="text-xs font-medium text-slate-600">{p.tema}</p>}
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/midia/${p.id}.jpg`} alt="" className="w-full rounded" />
                ) : <div className="flex aspect-[4/5] items-center justify-center rounded bg-slate-100 text-xs text-slate-500">Sem imagem (obrigatória no Instagram)</div>}
                {p.erro && <p className="text-xs text-red-700">{p.erro}</p>}
                <form action={salvarPostagem.bind(null, p.id)} className="space-y-2">
                  <textarea name="legenda" defaultValue={p.legenda} rows={6} maxLength={2200} className="input text-xs" disabled={travado} />
                  {!travado && (
                    <>
                      <input name="imagemUrl" type="url" placeholder="trocar imagem: link" className="input text-xs" />
                      <input name="arquivo" type="file" accept="image/*" className="input text-xs" />
                      <input name="agendadaPara" type="datetime-local" defaultValue={p.agendadaPara ? paraLocal(p.agendadaPara) : ""} className="input text-xs" />
                      <div className="flex flex-wrap gap-2">
                        <button name="acao" value="salvar" className="btn-sec">Salvar</button>
                        {p.status !== "AGENDADA" ? <button name="acao" value="agendar" className="btn">Agendar</button> : <button name="acao" value="pausar" className="btn-sec">Pausar</button>}
                      </div>
                    </>
                  )}
                </form>
                {!travado && (
                  <div className="flex flex-wrap gap-2">
                    {e.instagramConta && img && <form action={publicarAgora.bind(null, p.id)}><button className="btn-sec">Publicar agora</button></form>}
                    <BotaoExcluir acao={excluirPostagem.bind(null, p.id)} aviso="Excluir este post?" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
