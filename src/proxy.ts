import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const ADMIN_COOKIE_NAME = "taxi_admin_session";

function isTokenExpired(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    const rest = decoded.slice(0, lastDot);
    const secondLastDot = rest.lastIndexOf(".");
    const expiresStr = rest.slice(secondLastDot + 1);
    return Date.now() > Number(expiresStr);
  } catch {
    return true;
  }
}

function getLocaleFromPath(pathname: string): string {
  const segment = pathname.split("/")[1];
  return (routing.locales as readonly string[]).includes(segment)
    ? segment
    : routing.defaultLocale;
}

function stripLocale(pathname: string): string {
  const segment = pathname.split("/")[1];
  if ((routing.locales as readonly string[]).includes(segment)) {
    return "/" + pathname.split("/").slice(2).join("/") || "/";
  }
  return pathname;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const intlResponse = intlMiddleware(request);
  const isRedirect = intlResponse.status >= 300 && intlResponse.status < 400;
  if (isRedirect) return intlResponse;

  const cleanPath = stripLocale(pathname);
  if (
    cleanPath.startsWith("/admin") &&
    !cleanPath.startsWith("/admin/login")
  ) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!token || isTokenExpired(token)) {
      const locale = getLocaleFromPath(pathname);
      const loginUrl = new URL(`/${locale}/admin/login`, request.url);
      loginUrl.searchParams.set("from", cleanPath);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};