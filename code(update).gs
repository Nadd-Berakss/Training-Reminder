// ====================================================
// KONFIGURASI UMUM & API
// ====================================================

// Ganti dengan token Fonnte Anda
const FONNTE_API_HEADERS = {
  'Authorization': 'jU4xKGKGpH5Vx59191bG',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// ====================================================
// FUNGSI UMUM: MENGHAPUS KOLOM HASIL
// ====================================================
function clearResults() {
  var spreadSheet = SpreadsheetApp.openByUrl(SpreadsheetApp.getActiveSpreadsheet().getUrl());
  var sheet = spreadSheet.getSheets()[0];
  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    var resultRange = sheet.getRange(2, 3, lastRow - 1, 3); 
    resultRange.clearContent();
    resultRange.setBackground(null);
  }
}

// ====================================================
// FUNGSI 1: PENGIRIMAN PAGI
// ====================================================
function sendMorningReminder() {

  clearResults();

  var spreadSheet = SpreadsheetApp.openByUrl(SpreadsheetApp.getActiveSpreadsheet().getUrl());
  var sheet = spreadSheet.getSheets()[0];
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) return;

  var rangeValues = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  for (var i in rangeValues) {
    var row = 2 + Number(i);
    var patientName = sheet.getRange(row, 1).getValue();
    var phoneNumber = sheet.getRange(row, 2).getValue();

    var result = sheet.getRange(row, 3);
    var remark = sheet.getRange(row, 4);
    var currentStatus = result.getValue();

    const morningMessageBody = {
      'target': String(phoneNumber),
      'message':
        '*Pesan Pengingat*\r\n' +
        'Halo ' + patientName + '\r\n\r\n' +
        'Jangan lupa minum obat hari ini ya. Obat harus diminum tepat waktu agar pengobatan berhasil.\r\n\r\n' +
        'Tetap semangat, kami semua mendukungmu!'
    };

    var bodyMessage = JSON.stringify(morningMessageBody);

    try {
      if (currentStatus === '' || currentStatus === 'FAILED') {
        UrlFetchApp.fetch('https://api.fonnte.com/send',
          {
            method: 'POST',
            payload: bodyMessage,
            headers: FONNTE_API_HEADERS,
            contentType: "application/json"
          });

        result.setValue('SUCCESSFUL - PAGI').setBackground('#b7e1cd');
        remark.setValue('Morning sent on ' + new Date());
      }
    } catch (err) {
      result.setValue('FAILED').setBackground('#ea4335');
      remark.setValue('Morning failed: ' + String(err).replace('\n', ''));
    }
  }
}

// ====================================================
// FUNGSI 2: PENGIRIMAN MALAM
// ====================================================
function sendNightFollowUp() {

  var spreadSheet = SpreadsheetApp.openByUrl(SpreadsheetApp.getActiveSpreadsheet().getUrl());
  var sheet = spreadSheet.getSheets()[0];
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) return;

  var rangeValues = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  for (var i in rangeValues) {
    var row = 2 + Number(i);
    var patientName = sheet.getRange(row, 1).getValue();
    var phoneNumber = sheet.getRange(row, 2).getValue();

    var result = sheet.getRange(row, 3);
    var remark = sheet.getRange(row, 4);
    var nightSentTime = sheet.getRange(row, 5);
    var currentStatus = result.getValue();

    const nightMessageBody = {
      'target': String(phoneNumber),
      'message':
        'Halo ' + patientName + ',\r\n' +
        'apakah obat sudah diminum hari ini? balas *SUDAH* (tanpa teks lain) sebagai bukti. Terima kasih.'
    };

    var bodyMessage = JSON.stringify(nightMessageBody);

    try {
      if (currentStatus.includes('PAGI') || currentStatus === 'FAILED') {
        UrlFetchApp.fetch('https://api.fonnte.com/send',
          {
            method: 'POST',
            payload: bodyMessage,
            headers: FONNTE_API_HEADERS,
            contentType: "application/json"
          });

        result.setValue('WAITING REPLY').setBackground('#b7e1cd');
        remark.setValue('Night follow-up sent on ' + new Date());
        nightSentTime.setValue(new Date());
      }
    } catch (err) {
      remark.setValue(remark.getValue() + ' | Night failed: ' + String(err).replace('\n', ''));
      nightSentTime.setValue('');
    }
  }
}

