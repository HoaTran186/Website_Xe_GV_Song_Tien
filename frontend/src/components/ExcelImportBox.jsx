import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api/client';

const TABLE_CONFIGS = {
  groups: {
    label: '1. Bảng Nhóm Giáo Viên',
    fileName: 'Mau_1_Bang_Nhom_Giao_Vien.xlsx',
    sheetName: 'NhomGiaoVien',
    columnsHint: 'Tên nhóm giáo viên | HKD Nhóm (Có/Chưa) | Mã HKD | Ghi chú',
    pastePlaceholder: `Nhóm 1 - Thầy Minh (Sông Tiền A), Có, HKD-ST-001, Nhóm chủ lực\nNhóm 4 - Thầy Tuấn, Chưa, , Đang bổ sung HKD`,
    sampleRows: [
      {
        'Tên nhóm giáo viên': 'Nhóm 1 - Thầy Minh (Sông Tiền A)',
        'HKD Nhóm': 'Có',
        'Mã HKD': 'HKD-ST-001',
        'Ghi chú': 'Nhóm chủ lực hạng B2',
      },
      {
        'Tên nhóm giáo viên': 'Nhóm 4 - Thầy Tuấn (Mới)',
        'HKD Nhóm': 'Chưa',
        'Mã HKD': '',
        'Ghi chú': 'Đang chờ bổ sung Hộ Kinh Doanh',
      },
    ],
    parsePasteParts: (parts) => ({
      name: parts[0] || '',
      has_business_household: parts[1] !== undefined ? parts[1] : 'Có',
      business_household_info: parts[2] || '',
      notes: parts[3] || '',
    }),
  },
  teachers: {
    label: '2. Bảng Giáo Viên & Xe',
    fileName: 'Mau_2_Bang_Giao_Vien_Va_Xe.xlsx',
    sheetName: 'GiaoVienXe',
    columnsHint:
      'Nhóm giáo viên | Tên giáo viên | Biển số xe | Hạng xe | Định mức | Số điện thoại | HKD Giáo viên',
    pastePlaceholder: `Nhóm 1 - Thầy Minh (Sông Tiền A), Lê Hoàng Nam, 63A-777.88, B2, 5, 0909123789, Có\nNhóm 4 - Thầy Tuấn (Mới), Nguyễn Quốc Tuấn, 63A-999.11, C, 5, 0918555666, Chưa`,
    sampleRows: [
      {
        'Nhóm giáo viên': 'Nhóm 1 - Thầy Minh (Sông Tiền A)',
        'Tên giáo viên': 'Lê Hoàng Nam',
        'Biển số xe': '63A-777.88',
        'Hạng xe': 'B2',
        'Định mức': 5,
        'Số điện thoại': '0909123789',
        'HKD Giáo viên': 'Có',
      },
      {
        'Nhóm giáo viên': 'Nhóm 4 - Thầy Tuấn (Mới)',
        'Tên giáo viên': 'Nguyễn Quốc Tuấn',
        'Biển số xe': '63A-999.11',
        'Hạng xe': 'C',
        'Định mức': 5,
        'Số điện thoại': '0918555666',
        'HKD Giáo viên': 'Chưa',
      },
    ],
    parsePasteParts: (parts) => ({
      group_name: parts[0] || 'Nhóm Mặc Định',
      full_name: parts[1] || '',
      license_plate: parts[2] || '',
      vehicle_class: parts[3] || 'B2',
      max_quota: Number(parts[4]) || 5,
      phone: parts[5] || '',
      has_business_household: parts[6] !== undefined ? parts[6] : 'Có',
    }),
  },
  courses: {
    label: '3. Bảng Khóa (Ngày) Khai Giảng',
    fileName: 'Mau_3_Bang_Khoa_Khai_Giang.xlsx',
    sheetName: 'KhoaKhaiGiang',
    columnsHint: 'Tên khóa khai giảng | Ngày khai giảng (dd/mm/yyyy) | Ghi chú',
    pastePlaceholder: `Khóa K05 - Đợt Cuối Tháng 11, 28/11/2026, Đợt khai giảng cuối tháng\nKhóa K06 - Đợt Đầu Tháng 12, 10/12/2026, Đợt khai giảng tháng 12`,
    sampleRows: [
      {
        'Tên khóa khai giảng': 'Khóa K05 - Đợt Cuối Tháng 11',
        'Ngày khai giảng': '28/11/2026',
        'Ghi chú': 'Đợt khai giảng cuối tháng 11',
      },
      {
        'Tên khóa khai giảng': 'Khóa K06 - Đợt Đầu Tháng 12',
        'Ngày khai giảng': '10/12/2026',
        'Ghi chú': 'Đợt khai giảng tháng 12',
      },
    ],
    parsePasteParts: (parts) => ({
      course_name: parts[0] || '',
      opening_date: parts[1] || '',
      notes: parts[2] || '',
    }),
  },
  allocations: {
    label: '4. Bảng Bản Ghi Lên Khóa',
    fileName: 'Mau_4_Bang_Ban_Ghi_Len_Khoa.xlsx',
    sheetName: 'BanGhiLenKhoa',
    columnsHint: 'Ngày khai giảng (dd/mm/yyyy) | Biển số xe | Tên giáo viên | Số học viên lên | Ghi chú',
    pastePlaceholder: `16/11/2026, 63A-123.45, Nguyễn Văn An, 2, Lên tiếp 2 HV còn lại sau 3 tuần\n16/11/2026, 63A-567.89, Phạm Văn Hùng, 3, Lên khóa đợt 16/11`,
    sampleRows: [
      {
        'Ngày khai giảng': '16/11/2026',
        'Tên khóa khai giảng': 'Khóa K04 - Đợt 16/11 (Khóa Hiện Tại)',
        'Biển số xe': '63A-123.45',
        'Tên giáo viên': 'Nguyễn Văn An',
        'Số học viên lên': 2,
        'Ghi chú': 'Lên tiếp 2 HV còn lại sau 3 tuần',
      },
      {
        'Ngày khai giảng': '16/11/2026',
        'Tên khóa khai giảng': 'Khóa K04 - Đợt 16/11 (Khóa Hiện Tại)',
        'Biển số xe': '63A-567.89',
        'Tên giáo viên': 'Phạm Văn Hùng',
        'Số học viên lên': 3,
        'Ghi chú': 'Lên khóa đợt 16/11',
      },
    ],
    parsePasteParts: (parts) => ({
      opening_date: parts[0] || '',
      license_plate: parts[1] || '',
      teacher_name: parts[2] || '',
      student_count: Number(parts[3]) || 1,
      notes: parts[4] || '',
    }),
  },
};

