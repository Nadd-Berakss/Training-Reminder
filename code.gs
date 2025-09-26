// ----------------------------------------------------
// FUNGSI UMUM: MENGHAPUS KOLOM HASIL (Hanya Pagi yang Panggil)
// ----------------------------------------------------
function clearResults() {
  var spreadSheet = SpreadsheetApp.openByUrl(SpreadsheetApp.getActiveSpreadsheet().getUrl());
  var sheet = spreadSheet.getSheets()[0];
  var lastRow = sheet.getLastRow();
  
  if (lastRow > 1) {
    // Menghapus isi Kolom C (Result) dan Kolom D (Remark), dimulai dari Baris 2
    var resultRange = sheet.getRange(2, 3, lastRow - 1, 2); 
    resultRange.clearContent();
    resultRange.setBackground(null);
  }
}

// ----------------------------------------------------
// FUNGSI 1: PENGIRIMAN PAGI (Pukul 09:00)
// ----------------------------------------------------
function sendMorningReminder() {
    
  // Bersihkan hasil pengiriman kemarin. Hanya perlu dipanggil sekali sehari.
  clearResults();

  // Masukkan token api Fonnte anda ke bagian Authorization dan jangan hapus tanda petiknya
  const headers = {
    'Authorization': 'Masukkan Token Fonnte Anda',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  var spreadSheet = SpreadsheetApp.openByUrl(SpreadsheetApp.getActiveSpreadsheet().getUrl());
  var sheet = spreadSheet.getSheets()[0];
  var rangeValues = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues(); 

    for (var i in rangeValues) {
    var patientName = sheet.getRange(2 + Number(i), 1).getValue()
    var phoneNumber = sheet.getRange(2 + Number(i), 2).getValue()
    
    var result = sheet.getRange(2 + Number(i), 3);
    var remark = sheet.getRange(2 + Number(i), 4);
    var currentStatus = result.getValue();

    // 1. PESAN PENGINGAT (PAGI)
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
      // Kirim jika kolom F kosong (dibersihkan oleh clearResults) atau FAILED
      if (currentStatus === '' || currentStatus === 'FAILED') {
        
        UrlFetchApp.fetch('https://api.fonnte.com/send',
          {
            method: 'POST',
            payload: bodyMessage,
            headers: headers,
            contentType: "application/json"
          });
          
        // Catat status pesan pagi. Tambahkan "PAGI" agar bisa dicek di malam hari.
        result.setValue('SUCCESSFUL - PAGI').setBackground('#b7e1cd');
        remark.setValue('Morning sent on ' + new Date());
      }
    } catch (err) {
      result.setValue('FAILED').setBackground('#ea4335');
      remark.setValue('Morning failed: ' + String(err).replace('\n', ''));
    }
  }
}

// ----------------------------------------------------
// FUNGSI 2: PENGIRIMAN MALAM (Pukul 21:00)
// ----------------------------------------------------
function sendNightFollowUp() {

  const headers = {
    'Authorization': 'Masukkan Token Fonnte Anda',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  var spreadSheet = SpreadsheetApp.openByUrl(SpreadsheetApp.getActiveSpreadsheet().getUrl());
  var sheet = spreadSheet.getSheets()[0];
  var rangeValues = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues(); 

    for (var i in rangeValues) {
    var patientName = sheet.getRange(2 + Number(i), 1).getValue()
    var phoneNumber = sheet.getRange(2 + Number(i), 2).getValue()
    
    var result = sheet.getRange(2 + Number(i), 3);
    var remark = sheet.getRange(2 + Number(i), 4);
    
    // 2. PESAN FOLLOW UP (MALAM)
    const nightMessageBody = {
      'target': String(phoneNumber),
      'message':
        'Halo ' + patientName + ',\r\n' +
        'apakah obat sudah diminum hari ini? balas \'SUDAH\' jika Anda sudah minum obat. Terima kasih.'
    };
    
    var bodyMessage = JSON.stringify(nightMessageBody);
    var currentStatus = result.getValue();

    try {
      // LOGIKA MALAM: Kirim HANYA jika pesan pagi berhasil (ada tulisan 'PAGI') atau jika statusnya FAILED
      if (currentStatus.includes('PAGI') || currentStatus === 'FAILED') {
        
        UrlFetchApp.fetch('https://api.fonnte.com/send',
          {
            method: 'POST',
            payload: bodyMessage,
            headers: headers,
            contentType: "application/json"
          });
          
        // Perbarui status menjadi MALAM
        result.setValue('SUCCESSFUL - MALAM').setBackground('#b7e1cd');
        remark.setValue('Night sent on ' + new Date());
      }
    } catch (err) {
      // Hanya update remark, jangan timpa FAILED dari pagi
      remark.setValue(remark.getValue() + ' | Night failed: ' + String(err).replace('\n', ''));
    }
  }
}

// FUNGSI WEBHOOK (doPost dan sendReply) yang menangani balasan "SUDAH" tetap tidak berubah.
// ... (tambahkan di sini jika Anda ingin menyertakannya lagi, tetapi tidak diperlukan untuk logika jadwal)
