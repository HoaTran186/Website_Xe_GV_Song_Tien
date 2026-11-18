import React from 'react';
import { AlertTriangle, CheckCircle2, CalendarX2, ShieldAlert } from 'lucide-react';
import { formatDateVN } from '../utils/dateFormat';

export default function AttentionBanner({ attentionReport, compact = false, onOpenFullTab }) {
  if (!attentionReport) return null;

  const { attention_groups = [], all_groups_status = [], total_courses = 0 } = attentionReport;

  if (compact) {
    if (attention_groups.length === 0) return null;
    return (
      <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-900">
              DANH SÁCH CẦN CHÚ Ý: Phát hiện {attention_groups.length} Nhóm giáo viên bỏ qua từ 3 khóa khai giảng liên tiếp!
            </h3>
            <div className="text-xs text-red-800 mt-1 space-y-1">
              {attention_groups.map((g) => (
                <div key={g.group_id}>
                  • <strong>{g.group_name}</strong>: Đã bỏ qua{' '}
                  <strong>{g.consecutive_missed_courses} khóa khai giảng</strong> (Các ngày:{' '}
                  {g.missed_course_dates.map(formatDateVN).join(', ')})
                </div>
              ))}
            </div>
          </div>
        </div>
        {onOpenFullTab && (
          <button
            onClick={onOpenFullTab}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shrink-0"
          >
            Xem chi tiết nhóm cần chú ý
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-6 h-6 text-red-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Danh Sách Nhóm Giáo Viên Cần Chú Ý (Bỏ qua ≥ 3 khóa khai giảng)
          </h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Quy tắc: Nếu một nhóm giáo viên bỏ qua <strong>3 khóa khai giảng (tức 3 ngày khai giảng liên tiếp)</strong> không có học viên lên khóa, hệ thống tự động đưa nhóm đó vào danh sách cần chú ý. Tổng số khóa khai giảng đã ghi nhận: <strong>{total_courses} khóa</strong>.
        </p>

        {attention_groups.length === 0 ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-semibold">Hiện không có nhóm giáo viên nào bỏ qua 3 khóa liên tiếp.</p>
              <p className="text-xs text-emerald-700">Tất cả các nhóm giáo viên đều đang duy trì lịch khai giảng đều đặn.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attention_groups.map((g) => (
              <div
                key={g.group_id}
                className="border-2 border-red-300 bg-red-50/70 rounded-xl p-5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                      CẦN CHÚ Ý • BỎ QUA {g.consecutive_missed_courses} KHÓA
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        g.has_business_household
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {g.has_business_household ? 'Đã có Hộ Kinh Doanh' : 'Chưa có Hộ Kinh Doanh'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-red-950 mt-3">{g.group_name}</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Ngày khai giảng gần nhất có tham gia:{' '}
                    <strong>{g.last_participated_date ? formatDateVN(g.last_participated_date) : 'Chưa từng tham gia'}</strong>
                  </p>
                </div>

                <div className="bg-white/90 rounded-lg p-3 border border-red-200">
                  <div className="text-xs font-semibold text-red-900 flex items-center gap-1.5 mb-2">
                    <CalendarX2 className="w-4 h-4 text-red-600" />
                    Các khóa (ngày khai giảng) đã bỏ qua liên tiếp:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.missed_courses.map((mc) => (
                      <span
                        key={mc.course_id}
                        className="px-2.5 py-1 bg-red-100 text-red-900 rounded text-xs font-medium"
                      >
                        {mc.course_name} ({formatDateVN(mc.opening_date)})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4">
          Bảng Theo Dõi Chuyên Cần Khai Giảng Của Tất Cả Nhóm Giáo Viên
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-3 px-4">Nhóm Giáo Viên</th>
                <th className="py-3 px-4">Hộ Kinh Doanh</th>
                <th className="py-3 px-4">Khóa Tham Gia Gần Nhất</th>
                <th className="py-3 px-4">Số Khóa Bỏ Qua Liên Tiếp</th>
                <th className="py-3 px-4">Các Ngày Khai Giảng Bỏ Qua</th>
                <th className="py-3 px-4">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {all_groups_status.map((g) => (
                <tr key={g.group_id} className={g.needs_attention ? 'bg-red-50/50' : ''}>
                  <td className="py-3 px-4 font-semibold text-slate-900">{g.group_name}</td>
                  <td className="py-3 px-4">
                    {g.has_business_household ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                        Có HKD
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                        Chưa có HKD
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {g.last_participated_date ? formatDateVN(g.last_participated_date) : 'Chưa tham gia'}
                  </td>
                  <td className="py-3 px-4 font-bold">
                    <span className={g.needs_attention ? 'text-red-600' : 'text-slate-700'}>
                      {g.consecutive_missed_courses} khóa
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    {g.missed_course_dates.length > 0
                      ? g.missed_course_dates.map(formatDateVN).join(', ')
                      : 'Không vắng khóa nào'}
                  </td>
                  <td className="py-3 px-4">
                    {g.needs_attention ? (
                      <span className="px-2.5 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
                        Cần chú ý (≥ 3 khóa)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                        Bình thường
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

