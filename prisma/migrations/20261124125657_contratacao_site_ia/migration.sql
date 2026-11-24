-- AlterTable
ALTER TABLE "Dominio" ADD COLUMN     "contratadoEm" TIMESTAMP(3),
ADD COLUMN     "plano" TEXT,
ADD COLUMN     "siteIA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "venceEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VersaoSite" (
    "id" TEXT NOT NULL,
    "dominioId" TEXT NOT NULL,
    "pedido" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "custoUsd" DECIMAL(8,4),
    "publicadaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersaoSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagemSite" (
    "id" TEXT NOT NULL,
    "dominioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagemSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImagemSite_dominioId_nome_key" ON "ImagemSite"("dominioId", "nome");

-- AddForeignKey
ALTER TABLE "VersaoSite" ADD CONSTRAINT "VersaoSite_dominioId_fkey" FOREIGN KEY ("dominioId") REFERENCES "Dominio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagemSite" ADD CONSTRAINT "ImagemSite_dominioId_fkey" FOREIGN KEY ("dominioId") REFERENCES "Dominio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
