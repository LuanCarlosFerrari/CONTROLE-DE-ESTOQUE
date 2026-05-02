import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buscarCep, buscarCnpj, formatCep, formatCnpj } from './brasilapi'

// ── Mock global fetch ────────────────────────────────────────────────────────
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockOk(body) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => body })
}
function mockErr() {
  mockFetch.mockResolvedValueOnce({ ok: false })
}

beforeEach(() => vi.clearAllMocks())

// ── formatCep ────────────────────────────────────────────────────────────────

describe('formatCep', () => {
  it('formata 8 dígitos', () => {
    expect(formatCep('01310100')).toBe('01310-100')
  })
  it('ignora caracteres não numéricos', () => {
    expect(formatCep('01310-100')).toBe('01310-100')
  })
  it('limita a 8 dígitos', () => {
    expect(formatCep('012345678')).toBe('01234-567')
  })
  it('retorna parcial se menos de 5 dígitos', () => {
    expect(formatCep('0131')).toBe('0131')
  })
})

// ── formatCnpj ───────────────────────────────────────────────────────────────

describe('formatCnpj', () => {
  it('formata 14 dígitos', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81')
  })
  it('ignora caracteres não numéricos', () => {
    expect(formatCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81')
  })
  it('retorna parcial durante digitação', () => {
    expect(formatCnpj('112223')).toBe('11.222.3')
  })
  it('limita a 14 dígitos', () => {
    expect(formatCnpj('112223330001819')).toBe('11.222.333/0001-81')
  })
})

// ── buscarCep ────────────────────────────────────────────────────────────────

describe('buscarCep', () => {
  it('retorna null para CEP com menos de 8 dígitos', async () => {
    expect(await buscarCep('1234')).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('retorna null se a API retornar erro', async () => {
    mockErr()
    expect(await buscarCep('00000000')).toBeNull()
  })

  it('normaliza a resposta da BrasilAPI', async () => {
    mockOk({ cep: '01310-100', street: 'Avenida Paulista', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' })
    const result = await buscarCep('01310100')
    expect(result).toEqual({ logradouro: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP' })
  })

  it('aceita CEP com máscara', async () => {
    mockOk({ street: 'Rua X', neighborhood: 'Centro', city: 'Campinas', state: 'SP' })
    await buscarCep('13010-020')
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/13010020'))
  })

  it('preenche strings vazias para campos ausentes', async () => {
    mockOk({ city: 'Recife', state: 'PE' })
    const result = await buscarCep('50010100')
    expect(result).toMatchObject({ logradouro: '', bairro: '', cidade: 'Recife', estado: 'PE' })
  })
})

// ── buscarCnpj ───────────────────────────────────────────────────────────────

describe('buscarCnpj', () => {
  it('retorna null para CNPJ com menos de 14 dígitos', async () => {
    expect(await buscarCnpj('1234567')).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('retorna null se a API retornar erro', async () => {
    mockErr()
    expect(await buscarCnpj('11222333000181')).toBeNull()
  })

  it('normaliza a resposta da BrasilAPI', async () => {
    mockOk({
      razao_social: 'EMPRESA LTDA', nome_fantasia: 'Empresa',
      email: 'contato@empresa.com', ddd_telefone_1: '11 3333-4444',
      municipio: 'SAO PAULO', uf: 'SP',
      logradouro: 'RUA DAS FLORES', numero: '100', bairro: 'CENTRO',
      cep: '01234567',
    })
    const result = await buscarCnpj('11222333000181')
    expect(result).toMatchObject({
      razaoSocial: 'EMPRESA LTDA',
      nomeFantasia: 'Empresa',
      email: 'contato@empresa.com',
      cidade: 'SAO PAULO',
      estado: 'SP',
      cep: '01234567',
    })
  })

  it('aceita CNPJ com máscara', async () => {
    mockOk({ razao_social: 'X', municipio: 'Y', uf: 'Z' })
    await buscarCnpj('11.222.333/0001-81')
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/11222333000181'))
  })

  it('preenche strings vazias para campos ausentes', async () => {
    mockOk({ razao_social: 'EMPRESA' })
    const result = await buscarCnpj('11222333000181')
    expect(result).toMatchObject({ email: '', telefone: '', nomeFantasia: '', cidade: '' })
  })
})
