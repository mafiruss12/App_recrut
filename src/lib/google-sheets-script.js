/**
 * Google Apps Script receiver for K2L Recrutement.
 *
 * Deploy it as a Web App restricted to the intended Google Workspace users when
 * possible. The application sends text/plain JSON to avoid a browser preflight.
 * For production, prefer calling this script from a Supabase Edge Function so
 * the webhook URL is not exposed to field devices.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return jsonResponse({ result: "error", message: "Synchronisation déjà en cours" });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ result: "error", message: "Payload manquant" });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    ensureHeaders(sheet);
    var requestData = JSON.parse(e.postData.contents);
    var clients = Array.isArray(requestData) ? requestData : [requestData];
    var existingPhones = getExistingPhones(sheet);
    var addedCount = 0;
    var duplicatesCount = 0;

    clients.forEach(function(item) {
      var clean = cleanPhone(item && item.client_phone);
      if (!clean || existingPhones[clean]) {
        duplicatesCount++;
        return;
      }

      sheet.appendRow([
        safeCell(item.id || Utilities.getUuid()),
        safeCell(item.created_at || new Date().toISOString()),
        safeCell(item.client_phone || ""),
        safeCell(item.commercial_name || ""),
        safeCell(item.commercial_phone || ""),
        safeCell(item.cabinet || ""),
        safeCell(item.localite || ""),
        safeCell(item.partenaire || ""),
        safeCell(item.action || ""),
        safeCell(item.status || "synced")
      ]);
      existingPhones[clean] = true;
      addedCount++;
    });

    return jsonResponse({
      result: "success",
      added: addedCount,
      duplicates: duplicatesCount,
      totalInSheet: Math.max(0, sheet.getLastRow() - 1)
    });
  } catch (error) {
    return jsonResponse({ result: "error", message: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() !== 0) return;
  sheet.appendRow([
    "ID",
    "Date Saisie",
    "Téléphone Client",
    "Commercial",
    "Téléphone Commercial",
    "Cabinet",
    "Localité",
    "Partenaire",
    "Action",
    "Statut Sync"
  ]);
  sheet.getRange(1, 1, 1, 10)
    .setFontWeight("bold")
    .setBackground("#1e293b")
    .setFontColor("#ffffff");
}

function getExistingPhones(sheet) {
  var lastRow = sheet.getLastRow();
  var existingPhones = {};
  if (lastRow <= 1) return existingPhones;

  var phoneValues = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  for (var i = 0; i < phoneValues.length; i++) {
    var clean = cleanPhone(phoneValues[i][0]);
    if (clean) existingPhones[clean] = true;
  }
  return existingPhones;
}

function cleanPhone(phone) {
  if (!phone) return "";
  var clean = phone.toString().replace(/[^0-9]/g, "");
  if (clean.indexOf("00225") === 0) clean = clean.substring(5);
  else if (clean.indexOf("225") === 0 && clean.length > 10) clean = clean.substring(3);
  return clean;
}

// Prevent spreadsheet formula injection in values supplied by users.
function safeCell(value) {
  var text = value == null ? "" : String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
