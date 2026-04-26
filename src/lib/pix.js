// PIX EMV Merchant QR Code — BACEN specification
// https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf

function crc16(str) {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function tlv(id, value) {
  return `${id}${String(value.length).padStart(2, '0')}${value}`
}

function ascii(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '')
}

/**
 * Gera o payload PIX Estático (EMV).
 * @param {{ chave: string, nome: string, cidade: string, valor?: number|null, txid?: string, descricao?: string }} opts
 * @returns {string} payload completo com CRC16
 */
export function gerarPixPayload({ chave, nome, cidade, valor = null, txid = '***', descricao = '' }) {
  const nomeN  = ascii(nome).slice(0, 25).toUpperCase() || 'RECEBEDOR'
  const cidadeN = ascii(cidade).slice(0, 15).toUpperCase() || 'BRASIL'
  const txidN  = (txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***'

  const gui  = tlv('00', 'br.gov.bcb.pix')
  const key  = tlv('01', chave)
  const desc = descricao ? tlv('02', ascii(descricao).slice(0, 72)) : ''
  const mai  = tlv('26', gui + key + desc)

  const amount = valor !== null && Number(valor) > 0
    ? tlv('54', Number(valor).toFixed(2))
    : ''

  const adf = tlv('62', tlv('05', txidN))

  const body = [
    tlv('00', '01'),      // Payload Format Indicator
    tlv('01', '12'),      // Point of Initiation Method (static)
    mai,                  // Merchant Account Information
    tlv('52', '0000'),   // Merchant Category Code
    tlv('53', '986'),    // Transaction Currency (BRL)
    amount,               // Transaction Amount (optional)
    tlv('58', 'BR'),     // Country Code
    tlv('59', nomeN),    // Merchant Name
    tlv('60', cidadeN),  // Merchant City
    adf,                  // Additional Data Field Template
    '6304',               // CRC placeholder
  ].join('')

  return body + crc16(body)
}
