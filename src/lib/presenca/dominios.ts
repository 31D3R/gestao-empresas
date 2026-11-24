/**
 * Domínios: verificação gratuita (RDAP) + registrador plugável.
 * Hoje: provedor "manual" (registro no Registro.br pela equipe).
 * Quando escolhermos um registrador com API, basta implementar Registrador.
 */
export function normalizarDominio(v: string) {
  return v.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

export function dominioValido(d: string) {
  return /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{2,63})+$/.test(d);
}

/** true = livre, false = ocupado, null = não deu para verificar */
export async function dominioLivre(d: string): Promise<boolean | null> {
  const url = d.endsWith(".br") ? `https://rdap.registro.br/domain/${d}` : `https://rdap.org/domain/${d}`;
  try {
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000), headers: { Accept: "application/rdap+json" } });
    if (r.status === 404) return true;
    if (r.ok) return false;
    return null;
  } catch {
    return null;
  }
}

export interface Registrador {
  nome: string;
  automatico: boolean;
  /** Registra o domínio; retorna data de expiração se conhecida. */
  registrar(dominio: string, titular: { documento: string; nome: string; email?: string | null }): Promise<{ expiraEm?: Date }>;
  linkManual?(dominio: string): string;
}

const manual: Registrador = {
  nome: "Registro.br (manual)",
  automatico: false,
  async registrar() {
    return {};
  },
  linkManual: (d) => `https://registro.br/busca-dominio/?fqdn=${encodeURIComponent(d)}`,
};

export function registrador(): Registrador {
  // Futuro: if (process.env.REGISTRADOR === "openprovider") return openprovider;
  return manual;
}
