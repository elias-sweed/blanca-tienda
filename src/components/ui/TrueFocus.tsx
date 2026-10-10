import { useEffect, useRef, useState } from 'react'

interface TrueFocusProps {
  sentence?: string
  separator?: string
  blurAmount?: number
  borderColor?: string
  glowColor?: string
  animationDuration?: number
  pauseBetweenAnimations?: number
  /** Tamaño de letra. */
  fontSize?: string
  /** Color de la palabra sin enfocar. */
  inactiveColor?: string
  /** Color de la palabra enfocada (más brillo). */
  activeColor?: string
}

export function TrueFocus({
  sentence = 'True Focus',
  separator = ' ',
  blurAmount = 3,
  borderColor = '#e11d48',
  glowColor = 'rgba(225, 29, 72, 0.4)',
  animationDuration = 0.8,
  pauseBetweenAnimations = 1.2,
  fontSize = '1.25rem',
  inactiveColor = 'rgba(255, 255, 255, 0.45)',
  activeColor = '#ffffff',
}: TrueFocusProps) {
  const words = sentence.split(separator)
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const rafRef = useRef<number>()

  // Animación suave con intervalo
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
              filter: isActive ? 'blur(0px)' : `blur(${blurAmount}px)`,
              color: isActive ? activeColor : inactiveColor,
              opacity: isActive ? 1 : 0.7,
              transform: isActive ? 'scale(1.08)' : 'scale(1)',
              textShadow: isActive ? `0 0 14px ${glowColor}` : 'none',
              transition: `filter ${animationDuration}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${animationDuration}s cubic-bezier(0.4, 0, 0.2, 1), transform ${animationDuration}s cubic-bezier(0.4, 0, 0.2, 1), color ${animationDuration}s cubic-bezier(0.4, 0, 0.2, 1), text-shadow ${animationDuration}s cubic-bezier(0.4, 0, 0.2, 1)`,
              outline: 'none',
              userSelect: 'none',
              willChange: 'filter, opacity, transform',
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
          transform: `translate(${focusRect.x}px, ${focusRect.y}px)`,
          width: focusRect.width,
          height: focusRect.height,
          opacity: currentIndex >= 0 ? 1 : 0,
          transition: `transform ${animationDuration}s cubic-bezier(0.4, 0, 0.2, 1), width ${animationDuration}s cubic-bezier(0.4, 0, 0.2, 1), height ${animationDuration}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${animationDuration}s cubic-bezier(0.4, 0, 0.2, 1)`,
          willChange: 'transform, width, height, opacity',
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
