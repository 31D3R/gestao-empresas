import { db } from "@/lib/db";
import { FormLogin, FormPrimeiroAcesso } from "./forms";

export const dynamic = "force-dynamic";

export default async function Login() {
  const primeiroAcesso = (await db.usuario.count()) === 0;
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      {primeiroAcesso ? <FormPrimeiroAcesso /> : <FormLogin />}
    </main>
  );
}
