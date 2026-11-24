import type { DadosCNPJ, ProvedorCNPJ, ResultadoConsulta } from "./tipos";

// Fontes públicas e gratuitas da Receita. Tentamos uma após a outra, porque cada uma
// tem limite de uso e algumas bloqueiam servidores em nuvem.
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; GestaoEmpresas/1.0)", Accept: "application/json" };

async function buscar(url: string) {
  const r = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const dataBRparaISO = (d?: string) => (d && /^\d{2}\/\d{2}\/\d{4}$/.test(d) ? d.split("/").reverse().join("-") : d);
const num = (v: unknown) => (v == null || v === "" ? undefined : Number(String(v).replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")));

async function brasilApi(cnpj: string): Promise<DadosCNPJ> {
  const j = await buscar(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  return {
    cnpj,
    razaoSocial: j.razao_social,
    nomeFantasia: j.nome_fantasia || undefined,
    situacaoCadastral: j.descricao_situacao_cadastral,
    dataAbertura: j.data_inicio_atividade,
    naturezaJuridica: j.natureza_juridica,
    porte: j.porte,
    regimeTributario: j.opcao_pelo_mei ? "MEI" : j.opcao_pelo_simples ? "Simples Nacional" : undefined,
    capitalSocial: j.capital_social,
    cnaePrincipal: j.cnae_fiscal ? `${j.cnae_fiscal} - ${j.cnae_fiscal_descricao}` : undefined,
    cnaesSecundarios: (j.cnaes_secundarios || []).filter((c: { codigo: number }) => c.codigo)
      .map((c: { codigo: number; descricao: string }) => ({ codigo: String(c.codigo), descricao: c.descricao })),
    email: j.email || undefined,
    telefone: j.ddd_telefone_1 || undefined,
    cep: j.cep ? String(j.cep) : undefined,
    logradouro: [j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(" "),
    numero: j.numero, complemento: j.complemento || undefined, bairro: j.bairro, municipio: j.municipio, uf: j.uf,
    qsa: (j.qsa || []).map((s: Record<string, string>) => ({ nome: s.nome_socio, documento: s.cnpj_cpf_do_socio, qualificacao: s.qualificacao_socio, dataEntrada: s.data_entrada_sociedade })),
    bruto: j,
  };
}

async function cnpjWs(cnpj: string): Promise<DadosCNPJ> {
  const j = await buscar(`https://publica.cnpj.ws/cnpj/${cnpj}`);
  const e = j.estabelecimento || {};
  return {
    cnpj,
    razaoSocial: j.razao_social,
    nomeFantasia: e.nome_fantasia || undefined,
    situacaoCadastral: e.situacao_cadastral ? String(e.situacao_cadastral).toUpperCase() : undefined,
    dataAbertura: e.data_inicio_atividade,
    naturezaJuridica: j.natureza_juridica ? `${j.natureza_juridica.id} - ${j.natureza_juridica.descricao}` : undefined,
    porte: j.porte?.descricao,
    regimeTributario: j.simples?.mei === "Sim" ? "MEI" : j.simples?.simples === "Sim" ? "Simples Nacional" : undefined,
    capitalSocial: num(j.capital_social),
    cnaePrincipal: e.atividade_principal ? `${e.atividade_principal.id} - ${e.atividade_principal.descricao}` : undefined,
    cnaesSecundarios: (e.atividades_secundarias || []).map((a: { id: string; descricao: string }) => ({ codigo: String(a.id), descricao: a.descricao })),
    email: e.email || undefined,
    telefone: e.ddd1 && e.telefone1 ? `${e.ddd1}${e.telefone1}` : undefined,
    cep: e.cep,
    logradouro: [e.tipo_logradouro, e.logradouro].filter(Boolean).join(" "),
    numero: e.numero, complemento: e.complemento || undefined, bairro: e.bairro, municipio: e.cidade?.nome, uf: e.estado?.sigla,
    qsa: (j.socios || []).map((s: { nome: string; cpf_cnpj_socio?: string; qualificacao_socio?: { descricao: string }; data_entrada?: string }) => ({
      nome: s.nome, documento: s.cpf_cnpj_socio, qualificacao: s.qualificacao_socio?.descricao, dataEntrada: s.data_entrada,
    })),
    bruto: j,
  };
}

async function receitaWs(cnpj: string): Promise<DadosCNPJ> {
  const j = await buscar(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
  if (j.status === "ERROR") throw new Error(j.message || "CNPJ não encontrado");
  const ap = j.atividade_principal?.[0];
  return {
    cnpj,
    razaoSocial: j.nome,
    nomeFantasia: j.fantasia || undefined,
    situacaoCadastral: j.situacao,
    dataAbertura: dataBRparaISO(j.abertura),
    naturezaJuridica: j.natureza_juridica,
    porte: j.porte,
    regimeTributario: j.simei?.optante ? "MEI" : j.simples?.optante ? "Simples Nacional" : undefined,
    capitalSocial: num(j.capital_social),
    cnaePrincipal: ap ? `${String(ap.code).replace(/\D/g, "")} - ${ap.text}` : undefined,
    cnaesSecundarios: (j.atividades_secundarias || []).filter((a: { code: string }) => a.code !== "00.00-0-00")
      .map((a: { code: string; text: string }) => ({ codigo: a.code.replace(/\D/g, ""), descricao: a.text })),
    email: j.email || undefined,
    telefone: j.telefone || undefined,
    cep: j.cep ? String(j.cep).replace(/\D/g, "") : undefined,
    logradouro: j.logradouro, numero: j.numero, complemento: j.complemento || undefined, bairro: j.bairro, municipio: j.municipio, uf: j.uf,
    qsa: (j.qsa || []).map((s: { nome: string; qual?: string }) => ({ nome: s.nome, qualificacao: s.qual })),
    bruto: j,
  };
}

const FONTES: [string, (c: string) => Promise<DadosCNPJ>][] = [
  ["brasilapi", brasilApi],
  ["cnpj.ws", cnpjWs],
  ["receitaws", receitaWs],
];

export const fontesGratuitas: ProvedorCNPJ = {
  nome: "gratuito",
  async consultarCNPJ(cnpj): Promise<ResultadoConsulta<DadosCNPJ>> {
    const erros: string[] = [];
    for (const [nome, fn] of FONTES) {
      try {
        const dados = await fn(cnpj);
        if (dados.razaoSocial) return { ok: true, provedor: nome, custo: 0, dados };
        erros.push(`${nome}: resposta vazia`);
      } catch (e) {
        erros.push(`${nome}: ${(e as Error).message}`);
      }
    }
    return { ok: false, provedor: "gratuito", custo: 0, erro: `Não foi possível consultar o CNPJ agora (${erros.join("; ")}). Tente de novo em 1 minuto.` };
  },
};
