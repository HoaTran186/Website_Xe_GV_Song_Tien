import React from 'react';
import { Car, CalendarCheck, Users, AlertTriangle, Database, LayoutList } from 'lucide-react';

export default function Navbar({
  viewMode,
  setViewMode,
  activeTab,
  setActiveTab,
  attentionCount,
}) {
  const sections = [
    {
      id: 'search',
      anchor: '#section-search',
      label: '1. Tìm Biển Số Xe',
      icon: Car,
    },
    {
      id: 'allocations',
      anchor: '#section-allocations',
      label: '2. Lên Khóa & Định Mức (3T/6T)',
      icon: CalendarCheck,
    },
    {
      id: 'teachers',
      anchor: '#section-teachers',
      label: '3. Nhóm GV, Giáo Viên & HKD',
      icon: Users,
    },
    {
      id: 'attention',
      anchor: '#section-attention',
      label: '4. Danh Sách Cần Chú Ý (Vắng 3 Khóa)',
      icon: AlertTriangle,
      badge: attentionCount,
    },
    {
      id: 'admin',
      anchor: '#section-admin',
      label: '5. Quản Trị Sửa/Xóa Dữ Liệu (Admin)',
      icon: Database,
    },
  ];

  const handleNavClick = (sec) => {
    if (viewMode === 'single-page') {
      const el = document.querySelector(sec.anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      setActiveTab(sec.id);
    }
  };

  return (
    <header className="bg-blue-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-400 text-blue-950 rounded-xl font-bold shadow">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              TRUNG TÂM ĐÀO TẠO XE & GIÁO VIÊN SÔNG TIỀN
            </h1>
            <p className="text-xs text-blue-200">
              1 Xe 1 GV = 5 HV • Chờ 3 tuần lên tiếp phần còn lại • 6 tuần quay đầu • Cảnh báo Hộ Kinh Doanh • Tìm Biển Số Xe • Admin CRUD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setViewMode(viewMode === 'single-page' ? 'tabbed' : 'single-page')
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
              viewMode === 'single-page'
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-blue-800 text-white border-blue-700 hover:bg-blue-700'
            }`}
          >
            <LayoutList className="w-4 h-4" />
            {viewMode === 'single-page'
              ? 'Đang bật: Tất Cả Trên 1 Trang'
              : 'Chuyển sang: Tất Cả Trên 1 Trang'}
          </button>
        </div>
      </div>

      <div className="bg-blue-950/80 border-t border-blue-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-1.5 py-2">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = viewMode === 'tabbed' && activeTab === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => handleNavClick(sec)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'bg-blue-900/70 text-blue-100 hover:bg-blue-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
                {sec.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full">
                    {sec.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
