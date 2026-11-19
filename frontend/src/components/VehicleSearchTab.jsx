import React, { useState, useEffect } from 'react';
import { Search, Car, User, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { formatDateVN, getCoursePatternLabel } from '../utils/dateFormat';

export default function VehicleSearchTab() {
  const [plateQuery, setPlateQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (queryValue = plateQuery) => {
    setLoading(true);
    try {
      const res = await api.searchVehicles(queryValue);
      setSearchResults(res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch('');
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-700" />
          Tra Cứu Biển Số Xe & Lịch Sử Ngày Khai Giảng
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Nhập biển số xe (ví dụ: <code>63A-123.45</code> hoặc <code>12345</code>) để xem ngay <strong>Tên giáo viên</strong>, <strong>Xe đào tạo</strong>, <strong>Nhóm giáo viên</strong>, <strong>Số lượng học viên còn lại</strong> và <strong>đã khai giảng những ngày nào</strong>.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(plateQuery);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={plateQuery}
              onChange={(e) => {
                setPlateQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="Nhập biển số xe cần tìm (VD: 63A-123.45, 23456, 88899...)"
              className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-sm"
          >
            Tìm Biển Số Xe
          </button>
          {plateQuery && (
            <button
              type="button"
              onClick={() => {
                setPlateQuery('');
                handleSearch('');
              }}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-sm rounded-xl"
            >
              Xem tất cả
            </button>
          )}
        </form>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Đang tra cứu dữ liệu biển số xe...</div>
      ) : searchResults.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          Không tìm thấy xe nào khớp với biển số <strong>"{plateQuery}"</strong>.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {searchResults.map((item) => {
            const q = item.quota_status;
            return (
              <div
                key={item.vehicle_id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="bg-slate-100/80 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
                    <div className="inline-block whitespace-nowrap px-3.5 sm:px-4 py-1.5 sm:py-2 bg-amber-400 text-slate-950 font-black text-base sm:text-lg rounded-lg border-2 border-slate-900 tracking-wider shadow-sm w-fit">
                      {item.license_plate}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <User className="w-4 h-4 text-blue-700 shrink-0" />
                        <span className="text-sm sm:text-base font-bold text-slate-900">
                          GV: {item.teacher.full_name}
                        </span>
                        <span className="text-[11px] sm:text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold shrink-0">
                          Hạng {item.vehicle_class} ({getCoursePatternLabel(item.vehicle_class)})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Thuộc nhóm: <strong>{item.group.name}</strong> • SĐT:{' '}
                        {item.teacher.phone || 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {q.business_household_warning ? (
                      <span className="flex items-center gap-1 px-2.5 sm:px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        Chưa có HKD
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 sm:px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Đã có HKD
                      </span>
                    )}
                    <div className="px-3 sm:px-3.5 py-1 bg-blue-900 text-white rounded-full text-xs font-bold">
                      Đã lên: {q.used_quota}/{item.max_quota} HV • Còn lại:{' '}
                      <span className="text-amber-300 font-extrabold">{q.remaining_quota} HV</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="mb-4 p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-950 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>Trạng thái chu kỳ 3 tuần / 6 tuần:</strong> {q.status_message}
                    </span>
                    {q.turnaround_date && (
                      <span className="font-semibold">
                        {q.remaining_quota > 0 && q.next_eligible_date ? (
                          <>
                            Đủ 3 tuần (lên tiếp {q.remaining_quota} HV):{' '}
                            <code className="bg-white px-1.5 py-0.5 rounded">
                              {formatDateVN(q.next_eligible_date)}
                            </code>{' '}
                            •{' '}
                          </>
                        ) : null}
                        Quay đầu 6 tuần:{' '}
                        <code className="bg-white px-1.5 py-0.5 rounded font-bold text-blue-900">
                          {formatDateVN(q.turnaround_date)}
                        </code>
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-700" />
                    Lịch Sử Các Ngày Đã Khai Giảng Của Giáo Viên & Xe {item.license_plate}:
                  </h4>

                  {item.opening_history.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      Xe và giáo viên này chưa có lịch sử khai giảng khóa nào.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                            <th className="py-2.5 px-3">Khóa Khai Giảng</th>
                            <th className="py-2.5 px-3">Ngày Khai Giảng</th>
                            <th className="py-2.5 px-3">Ngày Bế Giảng</th>
                            <th className="py-2.5 px-3">Nhóm Lên Khóa & Giáo Viên</th>
                            <th className="py-2.5 px-3">Số Học Viên Đã Lên</th>
                            <th className="py-2.5 px-3">Ngày Mở Khóa Tiếp (+3 Tuần)</th>
                            <th className="py-2.5 px-3">Ngày Quay Đầu (+6 Tuần)</th>
                            <th className="py-2.5 px-3">Trạng Thái Chu Kỳ</th>
                            <th className="py-2.5 px-3">Ghi Chú / Mượn GV-Xe</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {item.opening_history.map((h) => (
                            <tr key={h.allocation_id}>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {h.course_name}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-blue-700 whitespace-nowrap">
                                {formatDateVN(h.opening_date)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-purple-800 whitespace-nowrap">
                                {h.closing_date ? formatDateVN(h.closing_date) : '-'}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{h.teacher_name}</div>
                                <div className="text-[11px] text-slate-500">
                                  Nhóm lên khóa: {h.allocating_group_name}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                                {h.student_count} học viên
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                                {h.student_count < (item.max_quota || 5) ? (
                                  <span className="font-semibold text-blue-800">
                                    {formatDateVN(h.next_eligible_date)}{' '}
                                    <span className="text-[11px] text-slate-500">
                                      (Lên tiếp {(item.max_quota || 5) - h.student_count} HV)
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">
                                    Đã đủ 5 HV (Chờ 6 tuần)
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-800 whitespace-nowrap">
                                {formatDateVN(h.turnaround_date)}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {h.is_active_in_6w_cycle ? (
                                  <span className="inline-block whitespace-nowrap px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                                    Đang tính trong 6 tuần
                                  </span>
                                ) : (
                                  <span className="inline-block whitespace-nowrap px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                                    Đã qua 6 tuần (Đã quay đầu)
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {h.borrow_note && (
                                  <span className="inline-block mr-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded font-bold">
                                    {h.borrow_note}
                                  </span>
                                )}
                                {h.notes}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

