import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { sessaoAtual } from "@/lib/auth";
import { segredoSessao } from "@/lib/segredo";
import { conectar, urlApp } from "@/lib/presenca/instagram";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const s = await sessaoAtual();
  if (!s || s.perfil === "SOCIO") return NextResponse.redirect(`${urlApp()}/login`);
  let empresaId = "";
  try {
    const { payload } = await jwtVerify(url.searchParams.get("state") || "", segredoSessao());
    empresaId = String(payload.empresaId);
  } catch {
    return NextResponse.redirect(`${urlApp()}/?erro=instagram`);
  }
  const destino = `${urlApp()}/empresas/${empresaId}/presenca`;
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${destino}?ig=cancelado`);
  try {
    await conectar(empresaId, code.replace(/#_$/, ""));
    return NextResponse.redirect(`${destino}?ig=ok`);
  } catch (e) {
    return NextResponse.redirect(`${destino}?ig=erro&msg=${encodeURIComponent((e as Error).message.slice(0, 150))}`);
  }
}
