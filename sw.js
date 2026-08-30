/*
  ડેટા એન્ટ્રી રજિસ્ટર — Apps Script (Code.gs)
  --------------------------------------------
  આ કોડ Google Sheet ના "Extensions → Apps Script" માં પેસ્ટ કરવાનો છે.

  ⚠ મહત્વનું: જો તમારી પાસે પહેલેથી entries સેવ કરવાનો કોડ કામ કરે છે,
  તો પહેલા એ કોડની એક નકલ ક્યાંક રાખો. આ કોડ entries ને "Entries" નામની
  શીટમાં, અને યુઝર આઇડી-પાસવર્ડને "Users" નામની શીટમાં સેવ કરે છે.
  જો તમારી હાલની શીટ/ટેબનું નામ અલગ હોય, તો getSheet_() માં નામ બદલો,
  અથવા તમારો જૂનો કોડ મને મોકલો જેથી હું એમાં ફક્ત યુઝર-ભાગ ઉમેરી આપું.

  નવું: "Users" શીટમાં હવે 3જી કૉલમ Status (pending/approved) છે.
  - એડમિન પોતે યુઝર ઉમેરે ('addUser') → સીધું 'approved'.
  - યુઝર જાતે રજિસ્ટર કરે ('registerUser') → 'pending', એડમિન મંજૂર કરે
    ('approveUser') પછી જ લોગિન થઈ શકે.
  - જૂની હરોળો (status કૉલમ ઉમેરાયા પહેલાંની) આપોઆપ 'approved' ગણાશે.

  નવું: "Entries" શીટમાં હવે 2 વધારાની કૉલમ છે — Id અને CDR. આનાથી
  કોઈપણ ડિવાઇસ/યુઝર દ્વારા ઉમેરેલી બધી એન્ટ્રી, એડમિન પેનલમાં "બધી
  એન્ટ્રીઓ" માં દેખાશે (પહેલાં ફક્ત તે જ ડિવાઇસ પરની એન્ટ્રી દેખાતી હતી).
  જૂની હરોળો (Id/CDR કૉલમ ઉમેરાયા પહેલાંની) પણ આપોઆપ બરાબર વંચાશે.

  ડિપ્લોય કરવાની રીત (એક જ વાર):
  1. Google Sheet ખોલો → Extensions → Apps Script.
  2. જૂનો કોડ કાઢી, આ આખો કોડ પેસ્ટ કરો → સેવ કરો (💾).
  3. Deploy → Manage deployments → ✎ (Edit) → Version: "New version" → Deploy.
     (નવું deployment ન બનાવો — એ જ જૂનું Edit કરો, જેથી /exec લિંક બદલાય નહીં.)
*/

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'listUsers') {
    return jsonOutput_({ status: 'ok', users: getUsers_() });
  }
  if (action === 'listEntries') {
    return jsonOutput_({ status: 'ok', entries: getEntries_() });
  }
  return jsonOutput_({ status: 'ok', message: 'જોડાણ બરાબર છે' });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'addUser') return handleAddUser_(data, 'approved');
    if (data.action === 'registerUser') return handleAddUser_(data, 'pending');
    if (data.action === 'approveUser') return handleApproveUser_(data);
    if (data.action === 'deleteUser') return handleDeleteUser_(data);
    if (data.action === 'changePassword') return handleChangePassword_(data);
    if (data.action === 'resetPassword') return handleResetPassword_(data);
    if (data.action === 'setCdr') return handleSetCdr_(data);

    // action ન હોય ત્યારે — ડિફોલ્ટ રીતે એન્ટ્રી સેવ કરવાનો કોડ ચાલશે
    return handleEntries_(data);
  } catch (err) {
    return jsonOutput_({ status: 'error', message: err.message });
  }
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function getUsers_() {
  var sheet = getSheet_('Users');
  var lastRow = sheet.getLastRow();
  if (lastRow === 0) return [];
  var values = sheet.getRange(1, 1, lastRow, 3).getValues();
  return values
    .filter(function (r) { return r[0]; })
    // જૂની (status ઉમેરાયા પહેલાંની) હરોળોમાં કૉલમ C ખાલી/તારીખ હોય — એ બધાને 'approved' જ ગણો,
    // ફક્ત સ્પષ્ટ રીતે 'pending' લખેલું હોય એને જ પેન્ડિંગ ગણો.
    .map(function (r) { return { username: String(r[0]), password: String(r[1]), status: (r[2] === 'pending' ? 'pending' : 'approved') }; });
}

function handleAddUser_(data, status) {
  var username = (data.username || '').toString().trim();
  var password = (data.password || '').toString().trim();
  if (!username || !password) {
    return jsonOutput_({ status: 'error', message: 'યુઝર આઇડી અને પાસવર્ડ જરૂરી છે.' });
  }
  var users = getUsers_();
  if (users.some(function (u) { return u.username === username; })) {
    return jsonOutput_({ status: 'error', message: 'આ યુઝર આઇડી પહેલેથી છે.' });
  }
  getSheet_('Users').appendRow([username, password, status, new Date()]);
  return jsonOutput_({ status: 'ok' });
}

