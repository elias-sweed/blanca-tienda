import { base64urlABytes, bytesABase64url, bytesAleatorios } from './crypto'

/**
 * Desbloqueo con la huella o el rostro del teléfono (WebAuthn / passkeys).
 *
 * La app nunca ve la huella: el dispositivo pide la verificación y solo
 * devuelve "sí" o "no". Lo único que se guarda es el id de la credencial.
 */

export function biometriaSoportada(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window
}

/** WebAuthn solo existe en direcciones seguras: https o localhost. */
export function contextoSeguro(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext
}

/** ¿Este teléfono/navegador puede verificar con huella o rostro? */
export async function biometriaDisponible(): Promise<boolean> {
  if (!biometriaSoportada() || !contextoSeguro()) return false
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
      return false
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

async function datosDelDesafio(): Promise<{ rpId: string }> {
  return { rpId: window.location.hostname }
}

/** Crea la credencial (pide la huella una vez). Devuelve su id (base64url). */
export async function crearCredencialBiometrica(): Promise<string> {
  if (!biometriaSoportada()) throw new Error('Este teléfono no tiene huella o rostro disponible')
  const { rpId } = await datosDelDesafio()
  const credencial = (await navigator.credentials.create({
    publicKey: {
      challenge: bytesAleatorios(32) as BufferSource,
      rp: { id: rpId, name: 'Blanca Tienda' },
      user: {
        id: bytesAleatorios(16) as BufferSource,
        name: 'blanca',
        displayName: 'Blanca Tienda',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null

  if (!credencial) throw new Error('No se pudo activar la huella')
  return bytesABase64url(new Uint8Array(credencial.rawId))
}

/** Pide la huella o el rostro. Devuelve true si el teléfono confirmó. */
export async function verificarBiometria(idBase64url: string): Promise<boolean> {
  if (!biometriaSoportada()) return false
  const { rpId } = await datosDelDesafio()
  const credencial = (await navigator.credentials.get({
    publicKey: {
      challenge: bytesAleatorios(32) as BufferSource,
      rpId,
      allowCredentials: [
        { id: base64urlABytes(idBase64url) as BufferSource, type: 'public-key' },
      ],
      userVerification: 'required',
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null

  return Boolean(credencial)
}
