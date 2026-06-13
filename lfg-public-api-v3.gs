/**
 * LFG PUBLIC CONFIG API — v3
 * ==========================
 * Standalone Apps Script project. Deploy as Web App:
 *   Execute as: Me (chad@getgrush.com)
 *   Who has access: Anyone
 *
 * GET  ?            -> site configuration (password as SHA-256 hash, never plaintext)
 * GET  ?view=beds   -> all rows from Beds tab (header-keyed objects)
 * GET  ?view=photos -> newest 60 photo records
 * GET  ?view=log    -> newest 40 field log entries
 * GET  ?view=reports-> open damage reports, oldest first
 *
 * POST {message,...}                                    -> feedback (unchanged)
 * POST {action:'addPhoto', password, bedId, caption,
 *       url, thumb}                                     -> append to Photos tab
 * POST {action:'addLog', password, location, note}      -> append to Log tab
 * POST {action:'addReport', bedId, type, description}    -> guest damage report
 * POST {action:'resolveReport', password, id, note}      -> mark report resolved
 *
 * Staff writes verify the password against the protected Almanac Backend's
 * checkPassword action — single source of truth, that project stays untouched.
 *
 * Pattern: standalone project + openById (LFG standard). Never sheet-bound.
 */

var SS_ID = '14WCPPon3px4bWwhnzGjGXo5x5n6ngn0eFq9tnqwtZa0';
var ALMANAC_URL = 'https://script.google.com/macros/s/AKfycbxq2WZZzuZnMgjSrCPhWsgeA3OYg2Z9x9nrHCZ-p5m87QJU50Vh4DScwl_85X_I5irh/exec';

/* ───────────────────────── GET ───────────────────────── */

function doGet(e) {
  try {
    var view = (e && e.parameter && e.parameter.view) || 'config';
    if (view === 'beds')   return jsonOut({ ok: true, beds:   readTab('Beds', 0) });
    if (view === 'photos') return jsonOut({ ok: true, photos: readTab('Photos', 60) });
    if (view === 'log')    return jsonOut({ ok: true, log:    readTab('Log', 40) });
    if (view === 'reports') return jsonOut({ ok: true, reports: openReports() });
    return serveConfig();
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function serveConfig() {
  var sheet = SpreadsheetApp.openById(SS_ID).getSheetByName('Config');
  if (!sheet) return jsonOut({ ok: false, error: 'Config sheet missing. Run setupSheets() in LFG Site Control.' });

  var rows = sheet.getDataRange().getValues(); // key | value | type | options | label | section
  var config = {};
  for (var i = 1; i < rows.length; i++) {
    var key = String(rows[i][0]).trim();
    if (!key) continue;
    var raw = rows[i][1];
    var type = String(rows[i][2]).trim();
    if (key === 'gate_password') {
      config['gate_password_hash'] = sha256Hex(String(raw));
      continue; // plaintext never leaves the sheet
    }
    config[key] = coerce(raw, type);
  }
  return jsonOut({ ok: true, config: config, served: new Date().toISOString() });
}

/**
 * Reads a tab into header-keyed objects, newest rows first.
 * limit 0 = all rows. Adapts to whatever headers the tab has.
 */
function readTab(name, limit) {
  var sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(name);
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  var headers = rows[0].map(function (h) { return String(h).trim(); });
  var out = [];
  for (var i = rows.length - 1; i >= 1; i--) {     // newest (bottom) first
    var obj = {}, empty = true;
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      var v = rows[i][c];
      if (v instanceof Date) v = v.toISOString();
      obj[headers[c]] = v;
      if (v !== '' && v != null) empty = false;
    }
    if (empty) continue;
    out.push(obj);
    if (limit && out.length >= limit) break;
  }
  return out;
}

/* ───────────────────────── POST ───────────────────────── */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');

    if (body.action === 'addPhoto') return addPhoto(body);
    if (body.action === 'addLog')   return addLog(body);
    if (body.action === 'addReport')     return addReport(body);
    if (body.action === 'resolveReport') return resolveReport(body);
    return addFeedback(body); // default: original feedback behavior, unchanged
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function addPhoto(body) {
  if (!verifyStaff(body.password)) return jsonOut({ ok: false, error: 'auth' });
  var url = String(body.url || '');
  if (url.indexOf('https://res.cloudinary.com/') !== 0) return jsonOut({ ok: false, error: 'Bad photo URL' });

  var sheet = getOrCreateTab('Photos',
    ['PhotoID', 'BedID', 'Caption', 'CloudinaryURL', 'ThumbnailURL', 'UploadedAt', 'UploadedBy']);
  sheet.appendRow([
    'P' + Date.now(),
    clip(body.bedId, 20),
    clip(body.caption, 200),
    url.slice(0, 400),
    String(body.thumb || '').slice(0, 400),
    new Date(),
    'staff'
  ]);
  return jsonOut({ ok: true });
}

function addLog(body) {
  if (!verifyStaff(body.password)) return jsonOut({ ok: false, error: 'auth' });
  var note = String(body.note || '').trim();
  if (!note) return jsonOut({ ok: false, error: 'Empty note' });

  var sheet = getOrCreateTab('Log', ['LoggedAt', 'Location', 'Note', 'LoggedBy']);
  sheet.appendRow([new Date(), clip(body.location, 40), clip(note, 1000), 'staff']);
  return jsonOut({ ok: true });
}

var REPORT_HEADERS = ['ReportID', 'BedID', 'Type', 'Description', 'ReportedAt', 'Status', 'ResolveNote', 'ResolvedAt'];

function openReports() {
  var rows = readTab('Reports', 0);
  return rows.filter(function (r) { return String(r.Status).toLowerCase() !== 'resolved'; }).reverse(); // oldest first
}

function addReport(body) {
  if (body.website) return jsonOut({ ok: true }); // honeypot
  var desc = String(body.description || '').trim();
  if (!desc) return jsonOut({ ok: false, error: 'Empty description' });
  var sheet = getOrCreateTab('Reports', REPORT_HEADERS);
  sheet.appendRow(['R' + Date.now(), clip(body.bedId, 20), clip(body.type, 60), clip(desc, 1000), new Date(), 'open', '', '']);
  return jsonOut({ ok: true });
}

function resolveReport(body) {
  if (!verifyStaff(body.password)) return jsonOut({ ok: false, error: 'auth' });
  var id = String(body.id || '');
  var sheet = SpreadsheetApp.openById(SS_ID).getSheetByName('Reports');
  if (!sheet) return jsonOut({ ok: false, error: 'No Reports tab' });
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(String);
  var idCol = headers.indexOf('ReportID'), stCol = headers.indexOf('Status'),
      noteCol = headers.indexOf('ResolveNote'), atCol = headers.indexOf('ResolvedAt');
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === id) {
      sheet.getRange(i + 1, stCol + 1).setValue('resolved');
      sheet.getRange(i + 1, noteCol + 1).setValue(clip(body.note, 500));
      sheet.getRange(i + 1, atCol + 1).setValue(new Date());
      return jsonOut({ ok: true });
    }
  }
  return jsonOut({ ok: false, error: 'Report not found' });
}

