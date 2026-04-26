const FORMA_LABEL = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao: 'Cartão',
  crediario: 'Crediário',
  outros: 'Outros',
}

function fmt(value) {
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function dt(isoString) {
  const d = new Date(isoString)
  return {
    data: d.toLocaleDateString('pt-BR'),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

/**
 * Abre uma janela com o recibo de venda e dispara a impressão.
 * @param {{ venda, itens, cliente, negocio }} opts
 *   venda   – { id, created_at, total, forma_pagamento, observacao }
 *   itens   – [{ nome, quantidade, preco_unitario }]
 *   cliente – { nome, telefone?, email?, cidade? }
 *   negocio – { nome?, pix_chave? }
 */
export function imprimirRecibo({ venda, itens, cliente, negocio = {} }) {
  const { data, hora } = dt(venda.created_at || new Date().toISOString())
  const num = String(venda.id || '').slice(-8).toUpperCase()
  const negocioNome = negocio.nome || 'Meu Negócio'
  const forma = FORMA_LABEL[venda.forma_pagamento] || venda.forma_pagamento || '—'
  const isPix = venda.forma_pagamento === 'pix'

  const linhasItens = (itens || []).map(item => {
    const subtotal = Number(item.quantidade) * Number(item.preco_unitario)
    return `
      <tr>
        <td>${item.nome}</td>
        <td class="center">${item.quantidade}</td>
        <td class="right mono">R$ ${fmt(item.preco_unitario)}</td>
        <td class="right mono">R$ ${fmt(subtotal)}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Recibo #${num}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #111;
    background: #fff;
    padding: 24px 20px;
    max-width: 380px;
    margin: 0 auto;
  }
  .header { text-align: center; margin-bottom: 18px; }
  .negocio {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .titulo {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #555;
    margin-bottom: 2px;
  }
  .divider {
    border: none;
    border-top: 1px dashed #bbb;
    margin: 12px 0;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 11px;
  }
  .meta span:first-child { color: #555; }
  .meta span:last-child { font-weight: 600; }
  .section-title {
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
    font-size: 11.5px;
  }
  thead th {
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #888;
    padding-bottom: 6px;
    border-bottom: 1px solid #ddd;
    text-align: left;
  }
  thead th.center { text-align: center; }
  thead th.right { text-align: right; }
  tbody td {
    padding: 5px 0;
    border-bottom: 1px dotted #eee;
    vertical-align: middle;
  }
  td.center { text-align: center; }
  td.right { text-align: right; }
  .mono { font-family: 'Courier New', monospace; }
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0 4px;
  }
  .total-label { font-size: 12px; color: #555; }
  .total-value { font-size: 18px; font-weight: 700; }
  .pix-box {
    background: #f4f4f4;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 8px 12px;
    margin-top: 8px;
    font-size: 11px;
  }
  .pix-box .label { color: #888; margin-bottom: 2px; }
  .pix-box .chave { font-weight: 600; word-break: break-all; }
  .obs {
    font-style: italic;
    font-size: 11px;
    color: #555;
    margin-top: 6px;
  }
  .footer {
    text-align: center;
    font-size: 10px;
    color: #aaa;
    margin-top: 6px;
    line-height: 1.6;
  }
  @media print {
    body { padding: 0; }
    @page { margin: 8mm; size: 80mm auto; }
  }
</style>
</head>
<body>

  <div class="header">
    <div class="negocio">${negocioNome}</div>
    <div class="titulo">Recibo de Venda</div>
  </div>

  <hr class="divider" />

  <div class="meta"><span>Nº</span><span class="mono">#${num}</span></div>
  <div class="meta"><span>Data</span><span>${data} às ${hora}</span></div>

  <hr class="divider" />

  <div class="section-title">Cliente</div>
  <div class="meta"><span>Nome</span><span>${cliente?.nome || '—'}</span></div>
  ${cliente?.telefone ? `<div class="meta"><span>Tel</span><span>${cliente.telefone}</span></div>` : ''}
  ${cliente?.email    ? `<div class="meta"><span>Email</span><span>${cliente.email}</span></div>` : ''}
  ${cliente?.cidade   ? `<div class="meta"><span>Cidade</span><span>${cliente.cidade}</span></div>` : ''}

  <hr class="divider" />

  <div class="section-title">Itens</div>
  <table>
    <thead>
      <tr>
        <th>Produto</th>
        <th class="center">Qtd</th>
        <th class="right">Unit.</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${linhasItens}
    </tbody>
  </table>

  <hr class="divider" />

  <div class="total-row">
    <span class="total-label">TOTAL</span>
    <span class="total-value mono">R$ ${fmt(venda.total)}</span>
  </div>

  <div class="meta" style="padding-top:4px"><span>Pagamento</span><span>${forma}</span></div>

  ${isPix && negocio.pix_chave ? `
  <div class="pix-box">
    <div class="label">Chave PIX</div>
    <div class="chave">${negocio.pix_chave}</div>
  </div>` : ''}

  ${venda.observacao ? `<div class="obs">"${venda.observacao}"</div>` : ''}

  <hr class="divider" />

  <div class="footer">
    Este documento não possui validade fiscal.<br/>
    Emitido em ${data} às ${hora}
  </div>

</body>
</html>`

  const win = window.open('', '_blank', 'width=420,height=680,scrollbars=yes')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}
