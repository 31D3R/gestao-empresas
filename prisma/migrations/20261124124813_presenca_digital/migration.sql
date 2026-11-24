-- CreateEnum
CREATE TYPE "StatusDominio" AS ENUM ('DISPONIVEL', 'PEDIDO', 'REGISTRADO', 'HOSPEDADO');

-- CreateEnum
CREATE TYPE "StatusPostagem" AS ENUM ('RASCUNHO', 'AGENDADA', 'PUBLICANDO', 'PUBLICADA', 'ERRO');

-- CreateTable
CREATE TABLE "Dominio" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "StatusDominio" NOT NULL DEFAULT 'PEDIDO',
    "registrador" TEXT,
    "expiraEm" TIMESTAMP(3),
    "hospedadoEm" TIMESTAMP(3),
    "pasta" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dominio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaInstagram" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "igUserId" TEXT NOT NULL,
    "usuario" TEXT,
    "tokenCifrado" TEXT NOT NULL,
    "tokenExpiraEm" TIMESTAMP(3),
    "conectadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaInstagram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Postagem" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tema" TEXT,
    "legenda" TEXT NOT NULL,
    "imagem" BYTEA,
    "imagemTipo" TEXT,
    "imagemUrl" TEXT,
    "agendadaPara" TIMESTAMP(3),
    "status" "StatusPostagem" NOT NULL DEFAULT 'RASCUNHO',
    "erro" TEXT,
    "igMediaId" TEXT,
    "publicadaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Postagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dominio_nome_key" ON "Dominio"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ContaInstagram_empresaId_key" ON "ContaInstagram"("empresaId");

-- CreateIndex
CREATE INDEX "Postagem_status_agendadaPara_idx" ON "Postagem"("status", "agendadaPara");

-- AddForeignKey
ALTER TABLE "Dominio" ADD CONSTRAINT "Dominio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaInstagram" ADD CONSTRAINT "ContaInstagram_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postagem" ADD CONSTRAINT "Postagem_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
