// ============================================================
// COLE ESTE CÓDIGO NO GOOGLE APPS SCRIPT DA SUA PLANILHA
// Extensões → Apps Script → cole tudo aqui → Salvar → Implantar
// ============================================================
//
// NOVAS COLUNAS NECESSÁRIAS NA PLANILHA (adicionar manualmente):
//   P — Votos Sim (público)
//   Q — Votos Não (público)
//   R — Votos Talvez (público)
//   S — Emails que votaram (separados por vírgula)
// ============================================================

const SHEET_NAME = 'Curadoria 2026'

const COLS = {
  NR:          1,   // A
  NOME:        2,   // B
  HIST:        3,   // C
  PORT:        4,   // D
  EVENTO:      5,   // E
  TITULO:      6,   // F
  DESC:        7,   // G
  ANO:         8,   // H
  FORMATO:     9,   // I
  DRIVE:      10,   // J
  MKT:        11,   // K
  CURADOR1:   12,   // L
  CURADOR2:   13,   // M
  CURADOR3:   14,   // N
  RESULTADO:  15,   // O
  VOTOS_SIM:  16,   // P — público
  VOTOS_NAO:  17,   // Q — público
  VOTOS_TAL:  18,   // R — público
  EMAILS:     19,   // S — lista de emails que votaram
}

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : null
  if (action === 'getObras') return getObras()
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON)
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents)
  if (body.action === 'votar')        return votar(body)
  if (body.action === 'votarPublico') return votarPublico(body)
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON)
}

function getObras() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
  const lastRow = sheet.getLastRow()
  const data = sheet.getRange(2, 1, lastRow - 1, 19).getValues()

  const obras = data
    .map((row, i) => ({
      row:           i + 2,
      nomeArtistico: String(row[COLS.NOME - 1]      || '').trim(),
      evento:        String(row[COLS.EVENTO - 1]    || '').trim(),
      titulo:        String(row[COLS.TITULO - 1]    || '').trim(),
      descricao:     String(row[COLS.DESC - 1]      || '').trim(),
      ano:           String(row[COLS.ANO - 1]       || '').trim(),
      formato:       String(row[COLS.FORMATO - 1]   || '').trim(),
      drive:         String(row[COLS.DRIVE - 1]     || '').trim(),
      marketplace:   String(row[COLS.MKT - 1]       || '').trim(),
      voto1:         String(row[COLS.CURADOR1 - 1]  || '').trim(),
      voto2:         String(row[COLS.CURADOR2 - 1]  || '').trim(),
      voto3:         String(row[COLS.CURADOR3 - 1]  || '').trim(),
      resultado:     String(row[COLS.RESULTADO - 1] || '').trim(),
      votosSim:      Number(row[COLS.VOTOS_SIM - 1] || 0),
      votosNao:      Number(row[COLS.VOTOS_NAO - 1] || 0),
      votosTalvez:   Number(row[COLS.VOTOS_TAL - 1] || 0),
    }))
    .filter(o => o.titulo)

  return ContentService.createTextOutput(JSON.stringify({ obras }))
    .setMimeType(ContentService.MimeType.JSON)
}

// Voto dos curadores (sistema interno)
function votar(body) {
  const { row, curador, voto } = body
  const col = COLS.CURADOR1 + (parseInt(curador) - 1)
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
  sheet.getRange(parseInt(row), col).setValue(voto || '')
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON)
}

// Voto do público
function votarPublico(body) {
  const { row, email, voto } = body
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
  const r = parseInt(row)

  // Verifica se o email já votou nessa obra
  const emailsCell = sheet.getRange(r, COLS.EMAILS)
  const emailsRaw  = String(emailsCell.getValue() || '')
  const emails     = emailsRaw ? emailsRaw.split(',').map(e => e.trim()) : []

  // Encontra voto anterior desse email nessa obra
  const PREFIX    = email + ':'
  const prevEntry = emails.find(e => e.startsWith(PREFIX))
  const prevVoto  = prevEntry ? prevEntry.split(':')[1] : null

  // Remove entrada anterior se existir
  const emailsLimpos = emails.filter(e => !e.startsWith(PREFIX))

  // Mapeamento voto → coluna
  const colMap = {
    sim:    COLS.VOTOS_SIM,
    nao:    COLS.VOTOS_NAO,
    talvez: COLS.VOTOS_TAL,
  }

  // Decrementa voto anterior
  if (prevVoto && colMap[prevVoto]) {
    const c = sheet.getRange(r, colMap[prevVoto])
    c.setValue(Math.max(0, Number(c.getValue() || 0) - 1))
  }

  // Se clicou no mesmo voto → remove (toggle off)
  if (prevVoto === voto) {
    emailsCell.setValue(emailsLimpos.join(','))
    return ContentService.createTextOutput(JSON.stringify({ ok: true, removed: true }))
      .setMimeType(ContentService.MimeType.JSON)
  }

  // Incrementa novo voto
  if (colMap[voto]) {
    const c = sheet.getRange(r, colMap[voto])
    c.setValue(Number(c.getValue() || 0) + 1)
  }

  // Salva email com voto
  emailsLimpos.push(PREFIX + voto)
  emailsCell.setValue(emailsLimpos.join(','))

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON)
}