function handleApproveUser_(data) {
  var username = (data.username || '').toString().trim();
  var sheet = getSheet_('Users');
  var lastRow = sheet.getLastRow();
  for (var i = 1; i <= lastRow; i++) {
    if (String(sheet.getRange(i, 1).getValue()) === username) {
      sheet.getRange(i, 3).setValue('approved');
      break;
    }
  }
  return jsonOutput_({ status: 'ok' });
}

function handleDeleteUser_(data) {
  var username = (data.username || '').toString().trim();
  var sheet = getSheet_('Users');
  var lastRow = sheet.getLastRow();
  for (var i = lastRow; i >= 1; i--) {
    if (String(sheet.getRange(i, 1).getValue()) === username) sheet.deleteRow(i);
  }
  return jsonOutput_({ status: 'ok' });
}

function handleChangePassword_(data) {
  var username = (data.username || '').toString().trim();
  var currentPassword = (data.currentPassword || '').toString();
  var newPassword = (data.newPassword || '').toString().trim();
  if (!newPassword) return jsonOutput_({ status: 'error', message: 'નવો પાસવર્ડ લખો.' });
  var sheet = getSheet_('Users');
  var lastRow = sheet.getLastRow();
  for (var i = 1; i <= lastRow; i++) {
    if (String(sheet.getRange(i, 1).getValue()) === username) {
      var storedPassword = String(sheet.getRange(i, 2).getValue());
      if (storedPassword !== currentPassword) {
        return jsonOutput_({ status: 'error', message: 'વર્તમાન પાસવર્ડ ખોટો છે.' });
      }
      sheet.getRange(i, 2).setValue(newPassword);
      return jsonOutput_({ status: 'ok' });
    }
  }
  return jsonOutput_({ status: 'error', message: 'યુઝર મળ્યો નહીં.' });
}

function handleResetPassword_(data) {
  var username = (data.username || '').toString().trim();
  var newPassword = (data.newPassword || '').toString().trim();
  if (!newPassword) return jsonOutput_({ status: 'error', message: 'નવો પાસવર્ડ લખો.' });
  var sheet = getSheet_('Users');
  var lastRow = sheet.getLastRow();
  for (var i = 1; i <= lastRow; i++) {
    if (String(sheet.getRange(i, 1).getValue()) === username) {
      sheet.getRange(i, 2).setValue(newPassword);
      return jsonOutput_({ status: 'ok' });
    }
  }
  return jsonOutput_({ status: 'error', message: 'યુઝર મળ્યો નહીં.' });
}

function handleEntries_(data) {
  var rows = data.rows || [];
  var sheet = getSheet_('Entries');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Officer Name', 'Mobile', 'Operator', 'AccusedName', 'CrimeNumber', 'DateFrom', 'DateTo', 'Username', 'Timestamp', 'Id', 'CDR']);
  }
  rows.forEach(function (r) {
    var id = r.id || Utilities.getUuid();
    sheet.appendRow([r.name, r.mobile, r.operator, r.accusedName, r.crimeNumber, r.dateFrom, r.dateTo, r.username, new Date(), id, false]);
  });

  if (data.notifyEmail) {
    try {
      MailApp.sendEmail(data.notifyEmail, 'નવી ડેટા એન્ટ્રી', rows.length + ' નવી એન્ટ્રી ઉમેરાઈ.');
    } catch (mailErr) {
      // ઈમેલ ન મોકલાય તો પણ ડેટા સેવ થયેલો જ રહે
    }
  }
  return jsonOutput_({ status: 'ok' });
}

function getEntries_() {
  var sheet = getSheet_('Entries');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  // હેડર (હરોળ 1) સિવાયનો બધો ડેટા — કૉલમ A થી K (11 કૉલમ)
  var values = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  return values
    .filter(function (r) { return r[0]; })
    .map(function (r, i) {
      return {
        name: String(r[0] || ''),
        mobile: String(r[1] || ''),
        operator: String(r[2] || ''),
        accusedName: String(r[3] || ''),
        crimeNumber: String(r[4] || ''),
        dateFrom: r[5] instanceof Date ? Utilities.formatDate(r[5], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(r[5] || ''),
        dateTo: r[6] instanceof Date ? Utilities.formatDate(r[6], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(r[6] || ''),
        username: String(r[7] || ''),
        ts: r[8] instanceof Date ? r[8].toISOString() : String(r[8] || ''),
        // જૂની હરોળોમાં Id ખાલી હોય તો હરોળ-નંબર પરથી કામચલાઉ Id બનાવો
        id: r[9] ? String(r[9]) : ('row_' + (i + 2)),
        cdr: (r[10] === true || r[10] === 'TRUE' || r[10] === 'true')
      };
    })
    .reverse(); // નવી એન્ટ્રી પહેલા દેખાય
}

function handleSetCdr_(data) {
  var id = (data.id || '').toString().trim();
  var cdr = !!data.cdr;
  var sheet = getSheet_('Entries');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return jsonOutput_({ status: 'error', message: 'એન્ટ્રી મળી નહીં.' });
  var ids = sheet.getRange(2, 10, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    var rowId = ids[i][0] ? String(ids[i][0]) : ('row_' + (i + 2));
    if (rowId === id) {
      sheet.getRange(i + 2, 11).setValue(cdr);
      return jsonOutput_({ status: 'ok' });
    }
  }
  return jsonOutput_({ status: 'error', message: 'એન્ટ્રી મળી નહીં.' });
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
