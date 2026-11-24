import type { ProvedorCNPJ, ProvedorCredito } from "./tipos";
import { fontesGratuitas } from "./gratuitos";
import { mockCNPJ, mockCredito } from "./mock";

// Escolha do provedor por variável de ambiente. Novos provedores pagos entram aqui.
export function provedorCNPJ(): ProvedorCNPJ {
  switch (process.env.CNPJ_PROVIDER || process.env.CONSULTA_PROVIDER) {
    case "mock":
      return mockCNPJ;
    default:
      // BrasilAPI, CNPJ.ws e ReceitaWS, nessa ordem (todos gratuitos)
      return fontesGratuitas;
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
