/** Marca en el navegador de que el tutorial inicial ya se vio (opcional). */

const CLAVE = 'tutorial-visto'

export function tutorialNoVisto(): boolean {
  try {
    return !localStorage.getItem(CLAVE)
  } catch {
    // Sin localStorage disponible: no se insiste con el tutorial.
    return false
  }
}

export function marcarTutorialVisto(): void {
  try {
    localStorage.setItem(CLAVE, '1')
  } catch {
    // Sin localStorage no se guarda la marca; se verá de nuevo la próxima vez.
  }
}