// ====================================================
// FUNGSI 3: PENGINGAT TERLAMBAT (Cek setiap 30 menit)
// ====================================================
function sendLateReminder() {
  const REMINDER_INTERVAL_MS = 30 * 60 * 1000;
  const currentTime = new Date().getTime();

  var spreadSheet = SpreadsheetApp.openByUrl(SpreadsheetApp.getActiveSpreadsheet().getUrl());
  var sheet = spreadSheet.getSheets()[0];
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) return;

  var rangeValues = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  for (var i in rangeValues) {
    var row = 2 + Number(i);
    var patientName = rangeValues[i][0];
    var phoneNumber = rangeValues[i][1];
    var currentStatus = rangeValues[i][2];
    var nightSentTimestamp = rangeValues[i][4];

    var resultRange = sheet.getRange(row, 3);
    var remarkRange = sheet.getRange(row, 4);

    if (currentStatus === 'WAITING REPLY' && nightSentTimestamp instanceof Date) {
      if (currentTime - nightSentTimestamp.getTime() > REMINDER_INTERVAL_MS) {

        const lateReminderBody = {
          'target': String(phoneNumber),
          'message':
            'Peringatan! Kami belum menerima konfirmasi dari Anda.\r\n' +
            'Halo ' + patientName + ',\r\n' +
            'Mohon balas *SUDAH* (tanpa teks lain) sebagai bukti. Terima kasih.'
        };
        var bodyMessage = JSON.stringify(lateReminderBody);

        try {
          UrlFetchApp.fetch('https://api.fonnte.com/send',
            {
              method: 'POST',
              payload: bodyMessage,
              headers: FONNTE_API_HEADERS,
              contentType: "application/json"
            });

          resultRange.setValue('REMINDER SENT').setBackground('#fff3cd');
          remarkRange.setValue(remarkRange.getValue() + ' | Late reminder sent after 30 mins on ' + new Date());
        } catch (err) {
          remarkRange.setValue(remarkRange.getValue() + ' | Late reminder failed: ' + String(err).replace('\n', ''));
        }
      }
    }
  }
}

// ====================================================
// FUNGSI 4: ESCALATION REPORT (Pukul 07:00) - DUA PETUGAS
// ====================================================
function sendEscalationReport() {
    var spreadSheet = SpreadsheetApp.openByUrl(SpreadsheetApp.getActiveSpreadsheet().getUrl());
    var sheet = spreadSheet.getSheets()[0];
    
    // --- KONFIGURASI TARGET: 2 KELOMPOK PASIEN ---
    const ESCALATION_CONFIG = [
        {
            // KELOMPOK 1: Petugas di Baris F2, memantau Baris 2-10
            recipientRow: 2, 
            startRow: 2,
            numRows: 9, // Mencakup Baris 2 hingga 10
        },
        {
            // KELOMPOK 2: Petugas di Baris F11, memantau Baris 11-20
            recipientRow: 11, 
            startRow: 11,
            numRows: 10, // Mencakup Baris 11 hingga 20
        }
    ];

    ESCALATION_CONFIG.forEach(config => {
        processEscalationGroup(sheet, config.recipientRow, config.startRow, config.numRows);
    });
}