export function downloadTableSampleExcel(tableKey) {
  const cfg = TABLE_CONFIGS[tableKey] || TABLE_CONFIGS.teachers;
  const worksheet = XLSX.utils.json_to_sheet(cfg.sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, cfg.sheetName);
  XLSX.writeFile(workbook, cfg.fileName);
}

export async function parseExcelFileToRows(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
}

export default function ExcelImportBox({ defaultTable = 'teachers', onImported }) {
  const [targetTable, setTargetTable] = useState(defaultTable);
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  const currentCfg = TABLE_CONFIGS[targetTable] || TABLE_CONFIGS.teachers;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setResultMsg(null);

    try {
      const jsonRows = await parseExcelFileToRows(file);
      if (!jsonRows || jsonRows.length === 0) {
        setErrorMsg('File Excel/CSV đang trống hoặc chưa có dữ liệu.');
        return;
      }
      await submitImport(targetTable, jsonRows);
    } catch (err) {
      setErrorMsg('Không thể đọc file Excel/CSV: ' + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteImport = async () => {
    setErrorMsg(null);
    setResultMsg(null);

    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setErrorMsg('Vui lòng dán ít nhất 1 dòng dữ liệu.');
      return;
    }

    const rows = lines.map((line) => {
      const parts = line.includes('\t')
        ? line.split('\t').map((s) => s.trim())
        : line.split(/[,;]/).map((s) => s.trim());
      return currentCfg.parsePasteParts(parts);
    });

    await submitImport(targetTable, rows);
    setPasteText('');
  };

  const submitImport = async (tableKey, rows) => {
    setLoading(true);
    setErrorMsg(null);
    setResultMsg(null);
    try {
      const res = await api.importTable(tableKey, rows);
      setResultMsg(res.message);
      if (onImported) onImported();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-xl p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-950">
              Nhập File Excel (`.xlsx`, `.xls`, `.csv`) Hoặc Copy-Paste Theo Từng Bảng Dữ Liệu
            </h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              Chọn đúng bảng bạn muốn nhập ở bên dưới, tải file Excel mẫu của bảng đó hoặc chọn file Excel/CSV để nhập thẳng vào bảng.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => downloadTableSampleExcel(targetTable)}
            className="px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            Tải Mẫu Excel: {currentCfg.label}
          </button>

          <label className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm">
            <Upload className="w-4 h-4" />
            <span>
              {loading ? 'Đang nhập...' : `Chọn File Excel Nhập Vào ${currentCfg.label}`}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 4 nút chọn từng bảng để nhập */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-bold text-emerald-950">Chọn bảng cần nhập file:</span>
        {Object.entries(TABLE_CONFIGS).map(([key, cfg]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTargetTable(key);
              setErrorMsg(null);
              setResultMsg(null);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              targetTable === key
                ? 'bg-emerald-800 text-white shadow'
                : 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {resultMsg && (
        <div className="p-3.5 bg-white border border-emerald-400 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{resultMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-300 text-red-900 rounded-lg text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Ô Copy-Paste trực tiếp cho bảng đang chọn */}
      <div className="bg-white rounded-lg p-4 border border-emerald-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ClipboardPaste className="w-4 h-4 text-emerald-700" />
            Hoặc Copy & Dán (Ctrl+V) các dòng Excel cho <strong>{currentCfg.label}</strong>:
          </span>
          <span className="text-[11px] text-slate-500">
            Cột: <code>{currentCfg.columnsHint}</code>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            rows={2}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={currentCfg.pastePlaceholder}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            type="button"
            disabled={loading || !pasteText.trim()}
            onClick={handlePasteImport}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shrink-0"
          >
            Nhập Vào {currentCfg.label}
          </button>
        </div>
      </div>
    </div>
  );
}
