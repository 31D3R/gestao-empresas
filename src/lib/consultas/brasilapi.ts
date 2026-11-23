import type { DadosCNPJ, ProvedorCNPJ } from "./tipos";

// BrasilAPI: dados públicos da Receita, gratuito. Bom para começar antes de contratar um provedor pago.
export const brasilApi: ProvedorCNPJ = {
  nome: "brasilapi",
  async consultarCNPJ(cnpj) {
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { cache: "no-store" });
      if (!r.ok) return { ok: false, provedor: this.nome, custo: 0, erro: `CNPJ não encontrado (HTTP ${r.status})` };
      const j = await r.json();
      const regime = j.opcao_pelo_mei ? "MEI" : j.opcao_pelo_simples ? "Simples Nacional" : undefined;
      const dados: DadosCNPJ = {
        cnpj,
        razaoSocial: j.razao_social,
        nomeFantasia: j.nome_fantasia || undefined,
        situacaoCadastral: j.descricao_situacao_cadastral,
        dataAbertura: j.data_inicio_atividade,
        naturezaJuridica: j.natureza_juridica,
        porte: j.porte,
        regimeTributario: regime,
        capitalSocial: j.capital_social,
        cnaePrincipal: j.cnae_fiscal ? `${j.cnae_fiscal} - ${j.cnae_fiscal_descricao}` : undefined,
        cnaesSecundarios: (j.cnaes_secundarios || [])
          .filter((c: { codigo: number }) => c.codigo)
          .map((c: { codigo: number; descricao: string }) => ({ codigo: String(c.codigo), descricao: c.descricao })),
        email: j.email || undefined,
        telefone: j.ddd_telefone_1 || undefined,
        cep: j.cep ? String(j.cep) : undefined,
        logradouro: [j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(" "),
        numero: j.numero,
        complemento: j.complemento || undefined,
        bairro: j.bairro,
        municipio: j.municipio,
        uf: j.uf,
        qsa: (j.qsa || []).map((s: Record<string, string>) => ({
          nome: s.nome_socio,
          documento: s.cnpj_cpf_do_socio,
          qualificacao: s.qualificacao_socio,
          dataEntrada: s.data_entrada_sociedade,
        })),
        bruto: j,
      };
      return { ok: true, provedor: this.nome, custo: 0, dados };
    } catch (e) {
      return { ok: false, provedor: this.nome, custo: 0, erro: `Falha na consulta: ${(e as Error).message}` };
    }
  },
};