function processEscalationGroup(sheet, recipientRow, startRow, numRows) {
    
    const NUM_COLS = 6; 
    
    var healthWorkerNumber = String(sheet.getRange(recipientRow, NUM_COLS).getValue()).trim();

    if (!healthWorkerNumber || sheet.getLastRow() < startRow) {
        Logger.log(`Skipping group starting at row ${startRow}. Missing worker number or sheet data.`);
        return; 
    }

    var rangeValues = sheet.getRange(startRow, 1, numRows, NUM_COLS).getValues(); 

    const unrepliedPatients = []; 

    for (var i = 0; i < rangeValues.length; i++) {
        var row = startRow + Number(i); 
        
        if (!rangeValues[i][0]) continue; 

        var patientName = rangeValues[i][0]; 
        var patientNumber = rangeValues[i][1]; 
        var currentStatus = rangeValues[i][2]; 

        if (currentStatus === 'WAITING REPLY' || currentStatus === 'REMINDER SENT') {
            
            unrepliedPatients.push({
                rowNumber: row, 
                name: patientName,
                number: patientNumber,
                status: currentStatus,
            });
        }
    }

    if (unrepliedPatients.length > 0) {
        
        const endRow = startRow + numRows - 1;
        let messageText = `*🚨 Laporan Eskalasi Pasien (Rentang Baris ${startRow} - ${endRow})*\n\n`;
        messageText += `Kepada Petugas (${healthWorkerNumber}), ${unrepliedPatients.length} pasien berikut di bawah pengawasan Anda belum membalas konfirmasi minum obat hingga pukul 07:00:\n\n`;
        
        unrepliedPatients.forEach((p, index) => {
            messageText += `${index + 1}. *BARIS ${p.rowNumber}* (Nama: ${p.name})\n`;
            messageText += `   No. HP: ${p.number}\n`;
            messageText += `   Status Akhir: ${p.status}\n`;
            messageText += `--------------------\n`;
        });
        
        messageText += `Mohon segera cek Google Sheet dan tindak lanjuti pasien ini.`;

        const escalationBody = {
            'target': healthWorkerNumber, 
            'message': messageText
        };
        
        var bodyMessage = JSON.stringify(escalationBody);
        
        try {
            UrlFetchApp.fetch('https://api.fonnte.com/send',
                {
                    method: 'POST',
                    payload: bodyMessage,
                    headers: FONNTE_API_HEADERS,
                    contentType: "application/json"
                });
            
            unrepliedPatients.forEach(p => {
                var resultRange = sheet.getRange(p.rowNumber, 3);
                var remarkRange = sheet.getRange(p.rowNumber, 4);
                
                resultRange.setValue('ESCALATED').setBackground('#f4c7c3'); 
                remarkRange.setValue(remarkRange.getValue() + ` | Escalated to Worker ${healthWorkerNumber} on ${new Date()}.`);
            });

        } catch (err) {
            Logger.log(`Escalation failed for worker ${healthWorkerNumber} for rows ${startRow}-${endRow}: ${err}`);
        }
    }
}


// ====================================================
// FUNGSI WEBHOOK (Balasan Pasien)
// ====================================================
function doPost(e) {
  var json = JSON.parse(e.postData.contents);
  var sender = json.sender;
  var messageType = json.type ? json.type.toUpperCase() : 'TEXT'; 
  var messageText = json.message ? json.message.toUpperCase().trim() : '';
  var isPhotoReply = (messageType === 'IMAGE'); 

  if (sender) {
    processReply(sender, messageText, isPhotoReply);
  }
}

/**
 * Logika inti: Mencari nomor pasien yang cocok dan memperbarui status menjadi REPLIED.
 * HANYA menerima balasan: FOTO atau Teks Eksak 'SUDAH'.
 */
function processReply(sender, message, isPhotoReply) {
  var spreadSheet = SpreadsheetApp.openByUrl(SpreadsheetApp.getActiveSpreadsheet().getUrl());
  var sheet = spreadSheet.getSheets()[0];
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) return;

  var rangeValues = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var cleanSender = sender.split('@')[0];
  const REPLY_KEY = 'SUDAH';

  // --- PERUBAHAN KUNCI DI SINI: Pengecekan Eksak untuk 'SUDAH' ---
  if (isPhotoReply || message === REPLY_KEY) {

    for (var i = 0; i < rangeValues.length; i++) {
      var row = i + 2;
      var phoneNumber = String(rangeValues[i][1]).trim();
      var currentStatus = rangeValues[i][2];

      var cleanSheetNumber = phoneNumber.replace(/^0/, '62');

      if (cleanSheetNumber === cleanSender &&
          (currentStatus === 'WAITING REPLY' || 
           currentStatus === 'REMINDER SENT' ||
           currentStatus === 'ESCALATED')) {

        var resultRange = sheet.getRange(row, 3);
        var remarkRange = sheet.getRange(row, 4);
        
        var logMessage = isPhotoReply 
                         ? 'Replied with Photo/Image.' 
                         : 'Replied with exact text: ' + message;

        resultRange.setValue('REPLIED').setBackground('#93c47d');
        remarkRange.setValue(remarkRange.getValue() + ' | Replied on ' + new Date() + '. ' + logMessage);

        break;
      }
    }
  }
}
