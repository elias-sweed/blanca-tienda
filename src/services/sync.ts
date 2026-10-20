import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { TABLAS, type DefinicionTabla, type FilaRemota, type RegistroLocal } from '../lib/syncMap'

const FILAS_POR_PAGINA = 500
const FILAS_POR_LOTE = 200

export interface ResultadoSync {
  subidos: number
  bajados: number
}

function tablaLocal(def: DefinicionTabla) {
  return db.table(def.local)
}

async function pendientesDeSubir(def: DefinicionTabla): Promise<RegistroLocal[]> {
  const filas = (await tablaLocal(def).toArray()) as unknown as RegistroLocal[]
  return filas.filter((fila) => fila.syncStatus !== 'synced')
}

async function bajarTabla(def: DefinicionTabla): Promise<number> {
  if (!supabase) throw new Error('La nube no está configurada.')

  const tabla = tablaLocal(def)
  const meta = await db.syncMeta.get(def.local)
  const desde = meta?.lastPulledAt ?? null
  let maximoRemoto: string | null = null
  let maximoMs = desde ? Date.parse(desde) : Number.NEGATIVE_INFINITY
  let offset = 0
  let total = 0

  for (;;) {
    let consulta = supabase
      .from(def.remota)
      .select('*')
      .order('updated_at', { ascending: true })
      .range(offset, offset + FILAS_POR_PAGINA - 1)
    if (desde) consulta = consulta.gt('updated_at', desde)

    const { data, error } = await consulta
    if (error) throw new Error(`No se pudo leer ${def.remota}: ${error.message}`)

    const filas = (data ?? []) as FilaRemota[]
    if (filas.length === 0) break

    await db.transaction('rw', tabla, async () => {
      for (const fila of filas) {
        const remoto = def.aLocal(fila)
        if (!remoto.id) continue

        const actual = (await tabla.get(remoto.id)) as RegistroLocal | undefined
        // Gana el cambio más reciente. Si lo local es más nuevo, se queda
        // pendiente y se sube después en esta misma vuelta.
        if (actual && Date.parse(actual.updatedAt) > Date.parse(remoto.updatedAt)) continue

        await tabla.put(remoto)
        total += 1
      }
    })

    const ultima = filas[filas.length - 1]
    const crudo = typeof ultima.updated_at === 'string' ? ultima.updated_at : null
    if (crudo) {
      const ms = Date.parse(crudo)
      if (ms > maximoMs) {
        maximoMs = ms
        maximoRemoto = crudo
      }
    }

    if (filas.length < FILAS_POR_PAGINA) break
    offset += FILAS_POR_PAGINA
  }

  if (maximoRemoto && maximoRemoto !== desde) {
    await db.syncMeta.put({ tabla: def.local, lastPulledAt: maximoRemoto })
  }

  return total
}

async function subirTabla(def: DefinicionTabla, userId: string): Promise<number> {
  if (!supabase) throw new Error('La nube no está configurada.')

  const tabla = tablaLocal(def)
  const pendientes = await pendientesDeSubir(def)
  let subidos = 0

  for (let i = 0; i < pendientes.length; i += FILAS_POR_LOTE) {
    const lote = pendientes.slice(i, i + FILAS_POR_LOTE)
    const filas = lote.map((registro) => def.aRemoto(registro, userId))

    const { error } = await supabase.from(def.remota).upsert(filas, { onConflict: 'id' })
    if (error) throw new Error(`No se pudo guardar ${def.remota}: ${error.message}`)

    // Solo se marca como guardado si nadie lo volvió a modificar mientras
    // viajaba la petición. Si cambió, sigue pendiente para la próxima vuelta.
    await db.transaction('rw', tabla, async () => {
      for (const registro of lote) {
        const actual = (await tabla.get(registro.id)) as RegistroLocal | undefined
        if (actual && actual.updatedAt === registro.updatedAt) {
          await tabla.update(registro.id, { syncStatus: 'synced' })
        }
      }
    })

    subidos += lote.length
  }

  return subidos
}

/**
 * Baja primero lo que haya en la nube y luego sube lo pendiente. Ese orden
 * evita pisar en Supabase un dato más nuevo con uno viejo del teléfono.
 */
export async function sincronizar(userId: string): Promise<ResultadoSync> {
  if (!supabase) throw new Error('La nube no está configurada.')

  let bajados = 0
  for (const def of TABLAS) bajados += await bajarTabla(def)

  let subidos = 0
  for (const def of TABLAS) subidos += await subirTabla(def, userId)

  return { subidos, bajados }
}

/** Cuenta los cambios que todavía no llegaron a la nube. */
export async function contarPendientes(): Promise<number> {
  let total = 0
  for (const def of TABLAS) total += (await pendientesDeSubir(def)).length
  return total
}
