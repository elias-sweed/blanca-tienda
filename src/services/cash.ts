import { db } from '../lib/db'
import { newId, nowISO, todayISO } from '../utils/ids'
import type { CashRegister, CashClosure, Sale } from '../types/models'

export async function getOpenRegister(): Promise<CashRegister | undefined> {
  const registers = await db.cashRegisters.where('status').equals('abierta').toArray()
  return registers[0]
}

export async function openCashRegister(openingAmount: number): Promise<CashRegister> {
  const now = nowISO()
  const existing = await getOpenRegister()
  if (existing) throw new Error('Ya hay una caja abierta')

  const register: CashRegister = {
    id: newId(),
    date: todayISO(),
    openingAmount,
    openedAt: now,
    status: 'abierta',
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  }

  await db.cashRegisters.add(register)
  return register
}

export async function closeCashRegister(
  countedCash: number,
): Promise<CashClosure> {
  const now = nowISO()
  const register = await getOpenRegister()
  if (!register) throw new Error('No hay una caja abierta')

  const sales = await db.sales.where('date').equals(register.date).toArray()
  const salesForRegister = sales.filter((s) => s.registerId === register.id)

  const totalCash = salesForRegister
    .filter((s) => s.paymentMethod === 'efectivo')
    .reduce((sum, s) => sum + s.total, 0)
  const totalYape = salesForRegister
    .filter((s) => s.paymentMethod === 'yape')
    .reduce((sum, s) => sum + s.total, 0)
  const totalPlin = salesForRegister
    .filter((s) => s.paymentMethod === 'plin')
    .reduce((sum, s) => sum + s.total, 0)
  const totalTarjeta = salesForRegister
    .filter((s) => s.paymentMethod === 'tarjeta')
    .reduce((sum, s) => sum + s.total, 0)
  const totalOtro = salesForRegister
    .filter((s) => s.paymentMethod === 'otro')
    .reduce((sum, s) => sum + s.total, 0)

  const expectedCash = register.openingAmount + totalCash
  const difference = countedCash - expectedCash

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
    countedCash,
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
