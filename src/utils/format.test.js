import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatPhone, whatsappLink } from './format'

describe('formatCurrency', () => {
  it('formata valor inteiro', () => {
    expect(formatCurrency(100)).toBe('100,00')
  })

  it('formata valor com centavos', () => {
    expect(formatCurrency(1234.56)).toBe('1.234,56')
  })

  it('formata zero', () => {
    expect(formatCurrency(0)).toBe('0,00')
  })

  it('trata null como zero', () => {
    expect(formatCurrency(null)).toBe('0,00')
  })

  it('trata undefined como zero', () => {
    expect(formatCurrency(undefined)).toBe('0,00')
  })

  it('trata string numérica', () => {
    expect(formatCurrency('99.9')).toBe('99,90')
  })

  it('formata valor negativo', () => {
    expect(formatCurrency(-50)).toBe('-50,00')
  })
})

describe('formatDate', () => {
  it('formata data ISO para pt-BR', () => {
    expect(formatDate('2026-04-25')).toBe('25/04/2026')
  })

  it('retorna "—" para valor vazio', () => {
    expect(formatDate('')).toBe('—')
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })
})

describe('formatPhone', () => {
  it('remove caracteres não numéricos', () => {
    expect(formatPhone('(18) 99999-1234')).toBe('18999991234')
  })

  it('retorna string vazia para null', () => {
    expect(formatPhone(null)).toBe('')
    expect(formatPhone(undefined)).toBe('')
  })

  it('mantém somente dígitos', () => {
    expect(formatPhone('abc 123 def 456')).toBe('123456')
  })
})

describe('whatsappLink', () => {
  it('gera URL do WhatsApp com DDI 55', () => {
    expect(whatsappLink('(18) 99999-1234')).toBe('https://wa.me/5518999991234')
  })

  it('não duplica o 55 se já presente', () => {
    const link = whatsappLink('11999998888')
    expect(link).toContain('wa.me/55')
    expect(link).not.toContain('wa.me/5555')
  })
})
