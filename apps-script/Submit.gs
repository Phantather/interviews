/**
 * Бесплатный вариант записи ответов — без Google Cloud и сервисного аккаунта.
 *
 * Куда вставлять: откройте нужную Google Таблицу → Расширения → Apps Script,
 * создайте файл (например Submit.gs) и скопируйте сюда этот код.
 * Затем: Развернуть → Новое развёртывание → Веб-приложение,
 *   «Запуск от имени»  — От моего имени,
 *   «У кого есть доступ» — У всех.
 * Скопируйте полученный адрес вида https://script.google.com/macros/s/.../exec
 * и положите его в переменную окружения APPS_SCRIPT_URL на Vercel.
 *
 * Формат строки таблицы полностью совпадает с вариантом на сервисном аккаунте.
 */

var SHEET_NAME = 'Ответы';

/** Общий секрет: то же значение задайте в переменной APPS_SCRIPT_SECRET на Vercel. */
var SECRET = 'TGdW19xJlZniT3s$Uz91FocAbGX2zTH2hRTmjUT5CjyWEBDQqS!0u!l$by42hS!Tm1axLyrdCHfqm&upb!Qt4jS0ctdOXQ@ojL5d0hC&&WBm0qjg@jtDXjR!474gn1';

var BASE_HEADERS = ['№ анкеты', 'Дата и время', 'Язык анкеты', 'Время заполнения, мин'];
var MAX_VALUE_LENGTH = 5000;

/** Ссылка, открытая в браузере, отвечает «ok» — так удобно проверить развёртывание. */
function doGet() {
  return ContentService.createTextOutput('ok');
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json({ ok: false, error: 'bad_request' });

    var body = JSON.parse(e.postData.contents);
    if (SECRET && body.secret !== SECRET) return json({ ok: false, error: 'forbidden' });

    var pairs = body.answers;
    if (!Array.isArray(pairs) || !pairs.length) return json({ ok: false, error: 'bad_request' });

    var lang = body.lang === 'ky' ? 'ky' : 'ru';
    var duration = Number(body.durationMin);
    var durationMin = isFinite(duration) ? String(Math.max(0, Math.min(600, Math.round(duration)))) : '';

    return json({ ok: true, number: writeRow(pairs, lang, durationMin) });
  } catch (err) {
    // в ответ не уходят подробности — они остаются в журнале выполнений
    console.error(err);
    return json({ ok: false, error: 'server_error' });
  }
}

function writeRow(pairs, lang, durationMin) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Шапка: создаём при первой анкете, новые столбцы дописываем в конец
    var headers = sh.getLastRow() > 0
      ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String).filter(String)
      : BASE_HEADERS.slice();
    var changed = sh.getLastRow() === 0;
    pairs.forEach(function (pair) {
      if (headers.indexOf(String(pair[0])) === -1) {
        headers.push(String(pair[0]));
        changed = true;
      }
    });
    if (changed) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setWrap(true);
      sh.setFrozenRows(1);
    }

    // Строка раскладывается по названиям столбцов, а не по позиции
    var row = new Array(headers.length).fill('');
    function put(column, value) {
      var index = headers.indexOf(column);
      if (index >= 0) row[index] = value;
    }
    put('Дата и время', Utilities.formatDate(new Date(), 'Asia/Bishkek', 'dd.MM.yyyy HH:mm'));
    put('Язык анкеты', lang);
    put('Время заполнения, мин', durationMin);
    pairs.forEach(function (pair) {
      put(String(pair[0]), sanitize(pair[1]));
    });

    sh.appendRow(row);

    // Номер анкеты — по фактическому номеру строки, поэтому пропусков нет
    var rowNumber = sh.getLastRow();
    var number = 'Н-' + ('0000' + (rowNumber - 1)).slice(-4);
    sh.getRange(rowNumber, 1).setValue(number);
    return number;
  } finally {
    lock.releaseLock();
  }
}

/** Защита от формул: значения, начинающиеся с = + - @, экранируются апострофом. */
function sanitize(value) {
  var text = value == null ? '' : String(value).slice(0, MAX_VALUE_LENGTH);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
