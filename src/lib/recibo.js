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
 * Abre uma janela com o recibo de venda formatado em A4 e dispara a impressão.
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

  const linhasItens = (itens || []).map((item, idx) => {
    const subtotal = Number(item.quantidade) * Number(item.preco_unitario)
    return `
      <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="td-produto">${item.nome}</td>
        <td class="td-center">${item.quantidade}</td>
        <td class="td-right mono">R$&nbsp;${fmt(item.preco_unitario)}</td>
        <td class="td-right mono bold">R$&nbsp;${fmt(subtotal)}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Recibo #${num}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  @page {
    size: A4 portrait;
    margin: 18mm 20mm;
  }

  html, body {
    width: 210mm;
    min-height: 297mm;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    color: #1a1a1a;
    background: #fff;
  }

  .page {
    width: 100%;
    min-height: 257mm; /* 297 - 2×18mm margin */
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  /* ── Cabeçalho ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 14pt;
    border-bottom: 2pt solid #1a1a1a;
    margin-bottom: 18pt;
  }
  .header-left .negocio {
    font-size: 18pt;
    font-weight: 800;
    letter-spacing: -0.3pt;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .header-left .subtitulo {
    font-size: 8pt;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1.5pt;
    margin-top: 3pt;
  }
  .header-right {
    text-align: right;
  }
  .header-right .doc-title {
    font-size: 14pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1pt;
    color: #333;
  }
  .header-right .doc-num {
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    color: #666;
    margin-top: 3pt;
  }
  .header-right .doc-data {
    font-size: 9pt;
    color: #888;
    margin-top: 2pt;
  }

  /* ── Seção Cliente ── */
  .section {
    margin-bottom: 16pt;
  }
  .section-label {
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 1.5pt;
    text-transform: uppercase;
    color: #888;
    border-bottom: 0.5pt solid #ddd;
    padding-bottom: 4pt;
    margin-bottom: 8pt;
  }
  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6pt 16pt;
  }
  .info-item .info-key {
    font-size: 7.5pt;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    margin-bottom: 1pt;
  }
  .info-item .info-val {
    font-size: 10pt;
    font-weight: 600;
    color: #111;
  }

  /* ── Tabela de itens ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0;
    font-size: 10pt;
  }
  thead tr {
    background: #1a1a1a;
    color: #fff;
  }
  thead th {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.8pt;
    text-transform: uppercase;
    padding: 7pt 8pt;
    text-align: left;
  }
  thead th.th-center { text-align: center; }
  thead th.th-right  { text-align: right; }

  .row-even { background: #fff; }
  .row-odd  { background: #f9f9f9; }

  tbody td {
    padding: 6pt 8pt;
    border-bottom: 0.5pt solid #eee;
    vertical-align: middle;
    font-size: 10pt;
  }
  .td-produto { max-width: 200pt; }
  .td-center  { text-align: center; }
  .td-right   { text-align: right; }
  .mono { font-family: 'Courier New', monospace; }
  .bold { font-weight: 700; }

  /* ── Total ── */
  .total-section {
    display: flex;
    justify-content: flex-end;
    margin-top: 0;
  }
  .total-box {
    width: 220pt;
    border: 0.5pt solid #ddd;
    border-top: none;
  }
  .total-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6pt 10pt;
    border-bottom: 0.5pt solid #eee;
    font-size: 10pt;
  }
  .total-line .tl-label { color: #555; }
  .total-line .tl-val   { font-family: 'Courier New', monospace; font-weight: 600; }
  .total-line.highlight {
    background: #1a1a1a;
    color: #fff;
    padding: 9pt 10pt;
  }
  .total-line.highlight .tl-label { color: #ccc; font-size: 9pt; font-weight: 700; letter-spacing: 1pt; text-transform: uppercase; }
  .total-line.highlight .tl-val   { color: #fff; font-size: 14pt; font-weight: 800; }

  /* ── Pagamento / PIX ── */
  .payment-row {
    margin-top: 14pt;
    display: flex;
    gap: 12pt;
    align-items: flex-start;
  }
  .payment-badge {
    display: inline-flex;
    align-items: center;
    gap: 5pt;
    background: #f0f0f0;
    border: 0.5pt solid #ddd;
    border-radius: 4pt;
    padding: 5pt 10pt;
    font-size: 9.5pt;
    font-weight: 700;
    color: #333;
  }
  .pix-box {
    background: #f5faf7;
    border: 0.5pt solid #b2dfc7;
    border-radius: 4pt;
    padding: 6pt 10pt;
    font-size: 9.5pt;
  }
  .pix-box .plabel { color: #4a9e72; font-weight: 700; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5pt; margin-bottom: 2pt; }
  .pix-box .pchave { font-weight: 600; word-break: break-all; color: #1a1a1a; }

  /* ── Observação ── */
  .obs {
    margin-top: 12pt;
    background: #fafafa;
    border-left: 2pt solid #ccc;
    padding: 6pt 10pt;
    font-size: 9.5pt;
    color: #555;
    font-style: italic;
  }

  /* ── Rodapé ── */
  .footer {
    margin-top: auto;
    padding-top: 14pt;
    border-top: 0.5pt solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .footer-left {
    font-size: 8pt;
    color: #aaa;
    line-height: 1.7;
  }
  .assinatura {
    text-align: center;
    font-size: 8pt;
    color: #aaa;
  }
  .assinatura-linha {
    width: 140pt;
    border-top: 0.5pt solid #bbb;
    margin-bottom: 4pt;
  }

  @media print {
    html, body { width: 210mm; }
    .page { min-height: auto; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Cabeçalho -->
  <div class="header">
    <div class="header-left">
      <div class="negocio">${negocioNome}</div>
      <div class="subtitulo">Documento de venda</div>
    </div>
    <div class="header-right">
      <div class="doc-title">Recibo de Venda</div>
      <div class="doc-num">Nº #${num}</div>
      <div class="doc-data">${data} &nbsp;·&nbsp; ${hora}</div>
    </div>
  </div>

  <!-- Cliente -->
  <div class="section">
    <div class="section-label">Dados do cliente</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-key">Nome</div>
        <div class="info-val">${cliente?.nome || '—'}</div>
      </div>
      ${cliente?.telefone ? `
      <div class="info-item">
        <div class="info-key">Telefone</div>
        <div class="info-val">${cliente.telefone}</div>
      </div>` : ''}
      ${cliente?.email ? `
      <div class="info-item">
        <div class="info-key">E-mail</div>
        <div class="info-val">${cliente.email}</div>
      </div>` : ''}
      ${cliente?.cidade ? `
      <div class="info-item">
        <div class="info-key">Cidade</div>
        <div class="info-val">${cliente.cidade}</div>
      </div>` : ''}
    </div>
  </div>

  <!-- Itens -->
  <div class="section">
    <div class="section-label">Itens da venda</div>
    <table>
      <thead>
        <tr>
          <th>Produto / Descrição</th>
          <th class="th-center">Qtd.</th>
          <th class="th-right">Preço Unit.</th>
          <th class="th-right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${linhasItens}
      </tbody>
    </table>
  </div>

  <!-- Total -->
  <div class="total-section">
    <div class="total-box">
      <div class="total-line highlight">
        <span class="tl-label">Total</span>
        <span class="tl-val mono">R$&nbsp;${fmt(venda.total)}</span>
      </div>
    </div>
  </div>

  <!-- Pagamento -->
  <div class="payment-row">
    <div class="payment-badge">Forma de pagamento: ${forma}</div>
    ${isPix && negocio.pix_chave ? `
    <div class="pix-box">
      <div class="plabel">Chave PIX</div>
      <div class="pchave">${negocio.pix_chave}</div>
    </div>` : ''}
  </div>

  ${venda.observacao ? `<div class="obs">"${venda.observacao}"</div>` : ''}

  <!-- Rodapé -->
  <div class="footer">
    <div class="footer-left">
      Este documento não possui validade fiscal.<br />
      Emitido em ${data} às ${hora} &nbsp;·&nbsp; ${negocioNome}
    </div>
    <div class="assinatura">
      <div class="assinatura-linha"></div>
      Assinatura do cliente
    </div>
  </div>

</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=860,height=1100,scrollbars=yes')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}
