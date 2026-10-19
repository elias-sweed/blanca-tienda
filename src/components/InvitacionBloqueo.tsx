import { useState } from 'react'
import { useAuth } from '../context/authContext'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

const CLAVE = 'bloqueo-invitacion-vista'

function yaVista(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1'
  } catch {
    return true
  }
}

/**
 * Después de entrar, ofrece una vez proteger la app. Si la persona dice
 * "Ahora no", no se vuelve a insistir; puede activarlo desde el menú.
 */
export function InvitacionBloqueo({
  onConfigurar,
  pausada = false,
}: {
  onConfigurar: () => void
  /** No mostrar mientras hay otra ventana abierta (por ejemplo, el tutorial). */
  pausada?: boolean
}) {
  const { estadoBloqueo, bloqueoConfigurado } = useAuth()
  const [oculta, setOculta] = useState(yaVista)

  const visible = !oculta && !pausada && estadoBloqueo === 'sin-bloqueo' && !bloqueoConfigurado

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, '1')
    } catch {
      // Sin almacenamiento: se oculta solo en esta sesión.
    }
    setOculta(true)
  }

  return (
    <Modal open={visible} title="Protege tu tienda" onClose={cerrar}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg">
          Si alguien toma tu teléfono, puede ver tus ventas, tu caja y tu inventario. Activa un
          desbloqueo con tu huella o con un patrón.
        </p>
        <p className="text-xs text-fg-mute">
          Es una barrera para el día a día. Tus datos siguen protegidos por tu cuenta de Supabase.
        </p>
        <Button
          size="lg"
          onClick={() => {
            cerrar()
            onConfigurar()
          }}
        >
          Configurar ahora
        </Button>
        <Button variant="ghost" size="lg" onClick={cerrar}>
          Ahora no
        </Button>
      </div>
    </Modal>
  )
}
