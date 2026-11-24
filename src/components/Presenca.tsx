"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Estado } from "@/app/actions/presenca";
import { verificarDominio, pedirDominio, hospedar, criarCaixa, gerarComIA, criarPostagem, contratar, pedirSite, publicarVersao } from "@/app/actions/presenca";

function Enviar({ children, cls = "btn" }: { children: React.ReactNode; cls?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={cls}>{pending ? "Aguarde..." : children}</button>;
}

function Aviso({ e }: { e: Estado }) {
  if (!e) return null;
  if (e.erro) return <p className="text-sm text-red-700">{e.erro}</p>;
  return e.msg ? <p className="text-sm text-teal-800">{e.msg}</p> : null;
}

export function BuscaDominio({ empresaId, automatico }: { empresaId: string; automatico: boolean }) {
  const [e, acao] = useActionState(verificarDominio, null);
  return (
    <div className="space-y-2">
      <form action={acao} className="flex gap-2">
        <input name="dominio" placeholder="minhaempresa.com.br" className="input" required />
        <Enviar cls="btn-sec">Verificar</Enviar>
      </form>
      <Aviso e={e} />
      {e?.dominio && (
        <div className="rounded-lg border border-slate-200 p-3 text-sm">
          {e.livre === true && <p className="text-teal-800"><b>{e.dominio}</b> está livre.</p>}
          {e.livre === false && <p className="text-red-700"><b>{e.dominio}</b> já tem dono.</p>}
          {e.livre === null && <p className="text-amber-700">Não consegui verificar {e.dominio} agora.</p>}
          {e.livre !== false && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <form action={pedirDominio.bind(null, empresaId, e.dominio)}><Enviar>{automatico ? "Comprar domínio" : "Registrar pedido"}</Enviar></form>
              {!automatico && e.link && <a href={e.link} target="_blank" className="text-xs text-teal-800 underline">registrar no Registro.br (no CNPJ da empresa)</a>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BotaoHospedar({ id }: { id: string }) {
  const [e, acao] = useActionState(hospedar.bind(null, id), null);
  return (
    <form action={acao} className="space-y-1">
      <Enviar>Criar hospedagem no Plano M</Enviar>
      <Aviso e={e} />
    </form>
  );
}

export function NovaCaixa({ dominio, empresaId }: { dominio: string; empresaId: string }) {
  const [e, acao] = useActionState(criarCaixa.bind(null, dominio, empresaId), null);
  return (
    <form action={acao} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input name="usuario" placeholder="contato" className="input w-40" required />
        <span className="text-sm text-slate-500">@{dominio}</span>
        <input name="senha" type="password" placeholder="senha (vazio = gerar)" className="input w-48" autoComplete="new-password" />
        <select name="cota" className="input w-32" defaultValue="1024">
          <option value="512">512 MB</option><option value="1024">1 GB</option><option value="2048">2 GB</option><option value="5120">5 GB</option>
        </select>
        <Enviar cls="btn-sec">Criar caixa</Enviar>
      </div>
      <Aviso e={e} />
      {e?.senha && <p className="rounded bg-amber-50 p-2 text-sm">Senha gerada (anote, não aparece de novo): <code className="font-mono">{e.senha}</code></p>}
    </form>
  );
}

export function GerarPosts({ empresaId, site, inicio }: { empresaId: string; site: string; inicio: string }) {
  const [e, acao] = useActionState(gerarComIA.bind(null, empresaId), null);
  return (
    <form action={acao} className="grid gap-2 sm:grid-cols-4">
      <div className="sm:col-span-2"><label className="label">Site de referência</label><input name="site" defaultValue={site} placeholder="https://..." className="input" required /></div>
      <div><label className="label">Quantidade</label><input name="quantidade" type="number" min={1} max={30} defaultValue={6} className="input" /></div>
      <div><label className="label">Um post a cada (dias)</label><input name="intervalo" type="number" min={1} defaultValue={2} className="input" /></div>
      <div><label className="label">Primeiro post em</label><input name="inicio" type="datetime-local" defaultValue={inicio} className="input" /></div>
      <div className="sm:col-span-3"><label className="label">Instruções (opcional)</label><input name="instrucoes" placeholder="Ex.: focar em promoção de dezembro, citar entrega grátis em BH" className="input" /></div>
      <div className="sm:col-span-4 flex flex-wrap items-center gap-3"><Enviar>Gerar posts com IA</Enviar><Aviso e={e} /></div>
    </form>
  );
}

export function NovoPost({ empresaId }: { empresaId: string }) {
  const [e, acao] = useActionState(criarPostagem.bind(null, empresaId), null);
  return (
    <form action={acao} className="grid gap-2 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="label">Legenda</label><textarea name="legenda" rows={4} maxLength={2200} className="input" required /></div>
      <div><label className="label">Imagem (arquivo)</label><input name="arquivo" type="file" accept="image/*" className="input" /></div>
      <div><label className="label">ou link da imagem</label><input name="imagemUrl" type="url" className="input" /></div>
      <div><label className="label">Publicar em (vazio = rascunho)</label><input name="agendadaPara" type="datetime-local" className="input" /></div>
      <div className="flex items-end gap-3"><Enviar>Salvar post</Enviar><Aviso e={e} /></div>
    </form>
  );
}


type PlanoUI = { codigo: string; nome: string; anual: number; mensal: number; espaco: string; emails: number; desc: string };
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function Contratar({ empresaId, planos, precoDominio, precoSite }: { empresaId: string; planos: PlanoUI[]; precoDominio: number; precoSite: number }) {
  const [e, acao] = useActionState(contratar.bind(null, empresaId), null);
  return (
    <form action={acao} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        {planos.map((p, i) => (
          <label key={p.codigo} className="cursor-pointer rounded-xl border border-slate-200 p-4 has-[:checked]:border-teal-600 has-[:checked]:ring-1 has-[:checked]:ring-teal-600">
            <input type="radio" name="plano" value={p.codigo} defaultChecked={i === 1} className="sr-only" />
            <p className="font-semibold">{p.nome}{i === 1 && <span className="tag ml-2 bg-teal-100 text-teal-800">mais escolhido</span>}</p>
            <p className="text-xs text-slate-500">{p.desc}</p>
            <p className="mt-2 text-xl font-semibold">{brl(p.mensal)}<span className="text-sm font-normal">/mês</span></p>
            <p className="text-xs text-slate-500">{brl(p.anual)} por ano</p>
            <ul className="mt-2 space-y-0.5 text-xs"><li>{p.espaco} de espaço</li><li>{p.emails} conta(s) de e-mail</li><li>SSL grátis e webmail</li></ul>
          </label>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><label className="label">Domínio</label><input name="dominio" placeholder="minhaempresa.com.br" className="input" required /></div>
        <div className="flex flex-col justify-end gap-1 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="jaTenho" /> A empresa já tem este domínio</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="siteIA" defaultChecked /> Incluir site com IA{precoSite > 0 ? ` (${brl(precoSite)})` : ""}</label>
        </div>
      </div>
      <p className="text-xs text-slate-500">Ao contratar, as despesas entram no financeiro da empresa como contas a pagar (plano anual{precoDominio ? `, registro .br ${brl(precoDominio)}/ano quando o domínio for novo` : ""}{precoSite > 0 ? ", site com IA" : ""}).</p>
      <div className="flex flex-wrap items-center gap-3"><Enviar>Contratar</Enviar><Aviso e={e} /></div>
    </form>
  );
}

export function PedidoSite({ dominioId, temVersao }: { dominioId: string; temVersao: boolean }) {
  const [e, acao] = useActionState(pedirSite.bind(null, dominioId), null);
  return (
    <form action={acao} className="space-y-2">
      <textarea name="pedido" rows={4} className="input" placeholder={temVersao ? "Peça um ajuste: troque a foto do topo, mude a cor do botão, acrescente a seção de serviços..." : "Conte sobre a empresa e como quer o site: o que faz, público, serviços, diferenciais, cores, WhatsApp..."} required />
      <div className="flex flex-wrap items-center gap-3">
        <input name="imagens" type="file" accept="image/*" multiple className="input w-auto text-xs" />
        {temVersao && <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="novo" /> começar do zero</label>}
        <Enviar>{temVersao ? "Pedir ajuste" : "Criar site com IA"}</Enviar>
      </div>
      <p className="text-xs text-slate-500">Envie o logotipo e fotos (até 4 MB cada). A IA leva de 1 a 3 minutos.</p>
      <Aviso e={e} />
    </form>
  );
}

export function BotaoPublicarSite({ versaoId }: { versaoId: string }) {
  const [e, acao] = useActionState(publicarVersao.bind(null, versaoId), null);
  return (
    <form action={acao} className="inline-flex flex-col gap-1">
      <Enviar cls="btn-sec">Publicar</Enviar>
      <Aviso e={e} />
    </form>
  );
}
