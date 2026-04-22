// ============================================================
// COLE ESTE CÓDIGO NO GOOGLE APPS SCRIPT DA SUA PLANILHA
// Extensões → Apps Script → cole tudo aqui → Salvar → Implantar
// ============================================================

const SHEET_NAME = 'Curadoria 2026'

// Mapeamento de colunas (baseado na estrutura da planilha)
const COLS = {
  NR:          1,   // A — Nº artista
  NOME:        2,   // B — Nome Artístico
  HIST:        3,   // C — Histórico
  PORT:        4,   // D — Portfólio
  EVENTO:      5,   // E — Evento da Obra
  TITULO:      6,   // F — Título da Obra
  DESC:        7,   // G — Descrição
  ANO:         8,   // H — Ano
  FORMATO:     9,   // I — Formato
  DRIVE:      10,   // J — Link Drive
  MKT:        11,   // K — Link Marketplace
  CURADOR1:   12,   // L — Curador 1
  CURADOR2:   13,   // M — Curador 2
  CURADOR3:   14,   // N — Curador 3
  RESULTADO:  15,   // O — Resultado
}

function doGet(e) {
  const action = e.parameter.action
  if (action === 'getObras') return getObras()
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON)
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents)
  if (body.action === 'votar') return votar(body)
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON)
}

function getObras() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
  const lastRow = sheet.getLastRow()
  const data = sheet.getRange(2, 1, lastRow - 1, 15).getValues()

  const obras = data
    .map((row, i) => ({
      row:          i + 2,  // real sheet row number
      nomeArtistico: String(row[COLS.NOME - 1]   || '').trim(),
      evento:        String(row[COLS.EVENTO - 1]  || '').trim(),
      titulo:        String(row[COLS.TITULO - 1]  || '').trim(),
      descricao:     String(row[COLS.DESC - 1]    || '').trim(),
      ano:           String(row[COLS.ANO - 1]     || '').trim(),
      formato:       String(row[COLS.FORMATO - 1] || '').trim(),
      drive:         String(row[COLS.DRIVE - 1]   || '').trim(),
      marketplace:   String(row[COLS.MKT - 1]     || '').trim(),
      voto1:         String(row[COLS.CURADOR1 - 1]|| '').trim(),
      voto2:         String(row[COLS.CURADOR2 - 1]|| '').trim(),
      voto3:         String(row[COLS.CURADOR3 - 1]|| '').trim(),
      resultado:     String(row[COLS.RESULTADO - 1]|| '').trim(),
    }))
    .filter(o => o.titulo)  // skip empty rows

  const response = { obras }
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
}

function votar(body) {
  const { row, curador, voto } = body

  // curador = 1, 2 ou 3 → coluna L, M ou N
  const col = COLS.CURADOR1 + (parseInt(curador) - 1)

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
  sheet.getRange(parseInt(row), col).setValue(voto || '')

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON)
}
