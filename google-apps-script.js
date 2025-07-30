// Google Apps Script สำหรับรับไฟล์จาก JARVIS System
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'addFile') {
      return addFileToSheet(data);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: 'Unknown action'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function addFileToSheet(data) {
  try {
    // เปิด Google Sheets
    const sheet = SpreadsheetApp.openById(data.sheetId).getSheetByName(data.sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet '${data.sheetName}' not found`);
    }
    
    // เพิ่มข้อมูลใหม่ลงแถวถัดไป
    const newRow = [
      data.fileName,
      data.date,
      data.type,
      data.dutyName,
      data.count,
      data.fileData // base64 data
    ];
    
    sheet.appendRow(newRow);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true, 
        message: `เพิ่มไฟล์ ${data.fileName} สำเร็จ`
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false, 
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันทดสอบ
function testAddFile() {
  const testData = {
    action: 'addFile',
    fileName: 'test.xlsx',
    date: '29/1/2025',
    type: 'ceremony-duty',
    dutyName: 'ทดสอบระบบ',
    count: '5',
    fileData: 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,UEsDBBQ...',
    sheetId: '1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw',
    sheetName: 'file'
  };
  
  const result = addFileToSheet(testData);
  Logger.log(result.getContent());
}
