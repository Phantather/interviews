/**
 * Анкета «Питание жителей Нарына» — сохранение ответов в Google Таблицу.
 * Скрипт создаётся из самой таблицы: Расширения → Apps Script.
 * Каждая анкета записывается отдельной строкой на лист «Ответы».
 */
const SHEET_NAME = 'Ответы';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Питание жителей Нарына — анкета')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Принимает массив пар [название столбца, значение] из анкеты. */
function saveResponse(pairs) {
  if (!Array.isArray(pairs) || !pairs.length) throw new Error('Пустая анкета');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Шапка таблицы: создаём при первой анкете, дополняем, если появились новые столбцы
    let headers = sh.getLastRow() > 0
      ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String)
      : ['№ анкеты', 'Дата и время'];
    let changed = sh.getLastRow() === 0;
    pairs.forEach(function (p) {
      if (headers.indexOf(String(p[0])) === -1) { headers.push(String(p[0])); changed = true; }
    });
    if (changed) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setWrap(true);
      sh.setFrozenRows(1);
    }

    const num = Math.max(1, sh.getLastRow()); // номер = порядковый номер строки с ответом
    const row = new Array(headers.length).fill('');
    row[0] = num;
    row[1] = new Date();
    pairs.forEach(function (p) {
      let v = p[1] == null ? '' : String(p[1]).slice(0, 5000);
      if (/^[=+\-@]/.test(v)) v = "'" + v; // защита от формул в свободных ответах
      row[headers.indexOf(String(p[0]))] = v;
    });
    sh.appendRow(row);
    sh.getRange(sh.getLastRow(), 2).setNumberFormat('dd.MM.yyyy HH:mm');
    return { ok: true, number: num };
  } finally {
    lock.releaseLock();
  }
}