function addFeedback(body) {
  // Honeypot: real form leaves "website" empty; bots fill it. Pretend success either way.
  if (body.website) return jsonOut({ ok: true });

  var msg = String(body.message || '').trim();
  if (!msg) return jsonOut({ ok: false, error: 'Empty message' });
  if (msg.length > 2000) msg = msg.slice(0, 2000);

  var sheet = SpreadsheetApp.openById(SS_ID).getSheetByName('Feedback');
  if (!sheet) return jsonOut({ ok: false, error: 'Feedback sheet missing. Run setupSheets() in LFG Site Control.' });

  sheet.appendRow([
    new Date(), msg,
    clip(body.theme), clip(body.mood), clip(body.sun_mode),
    clip(body.viewport), clip(body.page), clip(body.ua, 300),
    false // read
  ]);
  return jsonOut({ ok: true });
}

/* ─────────────────────── helpers ───────────────────────── */

/** Verifies the staff password against the protected Almanac Backend (single source of truth). */
function verifyStaff(pw) {
  if (!pw) return false;
  try {
    var res = UrlFetchApp.fetch(ALMANAC_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ action: 'checkPassword', bedId: 'MASTER', password: String(pw) }),
      muteHttpExceptions: true,
      followRedirects: true
    });
    var data = JSON.parse(res.getContentText() || '{}');
    return data.ok === true;
  } catch (err) {
    return false;
  }
}

function getOrCreateTab(name, headers) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function coerce(raw, type) {
  if (type === 'bool') return raw === true || String(raw).toUpperCase() === 'TRUE';
  if (type === 'number') return Number(raw) || 0;
  return String(raw);
}

function clip(v, max) {
  return String(v == null ? '' : v).slice(0, max || 80);
}

function sha256Hex(s) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return digest.map(function (b) {
    var h = (b < 0 ? b + 256 : b).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
