/**
 * Perfil de la usuaria (nombre y foto) guardado solo en este teléfono.
 * No es dato del negocio: no se sincroniza ni pasa por la base de datos.
 */

const CLAVE_NOMBRE = 'perfil-nombre'
const CLAVE_FOTO = 'perfil-foto'

export interface Perfil {
  nombre: string
  foto: string | null
}

export function leerPerfil(): Perfil {
  try {
    return {
      nombre: localStorage.getItem(CLAVE_NOMBRE) ?? '',
      foto: localStorage.getItem(CLAVE_FOTO),
    }
  } catch {
    // Sin almacenamiento disponible: perfil vacío, la app sigue funcionando.
    return { nombre: '', foto: null }
  }
}

/** Guarda; lanza si el teléfono no tiene espacio (se avisa en pantalla). */
export function guardarPerfil(perfil: Perfil): void {
  if (perfil.nombre) localStorage.setItem(CLAVE_NOMBRE, perfil.nombre)
  else localStorage.removeItem(CLAVE_NOMBRE)
  if (perfil.foto) localStorage.setItem(CLAVE_FOTO, perfil.foto)
  else localStorage.removeItem(CLAVE_FOTO)
}

function leerComoDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result))
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'))
    lector.readAsDataURL(file)
  })
}

/**
 * Recorta la imagen al centro en cuadrado y la reduce a 192 px: el avatar se
 * ve nítido y ocupa poquísimo espacio en el teléfono.
 */
export async function prepararFoto(file: File, lado = 192): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Ese archivo no es una imagen')
  const dataUrl = await leerComoDataURL(file)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('No se pudo abrir la imagen'))
    i.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = lado
  canvas.height = lado
  const ctx = canvas.getContext('2d')
  // Sin canvas (navegador muy viejo): se guarda la imagen tal cual.
  if (!ctx) return dataUrl

  const ladoMin = Math.min(img.width, img.height)
  const sx = (img.width - ladoMin) / 2
  const sy = (img.height - ladoMin) / 2
  ctx.drawImage(img, sx, sy, ladoMin, ladoMin, 0, 0, lado, lado)
  return canvas.toDataURL('image/jpeg', 0.82)
}
