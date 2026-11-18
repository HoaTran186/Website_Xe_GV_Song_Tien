import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  FolderPlus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Building2,
  Search,
  X,
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

  const [searchTerm, setSearchTerm] = useState('');

  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const filteredGroupsData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return groups
      .map((group) => {
        const groupTeachers = teachers.filter((t) => Number(t.group_id) === Number(group.id));
        const spareVehicles = group.spare_vehicles || [];

        if (!q) {
          return {
            group,
            displayTeachers: groupTeachers,
            displaySpareVehicles: spareVehicles,
          };
        }

        const groupNameMatch = (group.name || '').toLowerCase().includes(q);

        if (groupNameMatch) {
          return {
            group,
            displayTeachers: groupTeachers,
            displaySpareVehicles: spareVehicles,
          };
        }

        const matchedTeachers = groupTeachers.filter((t) => {
          const name = (t.full_name || '').toLowerCase();
          const phone = (t.phone || '').toLowerCase();
          const plate = (t.vehicle?.license_plate || '').toLowerCase();
          const vClass = (t.vehicle?.vehicle_class || '').toLowerCase();
          return (
            name.includes(q) ||
            phone.includes(q) ||
            plate.includes(q) ||
            vClass.includes(q)
          );
        });

        const matchedSpare = spareVehicles.filter((sv) => {
          const plate = (sv.license_plate || '').toLowerCase();
          const vClass = (sv.vehicle_class || '').toLowerCase();
          return plate.includes(q) || vClass.includes(q);
        });

        if (matchedTeachers.length > 0 || matchedSpare.length > 0) {
          return {
            group,
            displayTeachers: matchedTeachers,
            displaySpareVehicles: matchedSpare,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [groups, teachers, searchTerm]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Form 1: Thêm Nhóm Giáo Viên */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                <FolderPlus className="w-5 h-5" />
              </div>
              <span>1. Tạo Nhóm Giáo Viên Mới</span>
            </h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên Nhóm Giáo Viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="VD: Nhóm 4 - Thầy Tuấn (Sông Tiền B)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mã / Tên Hộ Kinh Doanh
                  </label>
                  <input
                    type="text"
                    value={groupHKDInfo}
                    onChange={(e) => setGroupHKDInfo(e.target.value)}
                    placeholder="VD: HKD-ST-004"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Ghi Chú
                  </label>
                  <input
                    type="text"
                    value={groupNotes}
                    onChange={(e) => setGroupNotes(e.target.value)}
                    placeholder="Ghi chú thêm về nhóm..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Trạng Thái Hộ Kinh Doanh Nhóm
                </label>
                <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 hover:bg-slate-100 cursor-pointer min-h-[42px] transition">
                  <input
                    type="checkbox"
                    checked={groupHasHKD}
                    onChange={(e) => setGroupHasHKD(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800 select-none">
                    Nhóm giáo viên này <strong>Đã có Hộ Kinh Doanh</strong>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <FolderPlus className="w-4 h-4" />
                <span>+ Lưu Nhóm Giáo Viên Mới</span>
              </button>
            </form>
          </div>
        </div>

        {/* Form 2: Nhập Tên Giáo Viên Thuộc Nhóm Giáo Viên + Biển Số Xe */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                <UserPlus className="w-5 h-5" />
              </div>
              <span>2. Thêm Giáo Viên & Gán Xe Đào Tạo</span>
            </h2>
            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Thuộc Nhóm Giáo Viên <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedGroupId || groups[0]?.id || ''}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} {g.has_business_household ? '(Có HKD)' : '(Chưa có HKD)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Họ và Tên Giáo Viên
                    </label>
                    <span className="text-[11px] text-slate-400 italic">
                      (Trống nếu chỉ thêm xe)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="VD: Nguyễn Văn Hải..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Biển Số Xe
                    </label>
                    <span className="text-[11px] text-slate-400 italic">
                      (Trống nếu chỉ thêm GV)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="VD: 63A-456.78"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold uppercase tracking-wider focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Hạng Xe Đào Tạo
                  </label>
                  <select
                    value={vehicleClass}
                    onChange={(e) => setVehicleClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                  >
                    <option value="B1">Hạng B1 (Khóa B.01K...)</option>
                    <option value="B2">Hạng B2 (Khóa BK...)</option>
                    <option value="C1">Hạng C1 (Khóa C1K...)</option>
                    <option value="C">Hạng C</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                    Định Mức (HV)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxQuota}
                    onChange={(e) => setMaxQuota(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-center font-bold text-blue-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Số Điện Thoại Liên Hệ
                  </label>
                  <input
                    type="text"
                    value={teacherPhone}
                    onChange={(e) => setTeacherPhone(e.target.value)}
                    placeholder="VD: 0909888777"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Hộ Kinh Doanh Cá Nhân
                  </label>
                  <label className="flex items-center gap-2.5 px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer min-h-[42px] transition">
                    <input
                      type="checkbox"
                      checked={teacherHasHKD}
                      onChange={(e) => setTeacherHasHKD(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-800 select-none">
                      Giáo viên đã có Hộ Kinh Doanh
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Thêm Giáo Viên & Xe Vào Nhóm</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Danh sách các Nhóm Giáo Viên và Giáo Viên trực thuộc */}
      <div className="space-y-4">
        {/* Khung Tiêu Đề & Ô Tìm Kiếm Nhanh */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Danh Sách Nhóm Giáo Viên, Giáo Viên & Trạng Thái Hộ Kinh Doanh
              </h3>
              <p className="text-xs text-slate-500">
                Hiển thị <strong>{filteredGroupsData.length}</strong> / {groups.length} nhóm
                {searchTerm && ` (kết quả khớp từ khóa: "${searchTerm}")`}
              </p>
            </div>
          </div>

          {/* Ô Tìm Kiếm Nhanh (Tìm tên GV, biển số xe, tên nhóm, SĐT...) */}
          <div className="relative w-full md:w-80 lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Tên GV, Biển số xe, Tên nhóm, SĐT..."
              className="w-full pl-9 pr-9 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {filteredGroupsData.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
            <Search className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-base font-bold text-slate-700">
              Không tìm thấy kết quả phù hợp cho "{searchTerm}"
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hãy thử tìm với từ khóa khác như tên Giáo viên, biển số xe (VD: 71A..., 63C...), tên nhóm hoặc số điện thoại.
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Xóa Bộ Lọc Tìm Kiếm
            </button>
          </div>
        ) : (
          filteredGroupsData.map(({ group, displayTeachers, displaySpareVehicles }) => (
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
                      ({displayTeachers.length} giáo viên • Tổng định mức: {group.total_max_quota} HV • Còn lại:{' '}
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
                {displaySpareVehicles && displaySpareVehicles.length > 0 && (
                  <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-950">
                    <div>
                      <strong>Xe của nhóm đang thiếu giáo viên (chờ mượn tên GV khi lên khóa):</strong>{' '}
                      {displaySpareVehicles.map((sv) => (
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
                    {displayTeachers.map((t) => {
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
          ))
        )}
      </div>
    </div>
  );
}

