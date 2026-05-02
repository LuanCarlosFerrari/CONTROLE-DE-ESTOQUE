const BASE = 'https://brasilapi.com.br/api'

/**
 * Busca endereço pelo CEP.
 * @param {string} cep - CEP com ou sem máscara
 * @returns {{ logradouro, bairro, cidade, estado } | null}
 */
export async function buscarCep(cep) {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return null
  const res = await fetch(`${BASE}/cep/v2/${digits}`)
  if (!res.ok) return null
  const d = await res.json()
  return {
    logradouro: d.street      || '',
    bairro:     d.neighborhood || '',
    cidade:     d.city         || '',
    estado:     d.state        || '',
  }
}

/**
 * Busca dados da empresa pelo CNPJ.
 * @param {string} cnpj - CNPJ com ou sem máscara
 * @returns {{ razaoSocial, nomeFantasia, email, telefone, cidade, estado, logradouro, numero, bairro, cep } | null}
 */
export async function buscarCnpj(cnpj) {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return null
  const res = await fetch(`${BASE}/cnpj/v1/${digits}`)
  if (!res.ok) return null
  const d = await res.json()
  return {
    razaoSocial:  d.razao_social   || '',
    nomeFantasia: d.nome_fantasia  || '',
    email:        d.email          || '',
    telefone:     d.ddd_telefone_1 || '',
    cidade:       d.municipio      || '',
    estado:       d.uf             || '',
    logradouro:   d.logradouro     || '',
    numero:       d.numero         || '',
    bairro:       d.bairro         || '',
    cep:          d.cep            || '',
  }
}

/** Formata CNPJ: 00000000000000 → 00.000.000/0001-00 */
export function formatCnpj(value) {
  const d = value.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2)  return d
  if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

/** Formata CEP: 00000000 → 00000-000 */
export function formatCep(value) {
  const d = value.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d
}
