import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recibe el redirect de Supabase tras el consentimiento OAuth (Google/GitHub),
// canjea el `code` por una sesión (cookies) y manda al usuario a /biblioteca.
// Si el provider deniega el consentimiento o el canje falla, vuelve a /auth
// con `?error=oauth` para que la UI muestre el mensaje inline.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/biblioteca`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=oauth`);
}
