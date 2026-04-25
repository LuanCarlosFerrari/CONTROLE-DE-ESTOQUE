export const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatDate = (dateStr) =>
  dateStr ? new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

export const formatPhone = (phone) =>
  phone ? phone.replace(/\D/g, '') : ''

export const whatsappLink = (phone) =>
  `https://wa.me/55${formatPhone(phone)}`
