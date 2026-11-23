// Contrato único para qualquer fornecedor de consulta (Infosimples, BigDataCorp, Serasa...).
// Trocar de fornecedor = criar um novo arquivo que implemente estas interfaces.

export interface SocioQSA {
  nome: string;
  documento?: string; // CPF mascarado na Receita (***123456**)
  qualificacao?: string;
  dataEntrada?: string;
}

export interface DadosCNPJ {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacaoCadastral?: string;
  dataAbertura?: string;
  naturezaJuridica?: string;
  porte?: string;
  regimeTributario?: string;
  capitalSocial?: number;
  cnaePrincipal?: string;
  cnaesSecundarios?: { codigo: string; descricao: string }[];
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  qsa: SocioQSA[];
  bruto: unknown;
}

export interface ResultadoCredito {
  situacao: "LIMPO" | "RESTRICAO";
  score?: number;
  pendencias: { tipo: string; credor?: string; valor?: number; data?: string }[];
  protestos: number;
  bruto: unknown;
}

export interface ResultadoConsulta<T> {
  ok: boolean;
  provedor: string;
  custo: number;
  dados?: T;
  erro?: string;
}

export interface ProvedorCNPJ {
  nome: string;
  consultarCNPJ(cnpj: string): Promise<ResultadoConsulta<DadosCNPJ>>;
}

export interface ProvedorCredito {
  nome: string;
  consultarCPF(cpf: string): Promise<ResultadoConsulta<ResultadoCredito>>;
}
