import { useEffect, useRef, useState } from 'react'

interface TrueFocusProps {
  sentence?: string
  separator?: string
  borderColor?: string
  animationDuration?: number
  pauseBetweenAnimations?: number
  /** Tamaño de letra. */
  fontSize?: string
  /** Opacidad de la palabra sin enfocar. */
  inactiveOpacity?: number
  /** Color de la palabra enfocada. */
  activeColor?: string
}

export function TrueFocus({
  sentence = 'True Focus',
  separator = ' ',
  borderColor = '#00F5FF',
  animationDuration = 0.8,
  pauseBetweenAnimations = 1.2,
  fontSize = '1.25rem',
  inactiveOpacity = 0.35,
  activeColor = '#ffffff',
}: TrueFocusProps) {
  const words = sentence.split(separator)
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const rafRef = useRef<number | null>(null)

  // El ciclo del foco es un intervalo de baja frecuencia: provoca un cambio de
  // estado cada ~1s, muy por debajo del umbral en el que un re-render se nota.
  useEffect(() => {
    const interval = setInterval(
      () => {
        setCurrentIndex((prev) => (prev + 1) % words.length)
      },
      (animationDuration + pauseBetweenAnimations) * 1000,
    )
    return () => clearInterval(interval)
  }, [animationDuration, pauseBetweenAnimations, words.length])

  // Calcular posición del frame con requestAnimationFrame para suavidad
  useEffect(() => {
    if (currentIndex === null || currentIndex === -1) return
    if (!wordRefs.current[currentIndex] || !containerRef.current) return

    const updateRect = () => {
      if (!wordRefs.current[currentIndex] || !containerRef.current) return

      const parentRect = containerRef.current.getBoundingClientRect()
      const activeRect = wordRefs.current[currentIndex]!.getBoundingClientRect()

      setFocusRect({
        x: activeRect.left - parentRect.left,
        y: activeRect.top - parentRect.top,
        width: activeRect.width,
        height: activeRect.height,
      })
    }

    // Usar requestAnimationFrame para animación fluida
    rafRef.current = requestAnimationFrame(updateRect)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [currentIndex, words.length])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        gap: '0.3em',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      {words.map((word, index) => {
        const isActive = index === currentIndex
        return (
          <span
            key={index}
            ref={(el) => {
              wordRefs.current[index] = el
            }}
            style={{
              position: 'relative',
              fontSize,
              fontWeight: 900,
              // Sin `filter: blur()` ni `text-shadow`: ambos repintan el texto en cada
              // frame. El efecto de "enfoque" se resuelve con opacity + scale,
              // que el compositor mueve en la GPU sin coste de paint.
              color: activeColor,
              opacity: isActive ? 1 : inactiveOpacity,
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transition:
                'opacity 200ms ease-out, transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              outline: 'none',
              userSelect: 'none',
              willChange: 'transform, opacity',
            }}
          >
            {word}
          </span>
        )
      })}

      {/* Frame con esquinas */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          boxSizing: 'content-box',
          border: 'none',
          // El marco se desplaza con translate3d (compositor). El tamaño se escribe
          // sin transición: animarlo provocaría reflow, y ocurre una sola vez
          // por cambio de palabra (~1s), nunca por frame.
          transform: `translate3d(${focusRect.x}px, ${focusRect.y}px, 0)`,
          width: focusRect.width,
          height: focusRect.height,
          opacity: currentIndex >= 0 ? 1 : 0,
          transition: `transform ${animationDuration}s cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms linear`,
          willChange: 'transform, opacity',
        }}
      >
        {/* Esquina superior izquierda */}
        <span
          style={{
            position: 'absolute',
            width: '0.75rem',
            height: '0.75rem',
            border: `2px solid ${borderColor}`,
            filter: `drop-shadow(0 0 3px ${borderColor})`,
            borderRadius: '2px',
            top: '-8px',
            left: '-8px',
            borderRight: 'none',
            borderBottom: 'none',
          }}
        />
        {/* Esquina superior derecha */}
        <span
          style={{
            position: 'absolute',
            width: '0.75rem',
            height: '0.75rem',
            border: `2px solid ${borderColor}`,
            filter: `drop-shadow(0 0 3px ${borderColor})`,
            borderRadius: '2px',
            top: '-8px',
            right: '-8px',
            borderLeft: 'none',
            borderBottom: 'none',
          }}
        />
        {/* Esquina inferior izquierda */}
        <span
          style={{
            position: 'absolute',
            width: '0.75rem',
            height: '0.75rem',
            border: `2px solid ${borderColor}`,
            filter: `drop-shadow(0 0 3px ${borderColor})`,
            borderRadius: '2px',
            bottom: '-8px',
            left: '-8px',
            borderRight: 'none',
            borderTop: 'none',
          }}
        />
        {/* Esquina inferior derecha */}
        <span
          style={{
            position: 'absolute',
            width: '0.75rem',
            height: '0.75rem',
            border: `2px solid ${borderColor}`,
            filter: `drop-shadow(0 0 3px ${borderColor})`,
            borderRadius: '2px',
            bottom: '-8px',
            right: '-8px',
            borderLeft: 'none',
            borderTop: 'none',
          }}
        />
      </div>
    </div>
  )
}
