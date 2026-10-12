import { useRef, useState, type ChangeEvent } from 'react'
import { Button } from './ui/Button'
import { FilterChips } from './ui/FilterChips'
import { Input } from './ui/Input'
import { Modal } from './ui/Modal'
import { useToast } from './ui/ToastContext'
import { useTema, type Tema } from '../hooks/useTema'
import { guardarPerfil, prepararFoto, type Perfil } from '../utils/perfil'

interface Props {
  open: boolean
  perfil: Perfil
  onClose: () => void
  /** Entrega el perfil guardado para que el encabezado lo refleje al instante. */
  onGuardar: (perfil: Perfil) => void
}

/**
 * Configuración del perfil: foto de avatar y nombre. Se abre desde el
 * círculo del encabezado. Solo se guarda al tocar "Guardar".
 */
export function Configuracion({ open, perfil, onClose, onGuardar }: Props) {
  const { show } = useToast()
  const { tema, setTema } = useTema()
  // El componente se remonta con `key` al abrir, así el estado arranca con el
  // perfil actual sin necesidad de un efecto.
  const [nombre, setNombre] = useState(perfil.nombre)
  const [foto, setFoto] = useState<string | null>(perfil.foto)
  const [ocupado, setOcupado] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function elegirImagen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Se limpia para permitir volver a elegir el mismo archivo después.
    e.target.value = ''
    if (!file) return
    try {
      setOcupado(true)
      setFoto(await prepararFoto(file))
    } catch (err) {
      show(err instanceof Error ? err.message : 'No se pudo cargar la imagen', 'error')
    } finally {
      setOcupado(false)
    }
  }

  function guardar() {
    const perfilNuevo: Perfil = { nombre: nombre.trim(), foto }
    try {
      guardarPerfil(perfilNuevo)
    } catch {
      show('No se pudo guardar: el teléfono no tiene más espacio', 'error')
      return
    }
    onGuardar(perfilNuevo)
    show('Perfil actualizado')
    onClose()
  }

  return (
    <Modal open={open} title="Configuración" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2">
          <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-line-active/60 bg-cta/20">
            {foto && <img src={foto} alt="Tu foto de perfil" className="h-full w-full object-cover" />}
          </span>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={elegirImagen} />
            <Button variant="secondary" size="md" disabled={ocupado} onClick={() => fileRef.current?.click()}>
              {ocupado ? 'Cargando...' : 'Elegir foto'}
            </Button>
            {foto && (
              <Button variant="ghost" size="md" onClick={() => setFoto(null)}>
                Quitar foto
              </Button>
            )}
          </div>
          <p className="text-xs text-fg-mute">La foto aparece en el círculo de arriba.</p>
        </div>

        <Input
          label="Nombre del perfil"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Blanca"
          maxLength={40}
        />

        <div className="flex flex-col gap-1">
          <FilterChips<Tema>
            titulo="Tema"
            valor={tema}
            onChange={setTema}
            opciones={[
              { valor: 'sistema', etiqueta: 'Automático' },
              { valor: 'claro', etiqueta: 'Claro' },
              { valor: 'oscuro', etiqueta: 'Oscuro' },
            ]}
          />
          <p className="text-xs text-fg-mute">Automático usa el tema de tu teléfono.</p>
        </div>

        <Button size="lg" onClick={guardar} disabled={ocupado}>
          Guardar
        </Button>
      </div>
    </Modal>
  )
}
