import { useCallback, useEffect, useRef, type PointerEvent as EventoPuntero } from 'react'

/**
 * Cuadro de 9 puntos para dibujar un patrón con el dedo.
 *
 * Solo avisa "qué puntos tocó, en qué orden". No guarda nada: quien lo usa
 * decide qué hacer con el patrón.
 */

const LADO = 300
const RADIO = 14
const SEPARACION = LADO / 3
const CENTROS = Array.from({ length: 9 }, (_, i) => ({
  x: SEPARACION / 2 + (i % 3) * SEPARACION,
  y: SEPARACION / 2 + Math.floor(i / 3) * SEPARACION,
}))

interface Props {
  onComplete: (patron: number[]) => void
  deshabilitado?: boolean
}

export function PatronLock({ onComplete, deshabilitado = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const seleccionRef = useRef<number[]>([])
  const arrastrandoRef = useRef(false)
  const posicionRef = useRef<{ x: number; y: number } | null>(null)

  const dibujar = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const estilos = getComputedStyle(document.documentElement)
    const leer = (nombre: string, respaldo: string) =>
      estilos.getPropertyValue(nombre).trim() || respaldo
    const colorPunto = leer('--color-line-strong', '#46515e')
    const colorActivo = leer('--color-cta', '#65c8b8')
    const colorBorde = leer('--color-selected', '#293a3e')

    ctx.clearRect(0, 0, LADO, LADO)
    const seleccion = seleccionRef.current

    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.strokeStyle = colorActivo
    for (let i = 1; i < seleccion.length; i += 1) {
      const a = CENTROS[seleccion[i - 1]]
      const b = CENTROS[seleccion[i]]
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    if (arrastrandoRef.current && posicionRef.current && seleccion.length) {
      const a = CENTROS[seleccion[seleccion.length - 1]]
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(posicionRef.current.x, posicionRef.current.y)
      ctx.stroke()
    }

    CENTROS.forEach((p, i) => {
      const activo = seleccion.includes(i)
      ctx.beginPath()
      ctx.arc(p.x, p.y, RADIO, 0, Math.PI * 2)
      ctx.fillStyle = activo ? colorActivo : colorPunto
      ctx.fill()
      if (activo) {
        ctx.lineWidth = 3
        ctx.strokeStyle = colorBorde
        ctx.stroke()
      }
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = LADO * dpr
    canvas.height = LADO * dpr
    canvas.getContext('2d')?.scale(dpr, dpr)
    dibujar()
  }, [dibujar])

  function coordenadas(e: EventoPuntero<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * LADO,
      y: ((e.clientY - rect.top) / rect.height) * LADO,
    }
  }

  function marcarCercano() {
    const p = posicionRef.current
    if (!p) return
    const idx = CENTROS.findIndex((c) => Math.hypot(c.x - p.x, c.y - p.y) < 34)
    if (idx >= 0 && !seleccionRef.current.includes(idx)) seleccionRef.current.push(idx)
  }

  function alBajar(e: EventoPuntero<HTMLCanvasElement>) {
    if (deshabilitado) return
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    arrastrandoRef.current = true
    seleccionRef.current = []
    posicionRef.current = coordenadas(e)
    marcarCercano()
    dibujar()
  }

  function alMover(e: EventoPuntero<HTMLCanvasElement>) {
    if (!arrastrandoRef.current) return
    posicionRef.current = coordenadas(e)
    marcarCercano()
    dibujar()
  }

  function alSoltar() {
    if (!arrastrandoRef.current) return
    arrastrandoRef.current = false
    posicionRef.current = null
    const seleccion = [...seleccionRef.current]
    seleccionRef.current = []
    if (seleccion.length >= 4) onComplete(seleccion)
    dibujar()
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={alBajar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      aria-label="Cuadro de puntos para dibujar el patrón"
      role="img"
      className={`mx-auto aspect-square w-full max-w-[300px] touch-none select-none ${
        deshabilitado ? 'pointer-events-none opacity-40' : ''
      }`}
    />
  )
}
