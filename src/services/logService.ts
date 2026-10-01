// Track the timestamp when the web application was loaded/mounted
export const PAGE_SESSION_START_TIME = Date.now();

export interface CheckingLogPayload {
  timestamp?: string; // Format: YYYY-MM-DD HH:mm:ss
  bib: string;
  race: string;
  time: string; // e.g. "45s" or "2m 15s (135s)"
  scriptUrl?: string;
}

/**
 * Format thời gian từ khi vào trang đến lúc click tải ảnh
 */
export function formatTimeSpentOnPage(startTimeMs: number = PAGE_SESSION_START_TIME): {
  seconds: number;
  formatted: string;
} {
  const durationMs = Math.max(0, Date.now() - startTimeMs);
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) {
    return { seconds, formatted: `${seconds}s` };
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return {
    seconds,
    formatted: `${minutes}m ${remainingSeconds}s (${seconds}s)`,
  };
}

/**
 * Tạo timestamp chuẩn YYYY-MM-DD HH:mm:ss theo múi giờ Việt Nam
 */
export function formatCurrentTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * Ghi log vào Google Sheet CHECKING khi người dùng click "Tải ảnh HD"
 * 4 thông tin:
 * - TIMESTAMP: Thời gian click
 * - BIB: Số BIB
 * - RACE: Tên giải
 * - TIME: Thời gian vào trang đến lúc click
 */
export async function logCheckingDownload(payload: CheckingLogPayload): Promise<boolean> {
  const finalTimestamp = payload.timestamp || formatCurrentTimestamp();
  const data = {
    action: 'checking',
    TIMESTAMP: finalTimestamp,
    BIB: payload.bib,
    RACE: payload.race,
    TIME: payload.time,
    timestamp: finalTimestamp,
    bib: payload.bib,
    race: payload.race,
    time: payload.time,
    scriptUrl: payload.scriptUrl,
  };

  console.log('[Log Checking] Recording download event:', data);

  // 1. Thử gửi qua server backend proxy /api/log-download
  try {
    const res = await fetch('/api/log-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      console.log('[Log Checking] Saved successfully via backend proxy');
      return true;
    }
  } catch (err) {
    console.warn('[Log Checking] Backend proxy failed, attempting direct request:', err);
  }

  // 2. Direct client fallback nếu có scriptUrl (hữu ích khi deploy tĩnh trên Vercel/GitHub Pages)
  if (payload.scriptUrl) {
    try {
      // mode: 'no-cors' để vượt qua cơ chế chặn CORS của Google Apps Script
      await fetch(payload.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data),
      });
      console.log('[Log Checking] Dispatched directly via client-side fetch');
      return true;
    } catch {
      // Thử tiếp bằng GET query params
      try {
        const u = new URL(payload.scriptUrl);
        u.searchParams.set('timestamp', finalTimestamp);
        u.searchParams.set('bib', payload.bib);
        u.searchParams.set('race', payload.race);
        u.searchParams.set('time', payload.time);
        await fetch(u.toString(), { mode: 'no-cors' });
        return true;
      } catch (e) {
        console.warn('[Log Checking] Direct client request failed:', e);
      }
    }
  }

  return false;
}

export const GOOGLE_APPS_SCRIPT_CHECKING_CODE = `/**
 * GOOGLE APPS SCRIPT: TỰ ĐỘNG GHI LOG KHI USER CLICK "TẢI ẢNH HD"
 * Ghi 4 thông tin: TIMESTAMP, BIB, RACE, TIME vào tab "CHECKING"
 *
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Mở file Google Sheet của bạn (chứa hoặc sẽ tạo tab CHECKING).
 * 2. Vào menu "Tiện ích mở rộng" (Extensions) > "Apps Script".
 * 3. Dán toàn bộ mã nguồn bên dưới vào file Code.gs và bấm Ctrl+S để lưu.
 * 4. Bấm nút "Triển khai" (Deploy) > "Bản triển khai mới" (New deployment).
 * 5. Chọn loại: "Ứng dụng web" (Web App).
 *    - Mô tả: Log tải ảnh CHECKING
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me).
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone).
 * 6. Bấm "Triển khai" (Deploy) > Cấp quyền (Review Permissions) > Nâng cao (Advanced) > Tiếp tục.
 * 7. Copy link "URL ứng dụng web" nhận được dán vào ô cấu hình hệ thống!
 */

function doPost(e) {
  return handleCheckingLog(e);
}

function doGet(e) {
  return handleCheckingLog(e);
}

function handleCheckingLog(e) {
  var lock = LockService.getScriptLock();
  // Khóa script 10 giây để đảm bảo tính an toàn và thứ tự khi nhiều người tải cùng lúc
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "CHECKING";
    var sheet = ss.getSheetByName(sheetName);

    // Tự động tạo sheet nếu chưa tồn tại
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // Nếu sheet mới tạo hoặc trống, tự động chèn dòng tiêu đề chuẩn 4 cột
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["TIMESTAMP", "BIB", "RACE", "TIME"]);
      var headerRange = sheet.getRange(1, 1, 1, 4);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#0F2847");
      headerRange.setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }

    var timestamp = "";
    var bib = "";
    var race = "";
    var time = "";

    // 1. Phân tích dữ liệu gửi lên qua JSON POST Body
    if (e && e.postData && e.postData.contents) {
      try {
        var body = JSON.parse(e.postData.contents);
        timestamp = body.TIMESTAMP || body.timestamp || "";
        bib = body.BIB || body.bib || "";
        race = body.RACE || body.race || "";
        time = body.TIME || body.time || "";
      } catch (parseErr) {
        if (e.parameter) {
          timestamp = e.parameter.TIMESTAMP || e.parameter.timestamp || "";
          bib = e.parameter.BIB || e.parameter.bib || "";
          race = e.parameter.RACE || e.parameter.race || "";
          time = e.parameter.TIME || e.parameter.time || "";
        }
      }
    } else if (e && e.parameter) {
      // 2. Phân tích dữ liệu qua URL Parameters (GET hoặc Form)
      timestamp = e.parameter.TIMESTAMP || e.parameter.timestamp || "";
      bib = e.parameter.BIB || e.parameter.bib || "";
      race = e.parameter.RACE || e.parameter.race || "";
      time = e.parameter.TIME || e.parameter.time || "";
    }

    // Nếu không có timestamp truyền lên, lấy thời gian server hiện tại
    if (!timestamp) {
      timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    }

    // Thêm ký tự ' để Google Sheet giữ nguyên dạng văn bản (không mất số 0 đầu của BIB)
    var safeBib = bib ? "'" + bib.toString() : "";

    // Ghi dòng mới vào sheet CHECKING
    sheet.appendRow([timestamp, safeBib, race, time]);

    var result = {
      status: "success",
      message: "Đã lưu log tải ảnh vào sheet CHECKING thành công!",
      data: {
        timestamp: timestamp,
        bib: bib,
        race: race,
        time: time
      }
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}
`;
