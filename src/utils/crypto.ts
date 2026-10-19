/**
 * Utilidades criptográficas para el bloqueo local.
 *
 * El patrón nunca se guarda. Se guarda un hash PBKDF2 con sal aleatoria, que
 * hace muy caro probar combinaciones a mano. Aun así, esto protege contra
 * alguien que tome el teléfono: NO es una bóveda contra alguien con acceso
 * técnico y tiempo. Los datos de verdad están protegidos por la sesión de
 * Supabase y sus reglas RLS.
 */

const ITERACIONES = 120_000
const LARGO_HASH = 32

export function bytesABase64(bytes: Uint8Array): string {
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario)
}

export function base64ABytes(base64: string): Uint8Array {
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return bytes
}

export function bytesABase64url(bytes: Uint8Array): string {
  return bytesABase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64urlABytes(base64url: string): Uint8Array {
  const relleno = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const sobrante = relleno.length % 4
  return base64ABytes(sobrante ? relleno + '='.repeat(4 - sobrante) : relleno)
}

export function bytesAleatorios(largo: number): Uint8Array {
  const bytes = new Uint8Array(largo)
  crypto.getRandomValues(bytes)
  return bytes
}

/** Compara dos arreglos sin filtrar por tiempo cuánto coincide. */
export function sonIguales(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diferencia = 0
  for (let i = 0; i < a.length; i += 1) diferencia |= a[i] ^ b[i]
  return diferencia === 0
}

async function derivar(patron: string, sal: Uint8Array): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(patron),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal as BufferSource, iterations: ITERACIONES, hash: 'SHA-256' },
    material,
    LARGO_HASH * 8,
  )
  return new Uint8Array(bits)
}

/** Devuelve el hash (base64) del patrón. El patrón no se guarda. */
export async function hashearPatron(patron: string, sal: Uint8Array): Promise<string> {
  return bytesABase64(await derivar(patron, sal))
}

/** Verifica el patrón dibujado contra el hash guardado. */
export async function verificarPatron(
  patron: string,
  hashBase64: string,
  salBase64: string,
): Promise<boolean> {
  const esperado = base64ABytes(hashBase64)
  const obtenido = await derivar(patron, base64ABytes(salBase64))
  return sonIguales(esperado, obtenido)
}
