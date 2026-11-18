import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import AttentionBanner from './components/AttentionBanner';
import CourseAllocationTab from './components/CourseAllocationTab';
import TeacherGroupTab from './components/TeacherGroupTab';
import VehicleSearchTab from './components/VehicleSearchTab';
import AdminDataManagerTab from './components/AdminDataManagerTab';
import LoginPage from './components/LoginPage';
import { api } from './api/client';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function App() {
  // Trạng thái Người dùng đang đăng nhập
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Cổng giao diện: 'user' (Trang chính lên khóa & tra cứu) | 'admin' (Trang web quản trị riêng biệt)
  const initialPortal =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/admin') || window.location.hash.includes('admin'))
      ? 'admin'
      : 'user';

  const [portal, setPortal] = useState(initialPortal);
  const [activeTab, setActiveTab] = useState('allocations');

  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [attentionReport, setAttentionReport] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Kiểm tra phiên đăng nhập khi mở trang
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const res = await api.getMe();
        setCurrentUser(res.user);
      } catch (err) {
        localStorage.removeItem('auth_token');
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  // Đồng bộ với nút Back/Forward của trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      const isAdmin =
        window.location.pathname.startsWith('/admin') || window.location.hash.includes('admin');
      setPortal(isAdmin ? 'admin' : 'user');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const loadAllData = useCallback(async (isFirst = false) => {
    if (!currentUser) return;
    if (isFirst) {
      setInitialLoading(true);
    }
    try {
      const [coursesData, groupsData, teachersData, attentionData] = await Promise.all([
        api.getCourses(),
        api.getGroups(),
        api.getTeachers(),
        api.getAttentionGroups(),
      ]);
      setCourses(coursesData);
      setGroups(groupsData);
      setTeachers(teachersData);
      setAttentionReport(attentionData);

      if (!selectedCourseId && coursesData.length > 0) {
        setSelectedCourseId(coursesData[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
    } finally {
      setInitialLoading(false);
    }
  }, [selectedCourseId, currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadAllData(true);
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (_) {}
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
    setPortal('user');
    window.history.pushState({}, '', '/');
  };

  const navigateToPortal = (targetPortal) => {
    setPortal(targetPortal);
    if (targetPortal === 'admin') {
      window.history.pushState({}, '', '/admin');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  // Đang kiểm tra phiên đăng nhập
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        Đang khởi động hệ thống Sông Tiền...
      </div>
    );
  }

  // Chưa đăng nhập -> Hiển thị Trang Đăng Nhập
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    );
  }

  const attentionCount = attentionReport?.attention_groups?.length || 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar
        portal={portal}
        setPortal={setPortal}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        attentionCount={attentionCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {initialLoading && courses.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-500 shadow-sm border border-slate-200">
            Đang tải dữ liệu hệ thống Quản lý Xe & Giáo viên Sông Tiền...
          </div>
        ) : portal === 'admin' ? (
          /* =========================================================
             WEB ADMIN: CHỈ ADMIN MỚI ĐƯỢC PHÉP TRUY CẬP
             ========================================================= */
          currentUser.role !== 'admin' ? (
            <div className="bg-white rounded-2xl p-8 border-2 border-red-300 shadow-md text-center max-w-lg mx-auto my-12 space-y-4">
              <div className="inline-flex p-3 bg-red-100 text-red-700 rounded-full">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h2 className="text-lg font-black text-red-900 uppercase">
                Truy Cập Bị Từ Chối (403 Forbidden)
              </h2>
              <p className="text-sm text-slate-700">
                Tài khoản <strong>{currentUser.full_name} (@{currentUser.username})</strong> là tài khoản <strong>Người Dùng</strong> và chưa được Admin cấp quyền quản trị hệ thống.
              </p>
              <p className="text-xs text-slate-500">
                Chỉ có tài khoản được cấp quyền <strong>Quản Trị Viên (Admin)</strong> mới được phép truy cập trang này. Vui lòng liên hệ Admin để được cấp quyền.
              </p>
              <div>
                <button
                  onClick={() => navigateToPortal('user')}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Quay Lại Trang Nghiệp Vụ Chính</span>
                </button>
              </div>
            </div>
          ) : (
            <AdminDataManagerTab
              groups={groups}
              teachers={teachers}
              courses={courses}
              onRefreshAll={loadAllData}
              onBackToUser={() => navigateToPortal('user')}
            />
          )
        ) : (
          /* =========================================================
             TRANG CHÍNH: NGHIỆP VỤ LÊN KHÓA & TRA CỨU THEO TỪNG TAB
             ========================================================= */
          <>
            {activeTab !== 'attention' && (
              <AttentionBanner
                attentionReport={attentionReport}
                compact
                onOpenFullTab={() => setActiveTab('attention')}
              />
            )}
            {activeTab === 'allocations' && (
              <CourseAllocationTab
                courses={courses}
                selectedCourseId={selectedCourseId}
                setSelectedCourseId={setSelectedCourseId}
                onRefreshAll={loadAllData}
              />
            )}
            {activeTab === 'search' && <VehicleSearchTab />}
            {activeTab === 'teachers' && (
              <TeacherGroupTab
                groups={groups}
                teachers={teachers}
                onRefresh={loadAllData}
              />
            )}
            {activeTab === 'attention' && (
              <AttentionBanner attentionReport={attentionReport} compact={false} />
            )}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        Hệ Thống Quản Lý Xe, Giáo Viên & Khai Giảng Sông Tiền • Đăng nhập với tư cách: <strong className="text-slate-800">{currentUser.full_name} ({currentUser.role === 'admin' ? 'Quản Trị Viên' : 'Người Dùng'})</strong>
      </footer>
    </div>
  );
}
