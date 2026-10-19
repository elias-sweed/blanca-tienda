import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase para el navegador.
 *
 * Solo se usa la clave `anon` (pública). La autorización real la hacen las
 * políticas RLS del servidor: aunque alguien abra las herramientas del
 * navegador, no puede leer datos de otra cuenta.
 *
 * Si falta configuración, `supabase` queda en `null` y la app sigue
 * funcionando con los datos locales (Dexie). Las pantallas de acceso deben
 * comprobar `supabaseConfigurado` antes de llamar a `requerirSupabase()`.
 */

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabaseConfigurado = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url!, anonKey!, {
      auth: {
        // La sesión se guarda en localStorage con una clave propia de la app.
        // No es la contraseña: es un token que Supabase puede revocar.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'blanca-tienda-auth',
      },
    })
  : null

export function requerirSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Falta conectar Supabase. Revisa el archivo .env.local y vuelve a iniciar la app.',
    )
  }
  return supabase
}
