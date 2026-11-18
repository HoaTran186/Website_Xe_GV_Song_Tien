import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  FolderPlus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Building2,
} from 'lucide-react';
import { api } from '../api/client';
import ExcelImportBox from './ExcelImportBox';

export default function TeacherGroupTab({ groups, teachers, onRefresh }) {
  // Form tạo Nhóm giáo viên
  const [groupName, setGroupName] = useState('');
  const [groupHasHKD, setGroupHasHKD] = useState(true);
  const [groupHKDInfo, setGroupHKDInfo] = useState('');
  const [groupNotes, setGroupNotes] = useState('');

  // Form nhập Giáo viên thuộc Nhóm giáo viên + Xe
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [teacherName, setTeacherName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherHasHKD, setTeacherHasHKD] = useState(true);
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleClass, setVehicleClass] = useState('B2');
  const [maxQuota, setMaxQuota] = useState(5);

  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const created = await api.createGroup({
        name: groupName,
        has_business_household: groupHasHKD,
        business_household_info: groupHKDInfo,
        notes: groupNotes,
      });
      setGroupName('');
      setGroupHKDInfo('');
      setGroupNotes('');
      setSelectedGroupId(created.id);
      setMessage(`Đã thêm nhóm giáo viên "${created.name}" thành công!`);
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const targetGroup = selectedGroupId || groups[0]?.id;
      const trimmedTeacher = teacherName.trim();
      const trimmedPlate = licensePlate.trim();

      if (!trimmedTeacher && !trimmedPlate) {
        setError('Vui lòng nhập Tên giáo viên hoặc Biển số xe (hoặc cả hai).');
        return;
      }

      // Trường hợp Nhóm có xe nhưng thiếu giáo viên (chỉ nhập Biển số xe, để trống Tên giáo viên)
      if (!trimmedTeacher && trimmedPlate) {
        const createdVeh = await api.createVehicle({
          group_id: Number(targetGroup),
          license_plate: trimmedPlate,
          vehicle_class: vehicleClass,
          max_quota: Number(maxQuota) || 5,
        });
        setLicensePlate('');
        setMessage(
          `Đã thêm Xe "${createdVeh.license_plate}" vào nhóm (Xe chưa có GV cố định — có thể mượn tên GV nhóm khác khi lên khóa)!`
        );
        onRefresh();
        return;
      }

      const created = await api.createTeacher({
        group_id: Number(targetGroup),
        full_name: trimmedTeacher,
        phone: teacherPhone,
        has_business_household: teacherHasHKD,
        license_plate: trimmedPlate,
        vehicle_class: vehicleClass,
        max_quota: Number(maxQuota) || 5,
      });
      setTeacherName('');
      setTeacherPhone('');
      setLicensePlate('');
      setMessage(
        `Đã thêm giáo viên "${created.full_name}" ${
          created.license_plate ? `(Xe ${created.license_plate})` : '(Chưa có xe riêng — có thể mượn xe khi lên khóa)'
        } vào nhóm thành công!`
      );
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleGroupHKD = async (group) => {
    try {
      await api.updateGroup(group.id, {
        name: group.name,
        has_business_household: !group.has_business_household,
        business_household_info: group.business_household_info,
        notes: group.notes,
      });
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleTeacherHKD = async (teacher) => {
    try {
      await api.updateTeacher(teacher.id, {
        has_business_household: !teacher.has_business_household,
      });
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTeacher = async (teacherId, fullName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa giáo viên "${fullName}"?`)) return;
    try {
      await api.deleteTeacher(teacherId);
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-900 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hộp Nhập Nhanh Từ File Excel (.xlsx, .xls, .csv) hoặc Copy-Paste */}
      <ExcelImportBox onImported={onRefresh} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: Thêm Nhóm Giáo Viên */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-700" />
            1. Tạo Nhóm Giáo Viên Mới & Hộ Kinh Doanh Nhóm
          </h2>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên Nhóm Giáo Viên *
              </label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="VD: Nhóm 4 - Thầy Tuấn (Sông Tiền B)"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã / Tên Hộ Kinh Doanh (Nếu có)
                </label>
                <input
                  type="text"
                  value={groupHKDInfo}
                  onChange={(e) => setGroupHKDInfo(e.target.value)}
                  placeholder="VD: HKD-ST-004"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={groupNotes}
                  onChange={(e) => setGroupNotes(e.target.value)}
                  placeholder="Ghi chú thêm về nhóm"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={groupHasHKD}
                onChange={(e) => setGroupHasHKD(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-slate-800">
                Nhóm giáo viên này <strong>Đã có Hộ Kinh Doanh</strong> để tiến hành lên khóa
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-lg shadow-sm"
            >
              + Lưu Nhóm Giáo Viên
            </button>
          </form>
        </div>

        {/* Form 2: Nhập Tên Giáo Viên Thuộc Nhóm Giáo Viên + Biển Số Xe */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-700" />
            2. Nhập Giáo Viên Thuộc Nhóm Giáo Viên & Gán Xe Đào Tạo
          </h2>
          <form onSubmit={handleCreateTeacher} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thuộc Nhóm Giáo Viên *
                </label>
                <select
                  required
                  value={selectedGroupId || groups[0]?.id || ''}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.has_business_household ? '(Có HKD)' : '(Chưa có HKD)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và Tên Giáo Viên (Để trống nếu nhóm chỉ có xe, chờ mượn GV)
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Hải (hoặc để trống nếu chỉ thêm xe)"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biển Số Xe (Có thể để trống nếu mượn xe)
                </label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="VD: 63A-456.78 (hoặc trống)"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-semibold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hạng Xe</label>
                <select
                  value={vehicleClass}
                  onChange={(e) => setVehicleClass(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="B1">Hạng B1 (Khóa B.01K...)</option>
                  <option value="B2">Hạng B2 (Khóa BK...)</option>
                  <option value="C1">Hạng C1 (Khóa C1K...)</option>
                  <option value="C">Hạng C</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Định mức (1 Xe 1 GV)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxQuota}
                  onChange={(e) => setMaxQuota(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số Điện Thoại
                </label>
                <input
                  type="text"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  placeholder="VD: 0909888777"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <label className="flex items-center gap-2 p-2.5 mt-4 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={teacherHasHKD}
                  onChange={(e) => setTeacherHasHKD(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Giáo viên đã có Hộ Kinh Doanh
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-lg shadow-sm"
            >
              + Thêm Giáo Viên & Xe Vào Nhóm
            </button>
          </form>
        </div>
      </div>

      {/* Danh sách các Nhóm Giáo Viên và Giáo Viên trực thuộc */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-700" />
          Danh Sách Nhóm Giáo Viên, Giáo Viên & Trạng Thái Hộ Kinh Doanh
        </h3>

        {groups.map((group) => {
          const groupTeachers = teachers.filter((t) => Number(t.group_id) === Number(group.id));
          return (
            <div
              key={group.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-100 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-blue-800" />
                  <div>
                    <span className="font-bold text-slate-900 text-base">{group.name}</span>
                    <span className="ml-2 text-xs text-slate-600">
                      ({groupTeachers.length} giáo viên • Tổng định mức: {group.total_max_quota} HV • Còn lại:{' '}
                      <strong className="text-blue-700">{group.total_remaining_quota} HV</strong>)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleGroupHKD(group)}
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                      group.has_business_household
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-400 hover:bg-amber-200'
                    }`}
                    title="Bấm để đổi trạng thái Hộ Kinh Doanh của nhóm"
                  >
                    {group.has_business_household ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Nhóm Đã Có Hộ Kinh Doanh (Bấm để đổi)
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        Nhóm Chưa Có Hộ Kinh Doanh (Bấm để cấp)
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-x-auto">
                {group.spare_vehicles && group.spare_vehicles.length > 0 && (
                  <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-950">
                    <div>
                      <strong>Xe của nhóm đang thiếu giáo viên (chờ mượn tên GV khi lên khóa):</strong>{' '}
                      {group.spare_vehicles.map((sv) => (
                        <span
                          key={sv.id}
                          className="inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 bg-amber-300 text-slate-950 font-bold rounded border border-slate-800"
                        >
                          {sv.license_plate} ({sv.vehicle_class} • Định mức {sv.max_quota} HV)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-2.5 px-3">Giáo Viên</th>
                      <th className="py-2.5 px-3">Biển Số Xe</th>
                      <th className="py-2.5 px-3">Hộ Kinh Doanh GV</th>
                      <th className="py-2.5 px-3">Đã Lên / Định Mức</th>
                      <th className="py-2.5 px-3">Số Lượng Còn Lại Khai Giảng</th>
                      <th className="py-2.5 px-3">Trạng Thái 3 Tuần / 6 Tuần</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {groupTeachers.map((t) => {
                      const q = t.quota_status;
                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            {t.full_name}
                            {t.phone && (
                              <div className="text-[11px] font-normal text-slate-500">{t.phone}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {t.vehicle ? (
                              <span className="inline-block whitespace-nowrap px-2.5 py-1 bg-amber-300/90 text-slate-950 font-bold rounded border border-slate-800">
                                {t.vehicle.license_plate} ({t.vehicle.vehicle_class})
                              </span>
                            ) : (
                              <span className="text-slate-400">Chưa gán xe</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleTeacherHKD(t)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                                t.has_business_household
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {t.has_business_household ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã có HKD
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Chưa có HKD
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-semibold">
                            {q.used_quota} / {q.max_quota} học viên
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-900 font-bold rounded-full">
                              Còn lại: {q.remaining_quota} học viên
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-md">{q.status_message}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteTeacher(t.id, t.full_name)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Xóa giáo viên"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

