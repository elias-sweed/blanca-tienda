import { useState } from 'react'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { marcarTutorialVisto } from './tutorialStorage'

/**
 * Tutorial opcional de 5 pasos. Aparece solo en la primera visita (se guarda
 * una marca en el navegador) y puede volver a verse en cualquier momento desde
 * el círculo del encabezado. Nunca es obligatorio: "Saltar" y la "×" cierran
 * y guardan la marca para no volver a interrumpir.
 */

const PASOS = [
  {
    emoji: '👋',
    titulo: 'Bienvenida',
    texto: 'Esta app te ayuda a vender, controlar tu inventario y manejar tu caja. Todo se anota solo, sin escribir de más.',
  },
  {
    emoji: '💰',
    titulo: 'Primero abre la caja',
    texto: 'Cada día, antes de vender, abre la caja desde Inicio o desde el botón de abajo. Empieza en 0 y las ventas se anotan solas.',
  },
  {
    emoji: '🛒',
    titulo: 'Vender',
    texto: 'Busca el producto, tócalo en "Agregar" y abre el carrito. Elige cómo te pagaron y si te dieron de más, te decimos el vuelto.',
  },
  {
    emoji: '📦',
    titulo: 'Inventario',
    texto: 'Aquí agregas tus productos y controlas cuántas unidades tienes. Si algo se está acabando, la app te avisa.',
  },
  {
    emoji: '📋',
    titulo: 'Historial',
    texto: 'Revisa cuándo vendiste, qué movimientos hubo y cómo te fue con la caja, el día que quieras.',
  },
]

export function Tutorial({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [paso, setPaso] = useState(0)
  const actual = PASOS[paso]
  const ultimo = paso === PASOS.length - 1

  function terminar() {
    marcarTutorialVisto()
    setPaso(0)
    onClose()
  }

  return (
    <Modal open={open} title="¿Cómo usar esta app?" onClose={terminar}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="text-5xl" aria-hidden="true">{actual.emoji}</span>
          <h3 className="text-lg font-bold text-title">{actual.titulo}</h3>
          <p className="max-w-xs text-sm text-fg-soft">{actual.texto}</p>
        </div>

        {/* Puntos de avance: 5 pasos */}
        <div className="flex justify-center gap-2" aria-label={`Paso ${paso + 1} de ${PASOS.length}`}>
          {PASOS.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-colors duration-150 ${
                i === paso ? 'bg-cta' : 'bg-line-strong'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="md" onClick={terminar}>
            Saltar
          </Button>
          {paso > 0 && (
            <Button variant="secondary" size="md" className="flex-1" onClick={() => setPaso(paso - 1)}>
              Atrás
            </Button>
          )}
          <Button size="md" className="flex-1" onClick={() => (ultimo ? terminar() : setPaso(paso + 1))}>
            {ultimo ? 'Entendido' : 'Siguiente'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
