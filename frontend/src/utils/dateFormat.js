/**
 * Chuyển đổi chuỗi ngày (YYYY-MM-DD hoặc DD/MM/YYYY) sang định dạng hiển thị chuẩn Việt Nam: dd/mm/yyyy
 */
export function formatDateVN(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    return s;
  }
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  return s;
}

/**
 * Chuyển đổi chuỗi người dùng nhập (dd/mm/yyyy hoặc yyyy-mm-dd) về chuẩn lưu trữ YYYY-MM-DD
 */
export function toISODate(inputStr) {
  if (!inputStr) return '';
  const s = String(inputStr).trim();
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return s;
}

/**
 * Chuẩn hóa hạng xe (B1, B2, C1, C)
 */
export function normalizeVehicleClass(rawClass) {
  const s = String(rawClass || '').trim().toUpperCase();
  if (!s) return '';
  if (s === 'B.01' || s === 'B01' || s === 'B1') return 'B1';
  if (s === 'B.02' || s === 'B02' || s === 'B2' || s === 'BK') return 'B2';
  if (s === 'C.01' || s === 'C01' || s === 'C1') return 'C1';
  if (s === 'C' || s === 'CK') return 'C';
  return s;
}

/**
 * Nhận diện Hạng của Khóa khai giảng dựa vào tên khóa:
 * - B.01K260... -> B1
 * - BK260...    -> B2
 * - C1K260...   -> C1
 */
export function detectCourseClass(courseName) {
  if (!courseName) return '';
  const s = String(courseName).trim().toUpperCase().replace(/\s+/g, '');
  if (
    s.startsWith('B.01') ||
    s.startsWith('B01') ||
    s.startsWith('B1') ||
    s.includes('B.01K') ||
    s.includes('B1K')
  ) {
    return 'B1';
  }
  if (
    s.startsWith('C1') ||
    s.startsWith('C.01') ||
    s.startsWith('C01') ||
    s.includes('C1K')
  ) {
    return 'C1';
  }
  if (
    s.startsWith('BK') ||
    s.startsWith('B2') ||
    s.startsWith('B.02') ||
    s.includes('B2K') ||
    s.includes('BK2')
  ) {
    return 'B2';
  }
  if (s.startsWith('CK')) {
    return 'C';
  }
  return '';
}

/**
 * Mô tả loại khóa mà hạng xe đó được phép lên
 */
export function getCoursePatternLabel(vehicleClass) {
  const norm = normalizeVehicleClass(vehicleClass);
  if (norm === 'B1') return 'Khóa B.01K... (Hạng B1)';
  if (norm === 'B2') return 'Khóa BK... (Hạng B2)';
  if (norm === 'C1') return 'Khóa C1K... (Hạng C1)';
  if (norm === 'C') return 'Khóa CK... (Hạng C)';
  return `Khóa Hạng ${norm || 'B2'}`;
}
