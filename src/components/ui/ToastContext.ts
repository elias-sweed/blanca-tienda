import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastApi {
  show: (message: string, type?: ToastType) => void
}

/**
 * Canal de avisos compartido. Vive en un archivo aparte para que `Toast.tsx`
 * solo exporte componentes (mejora la recarga en caliente durante el desarrollo)
 * y para que quien recibe el aviso no cargue el componente visual.
 */
export const ToastContext = createContext<ToastApi>({ show: () => {} })

/** Devuelve `{ show }` para avisar con un mensaje de éxito, error, info o alerta. */
export function useToast(): ToastApi {
  return useContext(ToastContext)
}
