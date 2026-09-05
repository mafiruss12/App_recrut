/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - SYNCHRONISATION AUTOMATIQUE RECRUTEMENT K2L
 * =========================================================================
 * À coller dans : Google Sheets > Menu "Extensions" > "Apps Script"
 * 
 * Ce script permet de :
 * 1. Recevoir en direct les nouveaux clients saisis depuis l'application K2L
 * 2. Contrôler les doublons directement dans la feuille Google Sheet
 * 3. Ajouter automatiquement les nouvelles lignes formatées
 * 4. Déployer en Web App (URL Webhook) à renseigner dans l'application
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Initialiser les en-têtes si la feuille est vide
    if (sheet.getLastRow() === 0) {
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
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
    }

    var requestData = JSON.parse(e.postData.contents);
    var clients = Array.isArray(requestData) ? requestData : [requestData];
    var addedCount = 0;
    var duplicatesCount = 0;

    // Récupérer tous les numéros existants pour éviter les doublons dans Google Sheets
    var lastRow = sheet.getLastRow();
    var existingPhones = {};
    if (lastRow > 1) {
      var phoneValues = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
      for (var i = 0; i < phoneValues.length; i++) {
        var clean = cleanPhone(phoneValues[i][0]);
        if (clean) existingPhones[clean] = true;
      }
    }

    clients.forEach(function(item) {
      var clean = cleanPhone(item.client_phone);
      if (existingPhones[clean]) {
        duplicatesCount++;
      } else {
        sheet.appendRow([
          item.id || Utilities.getUuid(),
          item.created_at || new Date().toISOString(),
          item.client_phone || "",
          item.commercial_name || "",
          item.commercial_phone || "",
          item.cabinet || "",
          item.localite || "",
          item.partenaire || "",
          item.action || "",
          item.status || "synced"
        ]);
        existingPhones[clean] = true;
        addedCount++;
      }
    });

    return ContentService
      .createTextOutput(JSON.stringify({
        result: "success",
        added: addedCount,
        duplicates: duplicatesCount,
        totalInSheet: sheet.getLastRow() - 1
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function cleanPhone(phone) {
  if (!phone) return "";
  return phone.toString().replace(/[^0-9]/g, "");
}
