import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@empresa.com";
  const senha = process.env.ADMIN_SENHA || "trocar123";
  await db.usuario.upsert({
    where: { email },
    update: {},
    create: { nome: "Administrador", email, senhaHash: await bcrypt.hash(senha, 10), perfil: "ADMIN" },
  });
  console.log(`Admin: ${email} / ${senha}  (troque a senha no primeiro acesso)`);
}

main().finally(() => db.$disconnect());
