import React from 'react';
import {
  Car,
  CalendarCheck,
  Users,
  AlertTriangle,
  ShieldAlert,
  ArrowLeft,
  Database,
  Lock,
  LogOut,
} from 'lucide-react';

export default function Navbar({
  portal,
  setPortal,
  activeTab,
  setActiveTab,
  attentionCount,
  currentUser,
  onLogout,
}) {
  const userTabs = [
    {
      id: 'allocations',
      label: '1. Lên Khóa & Định Mức (3T/6T)',
      icon: CalendarCheck,
    },
    {
      id: 'search',
      label: '2. Tra Cứu Biển Số Xe',
      icon: Car,
    },
    {
      id: 'teachers',
      label: '3. Nhóm GV, Giáo Viên & Xe',
      icon: Users,
    },
    {
      id: 'attention',
      label: '4. Cần Chú Ý (Vắng 3 Khóa)',
      icon: AlertTriangle,
      badge: attentionCount,
    },
  ];

  const handlePortalSwitch = (targetPortal) => {
    setPortal(targetPortal);
    if (targetPortal === 'admin') {
      window.history.pushState({}, '', '/admin');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <header
      className={`${
        portal === 'admin'
          ? 'bg-slate-900 border-b border-slate-800'
          : 'bg-blue-900'
      } text-white shadow-lg sticky top-0 z-50 transition-colors`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-md border border-amber-300/40 shrink-0 flex items-center justify-center">
            <img
              src="/logo-song-tien.jpg"
              alt="Logo Trung Tâm Sông Tiền"
              className="w-10 h-10 object-contain rounded-lg"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">
                {portal === 'admin'
                  ? 'TRUNG TÂM SÔNG TIỀN — TRANG QUẢN TRỊ ADMIN'
                  : 'TRUNG TÂM GDNN ĐÀO TẠO & SÁT HẠCH LÁI XE SÔNG TIỀN'}
              </h1>
              {portal === 'admin' && (
                <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[11px] rounded uppercase tracking-wider">
                  Admin Portal
                </span>
              )}
            </div>
            <p className="text-xs text-blue-200">
              {portal === 'admin'
                ? 'Khu vực quản trị cấp cao: Thêm • Sửa • Xóa Nhóm, Giáo viên, Xe, Khóa và Lịch sử dữ liệu'
                : '1 Xe 1 GV = 5 HV • Chờ 3 tuần lên tiếp • 6 tuần quay đầu • Cảnh báo Hộ Kinh Doanh • Tra cứu nhanh'}
            </p>
          </div>
        </div>

        {/* Thông tin Người dùng, Nút chuyển Portal & Đăng xuất */}
        <div className="flex items-center gap-2.5">
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/25 rounded-xl border border-white/10 text-xs">
              <div className="text-right">
                <div className="font-bold text-white flex items-center gap-1.5 justify-end">
                  <span>{currentUser.full_name}</span>
                  {currentUser.role === 'admin' ? (
                    <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded">
                      👑 Admin
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-blue-500 text-white font-bold text-[10px] rounded">
                      👤 Người Dùng
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-blue-200 font-mono">@{currentUser.username}</div>
              </div>
            </div>
          )}

          {/* Nút chuyển sang Admin (Chỉ hoạt động cho Admin) */}
          {currentUser?.role === 'admin' ? (
            portal === 'admin' ? (
              <button
                onClick={() => handlePortalSwitch('user')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Về Trang Chính</span>
              </button>
            ) : (
              <button
                onClick={() => handlePortalSwitch('admin')}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition hover:border-amber-400 cursor-pointer"
                title="Chuyển sang trang web Quản trị Admin riêng biệt"
              >
                <Database className="w-4 h-4 text-amber-400" />
                <span>Vào Web Admin →</span>
              </button>
            )
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-black/20 rounded-xl text-xs text-slate-300 border border-white/5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Không có quyền Admin</span>
            </div>
          )}

          {/* Nút Đăng Xuất */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-slate-300 hover:text-white hover:bg-red-600/80 rounded-xl border border-white/10 transition cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Thanh Tabs nghiệp vụ (Chỉ hiện khi ở Trang Người Dùng) */}
      {portal === 'user' && (
        <div className="bg-blue-950/80 border-t border-blue-800">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-1.5 py-2">
            {userTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-blue-900/70 text-blue-100 hover:bg-blue-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold bg-red-600 text-white rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
