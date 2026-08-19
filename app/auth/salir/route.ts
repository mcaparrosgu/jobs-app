import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 303 y no el 307 por defecto: con 307 el navegador repetiría el POST
  // contra "/", que solo responde a GET.
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
