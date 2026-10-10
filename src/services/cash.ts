import { db } from '../lib/db'
import { newId, nowISO, todayISO } from '../utils/ids'
import { round2 } from '../utils/money'
import type { CashRegister, CashClosure, Sale } from '../types/models'

export async function getOpenRegister(): Promise<CashRegister | undefined> {
  const registers = await db.cashRegisters.where('status').equals('abierta').toArray()
  // Orden estable: si por algún motivo hay más de una, se toma la más antigua.
  return registers.sort((a, b) => a.openedAt.localeCompare(b.openedAt))[0]
}

/**
 * Abre la caja del día. Siempre arranca en 0: lo que importa es saber cuánto
 * se vendió hoy, sin mezclar el dinero que ya había de días anteriores.
 */
export async function openCashRegister(): Promise<CashRegister> {
  const now = nowISO()

  const existing = await getOpenRegister()
  if (existing) throw new Error('Ya hay una caja abierta')

  const register: CashRegister = {
    id: newId(),
    date: todayISO(),
    openingAmount: 0,
    openedAt: now,
    status: 'abierta',
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }

  await db.cashRegisters.add(register)
  return register
}

/** Cómo terminó el día en la gaveta, según lo responde quien vende. */
export type CierreResultado = 'exacto' | 'sobro' | 'falto'

export interface CloseCashRegisterData {
  resultado: CierreResultado
  /** Monto que sobró o faltó. Se ignora cuando el resultado es 'exacto'. */
  monto?: number
}

/**
 * Cierra la caja del día. No hace falta contar la gaveta: quien vende indica si
 * quadró, sobró o faltó, y cuánto. Las ventas del día ya están sumadas, así que
 * la diferencia solo refleja lo que la persona reporta.
 */
export async function closeCashRegister(
  data: CloseCashRegisterData,
): Promise<CashClosure> {
  const now = nowISO()
  const register = await getOpenRegister()
  if (!register) throw new Error('No hay una caja abierta')

  const summary = await getRegisterSummary(register.id)
  if (!summary) throw new Error('No hay una caja abierta')

  const totalCash = summary.porMetodo.efectivo
  const totalYape = summary.porMetodo.yape
  const totalPlin = summary.porMetodo.plin
  const totalTarjeta = summary.porMetodo.tarjeta
  const totalOtro = summary.porMetodo.otro

  // La caja abre en 0, así que lo esperado es exactamente el efectivo vendido.
  const expectedCash = totalCash

  let monto = 0
  if (data.resultado !== 'exacto') {
    const value = round2(Number(data.monto))
    if (!Number.isFinite(value) || value <= 0) throw new Error('Escribe un monto válido')
    monto = value
  }

  const difference = data.resultado === 'sobro' ? monto : data.resultado === 'falto' ? -monto : 0

  const closure: CashClosure = {
    id: newId(),
    registerId: register.id,
    date: register.date,
    totalCash,
    totalYape,
    totalPlin,
    totalTarjeta,
    totalOtro,
    expectedCash,
    countedCash: round2(expectedCash + difference),
    difference,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }

  await db.transaction('rw', db.cashRegisters, db.cashClosures, async () => {
    await db.cashRegisters.update(register.id, {
      status: 'cerrada',
      closedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
    await db.cashClosures.add(closure)
  })

  return closure
}

export async function getRegisterSales(registerId: string): Promise<Sale[]> {
  return db.sales.where('registerId').equals(registerId).toArray()
}

export async function getTodaySales(): Promise<Sale[]> {
  return db.sales.where('date').equals(todayISO()).toArray()
}

export interface RegisterSummary {
  register: CashRegister
  sales: Sale[]
  /** Conteo de ventas asociadas al registro. */
  salesCount: number
  /** Total vendido por método de pago. */
  porMetodo: Record<Sale['paymentMethod'], number>
  /** Suma de todas las ventas del registro. */
  totalVendido: number
  /** Efectivo esperado en gaveta: monto inicial + ventas en efectivo. */
  expectedCash: number
}

/**
 * Resumen reactivo del contenido de la caja abierta.
 * Usa la consulta de `sales` sobre `registerId`, que requiere índice en ese campo.
 */
export async function getRegisterSummary(registerId: string): Promise<RegisterSummary | undefined> {
  const register = await db.cashRegisters.get(registerId)
  if (!register) return undefined

  const sales = (await getRegisterSales(registerId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const porMetodo: Record<Sale['paymentMethod'], number> = {
    efectivo: 0,
    yape: 0,
    plin: 0,
    tarjeta: 0,
    otro: 0,
  }
  for (const s of sales) {
    if (s.anulada) continue
    porMetodo[s.paymentMethod] = round2(porMetodo[s.paymentMethod] + s.total)
  }

  const totalVendido = round2(sales.filter((s) => !s.anulada).reduce((sum, s) => sum + s.total, 0))

  const activas = sales.filter((s) => !s.anulada)

  return {
    register,
    sales,
    salesCount: activas.length,
    porMetodo,
    totalVendido,
    expectedCash: round2(register.openingAmount + porMetodo.efectivo),
  }
}

/** Cierres guardados, del más reciente al más antiguo. */
export async function listClosures(limit = 20): Promise<CashClosure[]> {
  const all = await db.cashClosures.reverse().sortBy('createdAt')
  return all.slice(0, limit)
}
