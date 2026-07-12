import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client com service_role — ignora RLS. Server-only: usar apenas em route
// handlers / server actions pra escrever em tabelas restritas ao backend
// (pagamentos, assinaturas). NUNCA importar de um Client Component.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
