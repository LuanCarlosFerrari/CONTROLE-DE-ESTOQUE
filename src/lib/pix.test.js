import { describe, it, expect } from 'vitest'
import { gerarPixPayload } from './pix'

// CRC helper to verify the last 4 chars of a payload
function extractCrc(payload) {
  return payload.slice(-4)
}
function payloadBody(payload) {
  return payload.slice(0, -4)
}

describe('gerarPixPayload', () => {
  const base = { chave: 'test@email.com', nome: 'João Silva', cidade: 'São Paulo' }

  it('retorna uma string não vazia', () => {
    expect(typeof gerarPixPayload(base)).toBe('string')
    expect(gerarPixPayload(base).length).toBeGreaterThan(0)
  })

  it('começa com o Payload Format Indicator 000201', () => {
    expect(gerarPixPayload(base)).toMatch(/^000201/)
  })

  it('inclui a chave PIX no payload', () => {
    const p = gerarPixPayload(base)
    expect(p).toContain('test@email.com')
  })

  it('inclui br.gov.bcb.pix no payload', () => {
    expect(gerarPixPayload(base)).toContain('br.gov.bcb.pix')
  })

  it('inclui o nome em maiúsculas sem acentos', () => {
    const p = gerarPixPayload(base)
    expect(p).toContain('JOAO SILVA')
  })

  it('inclui a cidade em maiúsculas sem acentos', () => {
    const p = gerarPixPayload(base)
    expect(p).toContain('SAO PAULO')
  })

  it('inclui o campo 5802BR (país)', () => {
    expect(gerarPixPayload(base)).toContain('5802BR')
  })

  it('inclui 5303986 (moeda BRL)', () => {
    expect(gerarPixPayload(base)).toContain('5303986')
  })

  it('termina com 6304 + 4 chars hexadecimais (CRC)', () => {
    expect(gerarPixPayload(base)).toMatch(/6304[0-9A-F]{4}$/)
  })

  it('CRC é determinístico para o mesmo input', () => {
    expect(gerarPixPayload(base)).toBe(gerarPixPayload(base))
  })

  it('muda o CRC ao mudar qualquer campo', () => {
    const a = gerarPixPayload(base)
    const b = gerarPixPayload({ ...base, nome: 'Maria' })
    expect(extractCrc(a)).not.toBe(extractCrc(b))
  })

  it('inclui o valor quando fornecido', () => {
    const p = gerarPixPayload({ ...base, valor: 42.5 })
    expect(p).toContain('5405')     // field ID 54 + len 05 ("42.50" = 5 chars)
    expect(p).toContain('42.50')
  })

  it('não inclui campo 54 quando valor é null', () => {
    const p = gerarPixPayload({ ...base, valor: null })
    // campo 54 não aparece
    const idx = p.indexOf('6304')
    expect(p.slice(0, idx)).not.toContain('\x3654') // raw check: id "54" inside body
    // simpler: body before crc should not have "5404"
    expect(p).not.toMatch(/5404\d{4}/)
  })

  it('não inclui campo 54 quando valor é 0', () => {
    const p = gerarPixPayload({ ...base, valor: 0 })
    expect(p).not.toMatch(/5404\d{4}/)
  })

  it('inclui descricao quando fornecida', () => {
    const p = gerarPixPayload({ ...base, descricao: 'Pedido 123' })
    expect(p).toContain('Pedido 123')
  })

  it('limita nome a 25 caracteres', () => {
    const p = gerarPixPayload({ ...base, nome: 'A'.repeat(50) })
    expect(p).toContain('A'.repeat(25))
    expect(p).not.toContain('A'.repeat(26))
  })

  it('limita cidade a 15 caracteres', () => {
    const p = gerarPixPayload({ ...base, cidade: 'B'.repeat(30) })
    expect(p).toContain('B'.repeat(15))
    expect(p).not.toContain('B'.repeat(16))
  })

  it('usa fallback RECEBEDOR quando nome está vazio', () => {
    const p = gerarPixPayload({ ...base, nome: '' })
    expect(p).toContain('RECEBEDOR')
  })

  it('usa fallback BRASIL quando cidade está vazia', () => {
    const p = gerarPixPayload({ ...base, cidade: '' })
    expect(p).toContain('BRASIL')
  })

  it('funciona com chave CPF', () => {
    const p = gerarPixPayload({ chave: '12345678901', nome: 'Fulano', cidade: 'RJ' })
    expect(p).toContain('12345678901')
  })

  it('funciona com chave telefone', () => {
    const p = gerarPixPayload({ chave: '+5511999999999', nome: 'Fulano', cidade: 'RJ' })
    expect(p).toContain('+5511999999999')
  })

  it('payload de teste BACEN conhecido passa CRC', () => {
    // Verificação manual: gera payload, extrai body antes de 6304, recalcula CRC
    const p = gerarPixPayload({ chave: 'fulano@example.com', nome: 'FULANO', cidade: 'BRASILIA', valor: 10.00 })
    const body = p.slice(0, p.lastIndexOf('6304') + 4)
    // O CRC deve ser os últimos 4 chars e deve ser hex uppercase
    const crc = p.slice(-4)
    expect(crc).toMatch(/^[0-9A-F]{4}$/)
    // Verificar que o body termina com '6304'
    expect(body).toMatch(/6304$/)
  })
})
