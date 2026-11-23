import type { ProvedorCNPJ, ProvedorCredito } from "./tipos";

// Provedor de teste: não gasta crédito. Usado em desenvolvimento e demonstrações.
export const mockCNPJ: ProvedorCNPJ = {
  nome: "mock",
  async consultarCNPJ(cnpj) {
    return {
      ok: true,
      provedor: "mock",
      custo: 0,
      dados: {
        cnpj,
        razaoSocial: "EMPRESA DEMONSTRACAO LTDA",
        nomeFantasia: "Demonstração",
        situacaoCadastral: "ATIVA",
        dataAbertura: "2020-03-15",
        naturezaJuridica: "206-2 - Sociedade Empresária Limitada",
        porte: "MICRO EMPRESA",
        regimeTributario: "Simples Nacional",
        capitalSocial: 50000,
        cnaePrincipal: "7319002 - Promoção de vendas",
        cnaesSecundarios: [{ codigo: "7311400", descricao: "Agências de publicidade" }],
        email: "contato@demonstracao.com.br",
        telefone: "1133334444",
        cep: "01310100",
        logradouro: "AVENIDA PAULISTA",
        numero: "1000",
        bairro: "BELA VISTA",
        municipio: "SAO PAULO",
        uf: "SP",
        qsa: [{ nome: "FULANO DE TAL", qualificacao: "Sócio-Administrador", dataEntrada: "2020-03-15" }],
        bruto: { mock: true },
      },
    };
  },
};

export const mockCredito: ProvedorCredito = {
  nome: "mock",
  async consultarCPF(cpf) {
    const restricao = cpf.endsWith("0");
    return {
      ok: true,
      provedor: "mock",
      custo: 0,
      dados: {
        situacao: restricao ? "RESTRICAO" : "LIMPO",
        score: restricao ? 380 : 780,
        protestos: restricao ? 1 : 0,
        pendencias: restricao ? [{ tipo: "PEFIN", credor: "BANCO EXEMPLO", valor: 1250.9, data: "2025-08-10" }] : [],
        bruto: { mock: true },
      },
    };
  },
};
