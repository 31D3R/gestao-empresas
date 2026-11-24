import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { segredoSessao } from "@/lib/segredo";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("sessao")?.value;
  let ok = false;
  if (token) {
    try {
      await jwtVerify(token, segredoSessao());
      ok = true;
    } catch {}
  }
  if (!ok) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/midia|api/cron|_next|favicon.ico|manifest.webmanifest|icon.*\\.png|sw.js).*)"],
};
