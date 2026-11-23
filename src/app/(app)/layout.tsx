import Link from "next/link";
import { exigir } from "@/lib/auth";
import { sair } from "../actions/auth";

const MENU_EQUIPE = [
  { href: "/", rotulo: "Painel" },
  { href: "/empresas", rotulo: "Empresas" },
  { href: "/socios", rotulo: "Sócios" },
  { href: "/consultas", rotulo: "Consultas e custos" },
];
const MENU_SOCIO = [{ href: "/relatorios", rotulo: "Relatórios" }];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await exigir();
  const menu = s.perfil === "SOCIO" ? MENU_SOCIO : MENU_EQUIPE;
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4 md:block">
          <p className="font-semibold text-teal-800">Gestão de Empresas</p>
          <p className="text-xs text-slate-500 md:mt-1">{s.nome} · {s.perfil.toLowerCase()}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col">
          {menu.map((m) => (
            <Link key={m.href} href={m.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
              {m.rotulo}
            </Link>
          ))}
          <form action={sair}>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100">Sair</button>
          </form>
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
