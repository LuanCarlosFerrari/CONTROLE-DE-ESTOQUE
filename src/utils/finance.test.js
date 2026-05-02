import { describe, it, expect } from 'vitest'
import { nextMonthDate, calcularTotal, calcularCrediario } from './finance'

// ── nextMonthDate ───────────────────────────────────────────────────────────

describe('nextMonthDate', () => {
  it('avança um mês simples', () => {
    expect(nextMonthDate('2026-04-15', 1)).toBe('2026-05-15')
  })

  it('avança vários meses', () => {
    expect(nextMonthDate('2026-01-10', 3)).toBe('2026-04-10')
  })

  it('cruza virada de ano', () => {
    expect(nextMonthDate('2026-11-01', 2)).toBe('2027-01-01')
  })

  it('ajusta dia inválido (31 jan + 1 mês → 28 fev em ano não bissexto)', () => {
    expect(nextMonthDate('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('ajusta dia inválido (31 jan + 1 mês → 29 fev em ano bissexto)', () => {
    expect(nextMonthDate('2028-01-31', 1)).toBe('2028-02-29')
  })

  it('retorna a própria data quando addMonths = 0', () => {
    expect(nextMonthDate('2026-06-15', 0)).toBe('2026-06-15')
  })

  it('gera datas sequenciais para parcelas mensais', () => {
    const datas = [0, 1, 2].map(i => nextMonthDate('2026-05-01', i))
    expect(datas).toEqual(['2026-05-01', '2026-06-01', '2026-07-01'])
  })
})

// ── calcularTotal ───────────────────────────────────────────────────────────

describe('calcularTotal', () => {
  it('soma corretamente múltiplos itens', () => {
    const itens = [
      { quantidade: 2, preco_unitario: 50 },
      { quantidade: 3, preco_unitario: 10 },
    ]
    expect(calcularTotal(itens)).toBe(130)
  })

  it('retorna 0 para lista vazia', () => {
    expect(calcularTotal([])).toBe(0)
  })

  it('aceita strings numéricas (comportamento do formulário)', () => {
    const itens = [{ quantidade: '2', preco_unitario: '49.90' }]
    expect(calcularTotal(itens)).toBeCloseTo(99.8)
  })

  it('ignora item com quantidade zero', () => {
    const itens = [
      { quantidade: 0, preco_unitario: 100 },
      { quantidade: 1, preco_unitario: 50 },
    ]
    expect(calcularTotal(itens)).toBe(50)
  })

  it('lida com item de preço zero', () => {
    const itens = [{ quantidade: 5, preco_unitario: 0 }]
    expect(calcularTotal(itens)).toBe(0)
  })
})

// ── calcularCrediario ───────────────────────────────────────────────────────

describe('calcularCrediario', () => {
  const itens = [
    { quantidade: 2, preco_unitario: 100 },  // 200
    { quantidade: 1, preco_unitario: 50 },   //  50  → total = 250
  ]

  it('calcula totalVenda corretamente', () => {
    const { totalVenda } = calcularCrediario({ itens, entrada: 0, numParcelas: 3, dataFirstParcela: '2026-05-01' })
    expect(totalVenda).toBe(250)
  })

  it('desconta a entrada do valor restante', () => {
    const { valorRestante } = calcularCrediario({ itens, entrada: 50, numParcelas: 3, dataFirstParcela: '2026-05-01' })
    expect(valorRestante).toBe(200)
  })

  it('valorRestante nunca é negativo (entrada maior que total)', () => {
    const { valorRestante } = calcularCrediario({ itens, entrada: 9999, numParcelas: 3, dataFirstParcela: '2026-05-01' })
    expect(valorRestante).toBe(0)
  })

  it('divide o restante igualmente entre as parcelas', () => {
    const { valorParcela } = calcularCrediario({ itens, entrada: 100, numParcelas: 3, dataFirstParcela: '2026-05-01' })
    expect(valorParcela).toBeCloseTo(50)
  })

  it('valorParcela é 0 quando numParcelas = 0 (sem divisão por zero)', () => {
    const { valorParcela } = calcularCrediario({ itens, entrada: 0, numParcelas: 0, dataFirstParcela: '2026-05-01' })
    expect(valorParcela).toBe(0)
  })

  it('gera array de parcelas com comprimento correto', () => {
    const { parcelas } = calcularCrediario({ itens, entrada: 0, numParcelas: 4, dataFirstParcela: '2026-05-01' })
    expect(parcelas).toHaveLength(4)
  })

  it('cada parcela tem os campos num, valor e data', () => {
    const { parcelas } = calcularCrediario({ itens, entrada: 0, numParcelas: 2, dataFirstParcela: '2026-05-01' })
    expect(parcelas[0]).toMatchObject({ num: 1, data: '2026-05-01' })
    expect(parcelas[1]).toMatchObject({ num: 2, data: '2026-06-01' })
  })

  it('todas as parcelas têm o mesmo valor quando a divisão é exata', () => {
    const { parcelas, valorParcela } = calcularCrediario({ itens, entrada: 0, numParcelas: 5, dataFirstParcela: '2026-05-01' })
    parcelas.forEach(p => expect(p.valor).toBeCloseTo(valorParcela))
  })

  it('última parcela absorve diferença de centavo em divisão não exata', () => {
    const itensReais = [{ quantidade: 1, preco_unitario: 100 }]
    const { parcelas } = calcularCrediario({ itens: itensReais, entrada: 0, numParcelas: 3, dataFirstParcela: '2026-05-01' })
    // 100 / 3 → 33.33 + 33.33 + 33.34 = 100.00
    expect(parcelas[0].valor).toBe(33.33)
    expect(parcelas[1].valor).toBe(33.33)
    expect(parcelas[2].valor).toBe(33.34)
    const soma = parcelas.reduce((s, p) => Math.round((s + p.valor) * 100) / 100, 0)
    expect(soma).toBe(100)
  })

  it('funciona com entrada string (campo de formulário)', () => {
    const { valorRestante } = calcularCrediario({ itens, entrada: '50', numParcelas: 2, dataFirstParcela: '2026-05-01' })
    expect(valorRestante).toBe(200)
  })

  it('funciona com numParcelas string', () => {
    const { parcelas } = calcularCrediario({ itens, entrada: 0, numParcelas: '3', dataFirstParcela: '2026-05-01' })
    expect(parcelas).toHaveLength(3)
  })

  it('caso real: R$ 1.500 com R$ 300 de entrada em 6x', () => {
    const itensReais = [{ quantidade: 1, preco_unitario: 1500 }]
    const { totalVenda, valorRestante, valorParcela, parcelas } =
      calcularCrediario({ itens: itensReais, entrada: 300, numParcelas: 6, dataFirstParcela: '2026-05-15' })

    expect(totalVenda).toBe(1500)
    expect(valorRestante).toBe(1200)
    expect(valorParcela).toBe(200)
    expect(parcelas).toHaveLength(6)
    expect(parcelas[0].data).toBe('2026-05-15')
    expect(parcelas[5].data).toBe('2026-10-15')
  })
})
