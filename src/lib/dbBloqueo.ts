import Dexie, { type EntityTable } from 'dexie'

/**
 * Base de datos del bloqueo local (separada de los datos del negocio).
 *
 * Guarda SOLO el verificador del patrón (hash + sal), el id de la credencial
 * de huella/rostro y los intentos fallidos. Nunca la contraseña de Supabase,
 * ni el patrón en claro, ni datos biométricos: la huella la verifica el
 * dispositivo y jamás sale de él.
 */

export interface AjustesBloqueo {
  id: 'lock'
  /** Hash PBKDF2 (base64) del patrón. `null` si no hay patrón. */
  patronHash: string | null
  /** Sal aleatoria (base64) usada para el hash. */
  patronSal: string | null
  /** Id de la credencial biométrica (base64url). `null` si no hay huella. */
  biometriaId: string | null
  /** Intentos fallidos seguidos dibujando el patrón. */
  intentosFallidos: number
  /** Hasta cuándo hay que esperar (timestamp en ms). 0 = sin espera. */
  bloqueadoHasta: number
  /** Minutos de inactividad antes de bloquear la app. */
  inactividadMinutos: number
}

const dbBloqueo = new Dexie('blanca-tienda-bloqueo') as Dexie & {
  ajustes: EntityTable<AjustesBloqueo, 'id'>
}

dbBloqueo.version(1).stores({
  ajustes: 'id',
})

const ID = 'lock' as const

function porDefecto(): AjustesBloqueo {
  return {
    id: ID,
    patronHash: null,
    patronSal: null,
    biometriaId: null,
    intentosFallidos: 0,
    bloqueadoHasta: 0,
    inactividadMinutos: 5,
  }
}

export async function leerAjustes(): Promise<AjustesBloqueo> {
  const guardado = await dbBloqueo.ajustes.get(ID)
  return guardado ?? porDefecto()
}

async function actualizar(cambios: Partial<AjustesBloqueo>): Promise<AjustesBloqueo> {
  const actuales = await leerAjustes()
  const nuevos: AjustesBloqueo = { ...actuales, ...cambios, id: ID }
  await dbBloqueo.ajustes.put(nuevos)
  return nuevos
}

/** ¿Hay algún método configurado (patrón o huella)? */
export function hayBloqueo(a: AjustesBloqueo): boolean {
  return Boolean(a.patronHash || a.biometriaId)
}

export function guardarPatron(
  hash: string,
  sal: string,
): Promise<AjustesBloqueo> {
  return actualizar({ patronHash: hash, patronSal: sal, intentosFallidos: 0, bloqueadoHasta: 0 })
}

export function borrarPatron(): Promise<AjustesBloqueo> {
  return actualizar({ patronHash: null, patronSal: null, intentosFallidos: 0, bloqueadoHasta: 0 })
}

export function guardarBiometria(id: string): Promise<AjustesBloqueo> {
  return actualizar({ biometriaId: id })
}

export function borrarBiometria(): Promise<AjustesBloqueo> {
  return actualizar({ biometriaId: null })
}

export function guardarInactividad(minutos: number): Promise<AjustesBloqueo> {
  return actualizar({ inactividadMinutos: minutos })
}

export function limpiarIntentos(): Promise<AjustesBloqueo> {
  return actualizar({ intentosFallidos: 0, bloqueadoHasta: 0 })
}

/** Espera creciente tras varios fallos: 30 s, 1 min, 5 min y 15 min. */
export function esperaPara(intentos: number): number {
  const ahora = Date.now()
  if (intentos >= 8) return ahora + 15 * 60_000
  if (intentos >= 7) return ahora + 5 * 60_000
  if (intentos >= 6) return ahora + 60_000
  if (intentos >= 5) return ahora + 30_000
  return 0
}

export async function registrarFallo(): Promise<AjustesBloqueo> {
  const actuales = await leerAjustes()
  const intentos = actuales.intentosFallidos + 1
  return actualizar({ intentosFallidos: intentos, bloqueadoHasta: esperaPara(intentos) })
}
