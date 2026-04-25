/**
 * Adiciona N meses a uma data ISO (YYYY-MM-DD).
 * Usa horário fixo T12:00:00 para evitar problemas de fuso.
 * Se o dia não existir no mês destino (ex: 31 em fevereiro), vai para o último dia válido.
 */
export function nextMonthDate(base, addMonths) {
  const origin    = new Date(base + 'T12:00:00')
  const targetDay = origin.getDate()
  // Move para o dia 1 antes de trocar o mês — evita overflow automático do JS
  origin.setDate(1)
  origin.setMonth(origin.getMonth() + addMonths)
  // Clipa o dia ao último dia válido do mês destino
  const lastDay = new Date(origin.getFullYear(), origin.getMonth() + 1, 0).getDate()
  origin.setDate(Math.min(targetDay, lastDay))
  return origin.toISOString().split('T')[0]
}

/**
 * Soma total de uma lista de itens de venda.
 * Aceita valores numéricos ou strings (coerção segura).
 */
export function calcularTotal(itens) {
  return itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.preco_unitario), 0)
}

/**
 * Calcula os dados financeiros de uma venda com crediário.
 * @param {object} params
 * @param {Array}  params.itens            - [{quantidade, preco_unitario}]
 * @param {number} params.entrada          - valor da entrada (pode ser 0)
 * @param {number} params.numParcelas      - número de parcelas (>= 1)
 * @param {string} params.dataFirstParcela - data da primeira parcela (YYYY-MM-DD)
 * @returns {{ totalVenda, valorRestante, valorParcela, parcelas }}
 */
export function calcularCrediario({ itens, entrada, numParcelas, dataFirstParcela }) {
  const totalVenda    = calcularTotal(itens)
  const valorRestante = Math.max(0, totalVenda - Number(entrada || 0))
  const n             = Number(numParcelas)
  const valorParcela  = n > 0 ? valorRestante / n : 0

  const parcelas = Array.from({ length: n }, (_, i) => ({
    num:   i + 1,
    valor: valorParcela,
    data:  nextMonthDate(dataFirstParcela, i),
  }))

  return { totalVenda, valorRestante, valorParcela, parcelas }
}
