export interface Sugerencia {
  valor: string
  /** Solo para colores: muestra una bolita con el color real. */
  color?: string
}

/**
 * Atajos opcionales para no escribir siempre lo mismo. La persona puede
 * ignorarlos y escribir cualquier otro color o categoría a mano.
 */
export const CATEGORIAS_SUGERIDAS: readonly Sugerencia[] = [
  { valor: 'Polos' },
  { valor: 'Blusas' },
  { valor: 'Camisas' },
  { valor: 'Pantalones' },
  { valor: 'Faldas' },
  { valor: 'Vestidos' },
  { valor: 'Casacas' },
  { valor: 'Shorts' },
  { valor: 'Ropa interior' },
  { valor: 'Accesorios' },
]

export const COLORES_SUGERIDOS: readonly Sugerencia[] = [
  { valor: 'Negro', color: '#1f2937' },
  { valor: 'Blanco', color: '#f8fafc' },
  { valor: 'Beige', color: '#d8c3a5' },
  { valor: 'Gris', color: '#9ca3af' },
  { valor: 'Azul', color: '#3b82f6' },
  { valor: 'Celeste', color: '#7dd3fc' },
  { valor: 'Rojo', color: '#dc2626' },
  { valor: 'Rosado', color: '#f472b6' },
  { valor: 'Verde', color: '#22c55e' },
  { valor: 'Amarillo', color: '#facc15' },
  { valor: 'Marrón', color: '#92400e' },
  { valor: 'Morado', color: '#8b5cf6' },
]
