import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { TrueFocus } from '../ui/TrueFocus'
import { useToast } from '../ui/Toast'
import beepSound from '../../assets/Sounds/Warning/Beep.mp3'

/**
 * Modal que guía a la usuaria para abrir la caja al venir desde Ventas.
 *
 * Aparece limpio y sin desenfoque. Solo cuando toca por fuera se difumina el
 * fondo, suena la alarma y sale el aviso, para que quede claro que el botón
 * es lo único que debe apretar.
 */
export function AbrirCajaGuia({ onAbrir }: { onAbrir: () => void }) {
  const { show } = useToast()
  const navigate = useNavigate()
  const [desenfocado, setDesenfocado] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<number | null>(null)

  // Al cerrar el modal se cancela el temporizador del desenfoque.
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  function avisar() {
    show('¡Importante! Presiona Abrir Caja', 'error')
    try {
      if (!audioRef.current) audioRef.current = new Audio(beepSound)
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    } catch {
      // Si el navegador bloquea el audio, el aviso visual sigue funcionando.
    }
    setDesenfocado(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setDesenfocado(false), 1800)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      style={{
        backdropFilter: desenfocado ? 'blur(10px)' : 'blur(0px)',
        WebkitBackdropFilter: desenfocado ? 'blur(10px)' : 'blur(0px)',
        transition: 'backdrop-filter 300ms ease, -webkit-backdrop-filter 300ms ease',
      }}
      onPointerDown={(e) => {
        // Solo cuenta como toque fuera lo que no pertenece al panel.
        if ((e.target as HTMLElement).closest('[data-guia-panel]')) return
        e.preventDefault()
        avisar()
      }}
    >
      <div
        data-guia-panel
        className="w-full max-w-sm rounded-3xl border border-line-active bg-raised p-6 shadow-[0_0_40px_rgba(139,0,255,0.35)] shadow-2xl shadow-black/90"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/25 text-3xl">🔒</span>

          <div>
            <p className="text-xl font-bold text-title">Primero tienes que abrir la caja</p>
            <p className="mt-2 text-sm text-fg-mute">
              No puedes vender sin caja abierta. Empieza en 0 y tus ventas del día se anotan solas.
            </p>
          </div>

          <Button size="lg" className="w-full ring-4 ring-cta/50" onClick={onAbrir}>
            <TrueFocus
              sentence="Abrir caja"
              borderColor="#00F5FF"
              glowColor="rgba(0, 245, 255, 0.95)"
              blurAmount={2}
              fontSize="1.6rem"
              inactiveColor="rgba(5, 5, 10, 0.45)"
              activeColor="#05050A"
              animationDuration={0.6}
              pauseBetweenAnimations={0.7}
            />
          </Button>

          <Button variant="ghost" size="md" onClick={() => navigate('/')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  )
}