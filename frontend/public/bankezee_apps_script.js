// ============================================================
// BankEzee CRM → Google Sheets Export (Apps Script)
// ============================================================
// 
// HOW TO USE:
// 1. Open a new Google Sheet
// 2. Go to Extensions → Apps Script
// 3. Delete the default code and paste this ENTIRE script
// 4. Click ▶ Run → select "exportAll" → Run
// 5. First time: approve permissions when prompted
// 6. Wait 1-2 minutes — all 8 sheets will be populated
//
// ============================================================

// ===== CONFIGURATION — UPDATE THESE =====
var BASE_URL = "https://crm.bankezee.com";  // Your production URL
var ADMIN_EMAIL = "admin@bankezee.com";
var ADMIN_PASSWORD = "admin123";
// =========================================

var COLLECTIONS = [
  "leads",
  "activity_log",    // One row per activity entry (dates for stats)
  "eligibilities",   // One row per bank eligibility entry
  "users",
  "agents",
  "bank_policies",
  "commissions",
  "files"
];

function getToken() {
  var resp = UrlFetchApp.fetch(BASE_URL + "/api/auth/login", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    muteHttpExceptions: true
  });
  var data = JSON.parse(resp.getContentText());
  if (!data.token) throw new Error("Login failed: " + resp.getContentText());
  return data.token;
}

function fetchCollection(token, collection) {
  var resp = UrlFetchApp.fetch(BASE_URL + "/api/export/sheets-data/" + collection, {
    method: "get",
    headers: { "Authorization": "Bearer " + token },
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) {
    Logger.log("  ⚠ HTTP " + resp.getResponseCode() + " for " + collection + " — skipping");
    return { error: "HTTP " + resp.getResponseCode(), headers: [], rows: [], count: 0 };
  }
  try {
    return JSON.parse(resp.getContentText());
  } catch (e) {
    Logger.log("  ⚠ JSON parse error for " + collection + " — skipping");
    return { error: e.message, headers: [], rows: [], count: 0 };
  }
}

function exportAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var token = getToken();
  Logger.log("Logged in successfully");

  var summary = [];

  for (var i = 0; i < COLLECTIONS.length; i++) {
    var name = COLLECTIONS[i];
    Logger.log("Exporting: " + name + "...");

    var data = fetchCollection(token, name);
    if (data.error) {
      Logger.log("  ⚠ ERROR on " + name + ": " + data.error);
      summary.push(name + ": ERROR — " + data.error);
      continue;
    }

    // Create or get sheet
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      sheet.clear();
    } else {
      sheet = ss.insertSheet(name);
    }

    // Write headers (row 1, bold)
    if (data.headers && data.headers.length > 0) {
      var headerRange = sheet.getRange(1, 1, 1, data.headers.length);
      headerRange.setValues([data.headers]);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#f3f4f6");
    }

    // Write data rows in chunks (Apps Script has limits)
    if (data.rows && data.rows.length > 0) {
      var chunkSize = 500;
      for (var start = 0; start < data.rows.length; start += chunkSize) {
        var chunk = data.rows.slice(start, start + chunkSize);
        var range = sheet.getRange(start + 2, 1, chunk.length, data.headers.length);
        range.setValues(chunk);
      }
    }

    // Freeze header row
    sheet.setFrozenRows(1);

    // Auto-resize first 10 columns
    var maxCols = Math.min(data.headers ? data.headers.length : 0, 10);
    for (var c = 1; c <= maxCols; c++) {
      sheet.autoResizeColumn(c);
    }

    Logger.log("  → " + data.count + " rows exported to sheet: " + name);
    summary.push(name + ": " + data.count + " rows");
  }

  // Delete the default Sheet1 if it exists and is empty
  var defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  SpreadsheetApp.getUi().alert(
    "Export complete!\n\n" + summary.join("\n")
  );
}

// Add a custom menu to the spreadsheet
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("BankEzee Export")
    .addItem("Export All Data", "exportAll")
    .addToUi();
}
