import React, { useState, useEffect } from 'react';
import {
  Database,
  Edit3,
  Trash2,
  PlusCircle,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../api/client';
import { downloadTableSampleExcel, parseExcelFileToRows } from './ExcelImportBox';
import { formatDateVN, toISODate } from '../utils/dateFormat';

export default function AdminDataManagerTab({ groups, teachers, courses, onRefreshAll, onBackToUser }) {
  const [subTab, setSubTab] = useState('all');
  const [allocations, setAllocations] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // State form Nhóm GV
  const [groupForm, setGroupForm] = useState({
    id: null,
    name: '',
    has_business_household: true,
    business_household_info: '',
    notes: '',
  });

  // State form Giáo viên & Xe
  const [teacherForm, setTeacherForm] = useState({
    id: null,
    group_id: groups[0]?.id || '',
    full_name: '',
    phone: '',
    has_business_household: true,
    license_plate: '',
    vehicle_class: 'B2',
    max_quota: 5,
  });

  // State form Khóa khai giảng
  const [courseForm, setCourseForm] = useState({
    id: null,
    course_name: '',
    opening_date: '',
    closing_date: '',
    notes: '',
  });

  // State form Bản ghi lên khóa
  const [allocForm, setAllocForm] = useState({
    id: null,
    course_id: courses[0]?.id || '',
    teacher_id: teachers[0]?.id || '',
    student_count: 2,
    closing_date: '',
    notes: '',
  });

  // State Quản lý Tài khoản người dùng (Chỉ Admin)
  const [userList, setUserList] = useState([]);
  const [userForm, setUserForm] = useState({
    id: null,
    username: '',
    password: '',
    full_name: '',
    role: 'user',
  });

  const loadAllocations = async () => {
    try {
      const list = await api.getAllocations();
      setAllocations(list);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    try {
      const list = await api.getUsers();
      setUserList(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAllocations();
    loadUsers();
  }, [courses, teachers]);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (userForm.id) {
        await api.updateUser(userForm.id, {
          full_name: userForm.full_name,
          role: userForm.role,
          password: userForm.password || undefined,
        });
        notify(`Đã cập nhật tài khoản "${userForm.username}" thành công!`);
      } else {
        await api.createUser({
          username: userForm.username,
          password: userForm.password,
          full_name: userForm.full_name,
          role: userForm.role,
        });
        notify(`Đã tạo tài khoản mới "${userForm.username}" thành công!`);
      }
      setUserForm({
        id: null,
        username: '',
        password: '',
        full_name: '',
        role: 'user',
      });
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteUser = async (id, uName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${uName}" không?`)) return;
    try {
      await api.deleteUser(id);
      notify(`Đã xóa tài khoản "${uName}".`);
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const notify = (msg) => {
    setErrorMsg(null);
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // --- CRUD Nhóm Giáo Viên ---
  const handleSaveGroup = async (e) => {
    e.preventDefault();
    try {
      if (groupForm.id) {
        await api.updateGroup(groupForm.id, groupForm);
        notify(`Đã cập nhật Nhóm giáo viên #${groupForm.id} thành công!`);
      } else {
        await api.createGroup(groupForm);
        notify('Đã thêm Nhóm giáo viên mới thành công!');
      }
      setGroupForm({
        id: null,
        name: '',
        has_business_household: true,
        business_household_info: '',
        notes: '',
      });
      onRefreshAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteGroup = async (id, name) => {
    if (!window.confirm(`Xóa nhóm giáo viên "${name}" (sẽ xóa cả giáo viên thuộc nhóm)?`)) return;
    try {
      await api.deleteGroup(id);
      notify(`Đã xóa nhóm "${name}".`);
      onRefreshAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // --- CRUD Giáo Viên & Xe ---
  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    try {
      const targetGroupId = Number(teacherForm.group_id || groups[0]?.id);
      const trimmedTeacher = String(teacherForm.full_name || '').trim();
      const trimmedPlate = String(teacherForm.license_plate || '').trim();

      // Nếu để trống tên Giáo viên mà chỉ nhập Biển số xe -> Thêm Xe lẻ vào nhóm (ví dụ nhóm có 5 xe nhưng chỉ có 4 GV)
      if (!teacherForm.id && !trimmedTeacher && trimmedPlate) {
        await api.createVehicle({
          group_id: targetGroupId,
          license_plate: trimmedPlate,
          vehicle_class: teacherForm.vehicle_class || 'B2',
          max_quota: Number(teacherForm.max_quota) || 5,
        });
        notify(`Đã thêm Xe lẻ "${trimmedPlate}" (chưa có GV cố định) vào nhóm!`);
        setTeacherForm({
          id: null,
          group_id: groups[0]?.id || '',
          full_name: '',
          phone: '',
          has_business_household: true,
          license_plate: '',
          vehicle_class: 'B2',
          max_quota: 5,
        });
        onRefreshAll();
        return;
      }

      const payload = {
        ...teacherForm,
        group_id: targetGroupId,
        max_quota: Number(teacherForm.max_quota) || 5,
      };
      if (teacherForm.id) {
        await api.updateTeacher(teacherForm.id, payload);
        notify(`Đã cập nhật thông tin Giáo viên & Xe #${teacherForm.id}!`);
      } else {
        await api.createTeacher(payload);
        notify('Đã thêm Giáo viên & Xe mới thành công!');
      }
      setTeacherForm({
        id: null,
        group_id: groups[0]?.id || '',
        full_name: '',
        phone: '',
        has_business_household: true,
        license_plate: '',
        vehicle_class: 'B2',
        max_quota: 5,
      });
      onRefreshAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteTeacher = async (id, name) => {
    if (!window.confirm(`Xóa giáo viên "${name}"?`)) return;
    try {
      await api.deleteTeacher(id);
      notify(`Đã xóa giáo viên "${name}".`);
      onRefreshAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // --- CRUD Khóa Khai Giảng ---
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      if (courseForm.id) {
        await api.updateCourse(courseForm.id, courseForm);
        notify(`Đã cập nhật Khóa khai giảng #${courseForm.id}!`);
      } else {
        await api.createCourse(courseForm);
        notify('Đã tạo Khóa khai giảng mới!');
      }
      setCourseForm({ id: null, course_name: '', opening_date: '', notes: '' });
      onRefreshAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteCourse = async (id, name) => {
    if (!window.confirm(`Xóa khóa khai giảng "${name}"?`)) return;
    try {
      await api.deleteCourse(id);
      notify(`Đã xóa khóa "${name}".`);
      onRefreshAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // --- CRUD Bản Ghi Lên Khóa ---
  const handleSaveAllocation = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        course_id: Number(allocForm.course_id || courses[0]?.id),
        teacher_id: Number(allocForm.teacher_id || teachers[0]?.id),
        student_count: Number(allocForm.student_count),
        closing_date: allocForm.closing_date,
        notes: allocForm.notes,
        confirm_without_business_household: true,
      };
      if (allocForm.id) {
        await api.updateAllocation(allocForm.id, payload);
        notify(`Đã cập nhật bản ghi lên khóa #${allocForm.id}!`);
      } else {
        await api.createAllocation(payload);
        notify('Đã thêm bản ghi lên khóa mới!');
      }
      setAllocForm({
        id: null,
        course_id: courses[0]?.id || '',
        teacher_id: teachers[0]?.id || '',
        student_count: 2,
        closing_date: '',
        notes: '',
      });
      await loadAllocations();
      onRefreshAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteAllocation = async (id) => {
    if (!window.confirm('Xóa bản ghi lên khóa này?')) return;
    try {
      await api.deleteAllocation(id);
      notify('Đã xóa bản ghi lên khóa.');
      await loadAllocations();
      onRefreshAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleResetSeed = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn XÓA SẠCH toàn bộ dữ liệu hiện tại?')) return;
    try {
      const res = await api.resetSeedData();
      notify(res.message);
      await loadAllocations();
      onRefreshAll();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleExportJSON = async () => {
    try {
      const data = await api.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `song_tien_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleImportTableFile = async (tableKey, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const rows = await parseExcelFileToRows(file);
      if (!rows || rows.length === 0) {
        setErrorMsg('File Excel/CSV không có dữ liệu.');
        return;
      }
      const res = await api.importTable(tableKey, rows);
      notify(res.message);
      await loadAllocations();
      onRefreshAll();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      e.target.value = '';
    }
  };

  const renderTableExcelActions = (tableKey, tableLabel) => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => downloadTableSampleExcel(tableKey)}
        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1"
      >
        <Download className="w-3.5 h-3.5 text-emerald-700" />
        Tải Mẫu Excel ({tableLabel})
      </button>
      <label className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer">
        <Upload className="w-3.5 h-3.5" />
        <span>Nhập File Excel Cho {tableLabel}</span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => handleImportTableFile(tableKey, e)}
          className="hidden"
        />
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Admin */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="bg-white p-1 rounded-xl shadow shrink-0 flex items-center justify-center">
            <img
              src="/logo-song-tien.jpg"
              alt="Logo Sông Tiền"
              className="w-11 h-11 object-contain rounded-lg"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold">
              TRUNG TÂM QUẢN TRỊ DỮ LIỆU ADMIN (THÊM • SỬA • XÓA TOÀN BỘ CSDL)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Cho phép Admin sửa đổi trực tiếp mọi bảng dữ liệu: Nhóm giáo viên, Giáo viên & Biển số xe, Ngày khai giảng và Lịch sử lên khóa.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {onBackToUser && (
            <button
              onClick={onBackToUser}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition"
            >
              <ArrowLeft className="w-4 h-4" />
              ← Về Trang Chính (Lên Khóa)
            </button>
          )}
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Xuất JSON Backup
          </button>
          <button
            onClick={handleResetSeed}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Xóa Trắng Toàn Bộ Dữ Liệu
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-900 rounded-xl text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Chọn bảng dữ liệu cần sửa */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Tất Cả Phân Hệ' },
          { id: 'users', label: `👤 Quản Lý Tài Khoản (${userList.length})` },
          { id: 'courses', label: `1. Khóa / Ngày Khai Giảng (${courses.length})` },
          { id: 'teachers', label: `2. Giáo Viên & Xe (${teachers.length})` },
          { id: 'groups', label: `3. Nhóm Giáo Viên (${groups.length})` },
          { id: 'allocations', label: `4. Sửa Bản Ghi Lên Khóa (${allocations.length})` },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setSubTab(item.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              subTab === item.id
                ? 'bg-blue-700 text-white shadow'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* PHÂN HỆ QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG & PHÂN QUYỀN (CHỈ ADMIN) */}
      {(subTab === 'all' || subTab === 'users') && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {userForm.id ? (
                  <>
                    <Edit3 className="w-4 h-4 text-amber-600" />
                    Đang Chỉnh Sửa Tài Khoản: {userForm.username}
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 text-blue-700" />
                    Tạo Tài Khoản Mới & Phân Quyền Truy Cập
                  </>
                )}
              </h3>
            </div>

            <form onSubmit={handleSaveUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Đăng Nhập *
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(userForm.id)}
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase() })}
                  placeholder="VD: tranvan_a"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {userForm.id ? 'Mật Khẩu Mới (để trống nếu giữ nguyên)' : 'Mật Khẩu *'}
                </label>
                <input
                  type="password"
                  required={!userForm.id}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={userForm.id ? 'Để trống nếu giữ nguyên' : 'Nhập mật khẩu...'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ Và Tên Người Dùng *
                </label>
                <input
                  type="text"
                  required
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="VD: Trần Văn A"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quyền Hạn Vào Hệ Thống *
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white"
                >
                  <option value="user">👤 Người Dùng (Không được vào Admin)</option>
                  <option value="admin">👑 Quản Trị Viên (Vào Admin + Phân quyền)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  {userForm.id ? 'Cập Nhật' : '+ Tạo Tài Khoản'}
                </button>
                {userForm.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setUserForm({
                        id: null,
                        username: '',
                        password: '',
                        full_name: '',
                        role: 'user',
                      })
                    }
                    className="px-3 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-300 cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3">ID</th>
                  <th className="p-3">Tên Đăng Nhập</th>
                  <th className="p-3">Họ Tên</th>
                  <th className="p-3">Quyền Hạn</th>
                  <th className="p-3">Trạng Thái Truy Cập Admin</th>
                  <th className="p-3 text-right">Sửa / Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {userList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">#{u.id}</td>
                    <td className="p-3 font-bold text-slate-900 font-mono">{u.username}</td>
                    <td className="p-3 font-bold text-blue-900">{u.full_name}</td>
                    <td className="p-3">
                      {u.role === 'admin' ? (
                        <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 font-black rounded-full text-[11px]">
                          👑 Quản Trị Viên (Admin)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-full text-[11px]">
                          👤 Người Dùng (Cán Bộ)
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {u.role === 'admin' ? (
                        <span className="text-emerald-700 font-bold">✓ Được vào Quản Trị & Tạo tài khoản</span>
                      ) : (
                        <span className="text-slate-400 font-medium italic">⛔ Bị chặn, không được vào Quản Trị</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() =>
                          setUserForm({
                            id: u.id,
                            username: u.username,
                            password: '',
                            full_name: u.full_name,
                            role: u.role,
                          })
                        }
                        className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded cursor-pointer"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded cursor-pointer"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BẢNG 1: SỬA GIÁO VIÊN & XE */}
      {(subTab === 'all' || subTab === 'teachers') && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {teacherForm.id ? (
                  <>
                    <Edit3 className="w-4 h-4 text-amber-600" />
                    Đang Chỉnh Sửa Giáo Viên & Xe #{teacherForm.id}
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 text-blue-700" />
                    Bảng 1: Quản Lý & Nhập Dữ Liệu Giáo Viên & Xe Đào Tạo
                  </>
                )}
              </h3>
              {renderTableExcelActions('teachers', 'Bảng Giáo Viên & Xe')}
            </div>
            <form onSubmit={handleSaveTeacher} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nhóm Giáo Viên *</label>
                <select
                  value={teacherForm.group_id || groups[0]?.id || ''}
                  onChange={(e) => setTeacherForm({ ...teacherForm, group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ Tên Giáo Viên (Trống nếu chỉ thêm Xe lẻ)
                </label>
                <input
                  type="text"
                  value={teacherForm.full_name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, full_name: e.target.value })}
                  placeholder="Nhập tên GV (hoặc để trống nếu thêm xe lẻ)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại</label>
                <input
                  type="text"
                  value={teacherForm.phone}
                  onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                  placeholder="0909..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng Thái Hộ Kinh Doanh</label>
                <select
                  value={teacherForm.has_business_household ? '1' : '0'}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, has_business_household: e.target.value === '1' })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="1">Đã có Hộ Kinh Doanh</option>
                  <option value="0">Chưa có Hộ Kinh Doanh</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Biển Số Xe *</label>
                <input
                  type="text"
                  required
                  value={teacherForm.license_plate}
                  onChange={(e) => setTeacherForm({ ...teacherForm, license_plate: e.target.value })}
                  placeholder="63A-123.45"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hạng Xe</label>
                <select
                  value={teacherForm.vehicle_class}
                  onChange={(e) => setTeacherForm({ ...teacherForm, vehicle_class: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="B1">Hạng B1 (Khóa B.01K...)</option>
                  <option value="B2">Hạng B2 (Khóa BK...)</option>
                  <option value="C1">Hạng C1 (Khóa C1K...)</option>
                  <option value="C">Hạng C</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Định Mức HV (Mặc định 5)</label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={teacherForm.max_quota}
                  onChange={(e) => setTeacherForm({ ...teacherForm, max_quota: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg"
                >
                  {teacherForm.id ? 'Cập Nhật Giáo Viên' : '+ Thêm Mới'}
                </button>
                {teacherForm.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setTeacherForm({
                        id: null,
                        group_id: groups[0]?.id || '',
                        full_name: '',
                        phone: '',
                        has_business_household: true,
                        license_plate: '',
                        vehicle_class: 'B2',
                        max_quota: 5,
                      })
                    }
                    className="px-3 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3">ID</th>
                  <th className="p-3">Họ Tên Giáo Viên</th>
                  <th className="p-3">SĐT</th>
                  <th className="p-3">Nhóm Giáo Viên</th>
                  <th className="p-3">Biển Số Xe</th>
                  <th className="p-3">Hạng</th>
                  <th className="p-3">Định Mức</th>
                  <th className="p-3">Hộ Kinh Doanh</th>
                  <th className="p-3 text-right">Sửa / Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">#{t.id}</td>
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{t.full_name}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{t.phone || '-'}</td>
                    <td className="p-3">{t.group_name}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="inline-block whitespace-nowrap px-2.5 py-0.5 bg-amber-300 font-bold rounded border border-slate-800">
                        {t.vehicle?.license_plate || '-'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{t.vehicle?.vehicle_class || 'B2'}</td>
                    <td className="p-3 font-bold">{t.vehicle?.max_quota || 5} HV</td>
                    <td className="p-3">
                      {t.has_business_household ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                          Đã có HKD
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">
                          Chưa có HKD
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() =>
                          setTeacherForm({
                            id: t.id,
                            group_id: t.group_id,
                            full_name: t.full_name,
                            phone: t.phone || '',
                            has_business_household: t.has_business_household,
                            license_plate: t.vehicle?.license_plate || '',
                            vehicle_class: t.vehicle?.vehicle_class || 'B2',
                            max_quota: t.vehicle?.max_quota || 5,
                          })
                        }
                        className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(t.id, t.full_name)}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BẢNG 2: SỬA NHÓM GIÁO VIÊN */}
      {(subTab === 'all' || subTab === 'groups') && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {groupForm.id
                  ? `Đang Sửa Nhóm Giáo Viên #${groupForm.id}`
                  : 'Bảng 2: Quản Lý & Nhập Dữ Liệu Nhóm Giáo Viên'}
              </h3>
              {renderTableExcelActions('groups', 'Bảng Nhóm GV')}
            </div>
            <form onSubmit={handleSaveGroup} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Nhóm Giáo Viên *</label>
                <input
                  type="text"
                  required
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="Tên nhóm..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Hộ Kinh Doanh</label>
                <input
                  type="text"
                  value={groupForm.business_household_info}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, business_household_info: e.target.value })
                  }
                  placeholder="HKD-ST-..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng Thái HKD</label>
                <select
                  value={groupForm.has_business_household ? '1' : '0'}
                  onChange={(e) =>
                    setGroupForm({ ...groupForm, has_business_household: e.target.value === '1' })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="1">Đã có Hộ Kinh Doanh</option>
                  <option value="0">Chưa có Hộ Kinh Doanh</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg"
                >
                  {groupForm.id ? 'Cập Nhật Nhóm' : '+ Thêm Nhóm'}
                </button>
                {groupForm.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setGroupForm({
                        id: null,
                        name: '',
                        has_business_household: true,
                        business_household_info: '',
                        notes: '',
                      })
                    }
                    className="px-3 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3">ID</th>
                  <th className="p-3">Tên Nhóm Giáo Viên</th>
                  <th className="p-3">Hộ Kinh Doanh</th>
                  <th className="p-3">Mã HKD</th>
                  <th className="p-3">Số Giáo Viên</th>
                  <th className="p-3">Số Khóa Bỏ Qua Liên Tiếp</th>
                  <th className="p-3 text-right">Sửa / Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {groups.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">#{g.id}</td>
                    <td className="p-3 font-bold text-slate-900">{g.name}</td>
                    <td className="p-3">
                      {g.has_business_household ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                          Đã có HKD
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">
                          Chưa có HKD
                        </span>
                      )}
                    </td>
                    <td className="p-3">{g.business_household_info || '-'}</td>
                    <td className="p-3 font-semibold">{g.teacher_count} GV</td>
                    <td className="p-3 font-bold text-red-600">{g.consecutive_missed_courses} khóa</td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() =>
                          setGroupForm({
                            id: g.id,
                            name: g.name,
                            has_business_household: g.has_business_household,
                            business_household_info: g.business_household_info || '',
                            notes: g.notes || '',
                          })
                        }
                        className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(g.id, g.name)}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BẢNG 3: SỬA KHÓA KHAI GIẢNG */}
      {(subTab === 'all' || subTab === 'courses') && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {courseForm.id
                  ? `Đang Sửa Khóa Khai Giảng #${courseForm.id}`
                  : 'Bảng 3: Quản Lý & Nhập Dữ Liệu Khóa (Ngày) Khai Giảng'}
              </h3>
              {renderTableExcelActions('courses', 'Bảng Khóa Khai Giảng')}
            </div>
            <form onSubmit={handleSaveCourse} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Khóa Khai Giảng *</label>
                <input
                  type="text"
                  required
                  value={courseForm.course_name}
                  onChange={(e) => setCourseForm({ ...courseForm, course_name: e.target.value })}
                  placeholder="Khóa K05..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Ngày Khai Giảng *</span>
                  <span className="text-[10px] font-normal text-slate-400">dd/mm/yyyy</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={courseForm.opening_date}
                    onChange={(e) => setCourseForm({ ...courseForm, opening_date: e.target.value })}
                    placeholder="VD: 16/11/2026"
                    className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-blue-600">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="date"
                    tabIndex={-1}
                    value={toISODate(courseForm.opening_date)}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, opening_date: formatDateVN(e.target.value) })
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 cursor-pointer"
                    title="Chọn ngày khai giảng từ lịch"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Ngày Bế Giảng</span>
                  <span className="text-[10px] font-normal text-slate-400">dd/mm/yyyy</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={courseForm.closing_date || ''}
                    onChange={(e) => setCourseForm({ ...courseForm, closing_date: e.target.value })}
                    placeholder="VD: 20/02/2027"
                    className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-purple-600">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="date"
                    tabIndex={-1}
                    value={toISODate(courseForm.closing_date)}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, closing_date: formatDateVN(e.target.value) })
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 cursor-pointer"
                    title="Chọn ngày bế giảng từ lịch"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú</label>
                <input
                  type="text"
                  value={courseForm.notes}
                  onChange={(e) => setCourseForm({ ...courseForm, notes: e.target.value })}
                  placeholder="Ghi chú..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg"
                >
                  {courseForm.id ? 'Cập Nhật Khóa' : '+ Thêm Khóa'}
                </button>
                {courseForm.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setCourseForm({ id: null, course_name: '', opening_date: '', closing_date: '', notes: '' })
                    }
                    className="px-3 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3">ID</th>
                  <th className="p-3">Tên Khóa Khai Giảng</th>
                  <th className="p-3">Ngày Khai Giảng</th>
                  <th className="p-3">Ngày Bế Giảng</th>
                  <th className="p-3">Tổng Học Viên</th>
                  <th className="p-3">Ghi Chú</th>
                  <th className="p-3 text-right">Sửa / Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">#{c.id}</td>
                    <td className="p-3 font-bold text-slate-900">{c.course_name}</td>
                    <td className="p-3 font-bold text-blue-700 whitespace-nowrap">{formatDateVN(c.opening_date)}</td>
                    <td className="p-3 font-bold text-purple-800 whitespace-nowrap">
                      {c.closing_date ? formatDateVN(c.closing_date) : '-'}
                    </td>
                    <td className="p-3 font-bold">{c.total_students} HV</td>
                    <td className="p-3 text-slate-600">{c.notes || '-'}</td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() =>
                          setCourseForm({
                            id: c.id,
                            course_name: c.course_name,
                            opening_date: formatDateVN(c.opening_date),
                            closing_date: c.closing_date ? formatDateVN(c.closing_date) : '',
                            notes: c.notes || '',
                          })
                        }
                        className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(c.id, c.course_name)}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BẢNG 4: SỬA BẢN GHI LÊN KHÓA */}
      {(subTab === 'all' || subTab === 'allocations') && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {allocForm.id
                  ? `Đang Chỉnh Sửa Bản Ghi Lên Khóa #${allocForm.id}`
                  : 'Bảng 4: Quản Lý & Nhập Dữ Liệu Bản Ghi Lên Khóa'}
              </h3>
              {renderTableExcelActions('allocations', 'Bảng Lên Khóa')}
            </div>
            <form onSubmit={handleSaveAllocation} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Khóa Khai Giảng *</label>
                <select
                  value={allocForm.course_id || courses[0]?.id || ''}
                  onChange={(e) => setAllocForm({ ...allocForm, course_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatDateVN(c.opening_date)} — {c.course_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Giáo Viên & Xe *</label>
                <select
                  value={allocForm.teacher_id || teachers[0]?.id || ''}
                  onChange={(e) => setAllocForm({ ...allocForm, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.vehicle?.license_plate})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số Học Viên Lên *</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={allocForm.student_count}
                  onChange={(e) => setAllocForm({ ...allocForm, student_count: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày Bế Giảng (dd/mm/yyyy)</label>
                <input
                  type="text"
                  value={allocForm.closing_date || ''}
                  onChange={(e) => setAllocForm({ ...allocForm, closing_date: e.target.value })}
                  placeholder="VD: 20/02/2027"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú</label>
                <input
                  type="text"
                  value={allocForm.notes}
                  onChange={(e) => setAllocForm({ ...allocForm, notes: e.target.value })}
                  placeholder="Ghi chú..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg"
                >
                  {allocForm.id ? 'Cập Nhật Bản Ghi' : '+ Thêm Bản Ghi'}
                </button>
                {allocForm.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setAllocForm({
                        id: null,
                        course_id: courses[0]?.id || '',
                        teacher_id: teachers[0]?.id || '',
                        student_count: 2,
                        closing_date: '',
                        notes: '',
                      })
                    }
                    className="px-3 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3">ID</th>
                  <th className="p-3">Ngày Khai Giảng</th>
                  <th className="p-3">Ngày Bế Giảng</th>
                  <th className="p-3">Khóa</th>
                  <th className="p-3">Giáo Viên & Nhóm</th>
                  <th className="p-3">Biển Số Xe</th>
                  <th className="p-3">Số HV</th>
                  <th className="p-3">Đủ 3 Tuần</th>
                  <th className="p-3">Quay Đầu 6 Tuần</th>
                  <th className="p-3 text-right">Sửa / Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">#{a.id}</td>
                    <td className="p-3 font-bold text-blue-700 whitespace-nowrap">{formatDateVN(a.opening_date)}</td>
                    <td className="p-3 font-bold text-purple-800 whitespace-nowrap">
                      {a.closing_date ? formatDateVN(a.closing_date) : '-'}
                    </td>
                    <td className="p-3 font-semibold">{a.course_name}</td>
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      {a.teacher_name}
                      <div className="text-[11px] font-normal text-slate-500">{a.group_name}</div>
                    </td>
                    <td className="p-3 font-bold whitespace-nowrap">
                      <span className="inline-block whitespace-nowrap px-2.5 py-0.5 bg-amber-300 font-bold rounded border border-slate-800">
                        {a.license_plate}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-700 whitespace-nowrap">{a.student_count} HV</td>
                    <td className="p-3 whitespace-nowrap">
                      {a.student_count < 5 ? (
                        <span className="font-semibold text-blue-800">
                          {formatDateVN(a.next_eligible_date)} (Còn {5 - a.student_count} HV)
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Đã đủ 5 HV (Chờ 6 tuần)</span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-emerald-800 whitespace-nowrap">
                      {formatDateVN(a.turnaround_date)}
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        onClick={() =>
                          setAllocForm({
                            id: a.id,
                            course_id: a.course_id,
                            teacher_id: a.teacher_id,
                            student_count: a.student_count,
                            closing_date: a.closing_date ? formatDateVN(a.closing_date) : '',
                            notes: a.notes || '',
                          })
                        }
                        className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteAllocation(a.id)}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

