import { db } from "@/lib/db";
import { exigir } from "@/lib/auth";
import { alternarAtivo } from "@/app/actions/usuarios";
import { FormUsuario } from "@/components/FormUsuario";

export default async function Usuarios() {
  await exigir("ADMIN");
  const [usuarios, socios] = await Promise.all([
    db.usuario.findMany({ orderBy: { nome: "asc" }, include: { socio: { select: { nome: true } } } }),
    db.socio.findMany({ where: { usuario: null }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="h1">Usuários e acessos</h1>
      <div className="card"><h2 className="mb-3 font-semibold">Novo acesso</h2><FormUsuario socios={socios} /></div>
      <div className="card overflow-x-auto p-0">
        <table className="tabela">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Sócio</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td><td>{u.email}</td><td>{u.perfil.toLowerCase()}</td><td>{u.socio?.nome ?? "—"}</td>
                <td>{u.ativo ? "ativo" : <span className="text-red-600">bloqueado</span>}</td>
                <td><form action={alternarAtivo.bind(null, u.id)}><button className="text-xs text-teal-800">{u.ativo ? "bloquear" : "reativar"}</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
