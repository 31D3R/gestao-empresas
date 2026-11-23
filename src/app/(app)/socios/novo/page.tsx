import Link from "next/link";
import { exigir, EQUIPE } from "@/lib/auth";
import { FormSocio } from "@/components/FormSocio";

export default async function NovoSocio() {
  await exigir(...EQUIPE);
  return (
    <div className="space-y-4">
      <Link href="/socios" className="text-sm text-slate-500">← Sócios</Link>
      <h1 className="h1">Novo sócio</h1>
      <div className="card"><FormSocio /></div>
    </div>
  );
}
