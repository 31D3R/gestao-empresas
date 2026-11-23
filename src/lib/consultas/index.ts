import type { ProvedorCNPJ, ProvedorCredito } from "./tipos";
import { brasilApi } from "./brasilapi";
import { mockCNPJ, mockCredito } from "./mock";

// Escolha do provedor por variável de ambiente. Novos provedores pagos entram aqui.
export function provedorCNPJ(): ProvedorCNPJ {
  switch (process.env.CNPJ_PROVIDER || process.env.CONSULTA_PROVIDER) {
    case "brasilapi":
      return brasilApi;
    case "mock":
      return mockCNPJ;
    default:
      return brasilApi;
  }
}

export function provedorCredito(): ProvedorCredito {
  switch (process.env.CREDITO_PROVIDER) {
    // case "serasa": return serasa;   (Fase 4)
    default:
      return mockCredito;
  }
}

export * from "./tipos";
