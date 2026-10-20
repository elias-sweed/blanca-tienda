/**
 * Marcas para el flujo de recuperación del bloqueo local.
 *
 * Se usa `sessionStorage` a propósito: solo dura mientras la pestaña siga
 * abierta. Si la persona abandona el intento, puede volver a empezarlo desde
 * la pantalla de bloqueo y nadie hereda un desbloqueo pendiente.
 */

const CLAVE_RECUPERACION = 'recuperar-bloqueo'
const CLAVE_INVITACION = 'bloqueo-invitacion-vista'

export function pedirRecuperacion(): void {
  try {
    sessionStorage.setItem(CLAVE_RECUPERACION, '1')
  } catch {
    // Sin almacenamiento: el flujo sigue, solo que no se recuerda.
  }
}

export function hayRecuperacionPendiente(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_RECUPERACION) === '1'
  } catch {
    return false
  }
}

export function limpiarRecuperacion(): void {
  try {
    sessionStorage.removeItem(CLAVE_RECUPERACION)
  } catch {
    // Nada que limpiar.
  }
}

export function invitacionVista(): boolean {
  try {
    return localStorage.getItem(CLAVE_INVITACION) === '1'
  } catch {
    return true
  }
}

export function marcarInvitacionVista(): void {
  try {
    localStorage.setItem(CLAVE_INVITACION, '1')
  } catch {
    // Sin almacenamiento: se oculta solo en esta sesión.
  }
}

/** Tras recuperar el acceso se vuelve a ofrecer configurar el bloqueo. */
export function volverAOfrecerBloqueo(): void {
  try {
    localStorage.removeItem(CLAVE_INVITACION)
  } catch {
    // Sin almacenamiento: no hay nada que borrar.
  }
}
