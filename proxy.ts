import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);

// Paths (locale prefix stripped) that don't require a session.
const PUBLIC_PATHS = ["/", "/login", "/cadastro"];

export default async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);

  // Refreshes the Supabase session cookie on every request — required by
  // the @supabase/ssr App Router pattern so Server Components see a valid
  // session instead of one that silently expired.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const locale =
    routing.locales.find((l) => request.nextUrl.pathname.startsWith(`/${l}`)) ??
    routing.defaultLocale;
  const pathnameWithoutLocale =
    request.nextUrl.pathname.slice(`/${locale}`.length) || "/";

  if (!user && !PUBLIC_PATHS.includes(pathnameWithoutLocale)) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", pathnameWithoutLocale);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
