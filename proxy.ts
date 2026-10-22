import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup"];
const DEV_PUBLIC = process.env.NODE_ENV !== "production" ? ["/lab", "/api/dev/feedback"] : [];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isAuthPage = PUBLIC_PATHS.includes(path);
  const isPublic = isAuthPage || path.startsWith("/invite/") || path === "/privacy" || path === "/api/health";
  const isDevPublic = DEV_PUBLIC.includes(path);

  if (!data.user && !isPublic && !isDevPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (data.user && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|wasm|task|webm|js)$).*)"],
};
