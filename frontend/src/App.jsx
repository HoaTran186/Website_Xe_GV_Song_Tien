import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import AttentionBanner from './components/AttentionBanner';
import CourseAllocationTab from './components/CourseAllocationTab';
import TeacherGroupTab from './components/TeacherGroupTab';
import VehicleSearchTab from './components/VehicleSearchTab';
import AdminDataManagerTab from './components/AdminDataManagerTab';
import { api } from './api/client';

export default function App() {
  // Mặc định hiển thị TẤT CẢ tính năng trên cùng 1 trang ('single-page')
  const [viewMode, setViewMode] = useState('single-page');
  const [activeTab, setActiveTab] = useState('allocations');

  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [attentionReport, setAttentionReport] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
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
      setLoading(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    loadAllData();
  }, []);

  const attentionCount = attentionReport?.attention_groups?.length || 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        attentionCount={attentionCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-500 shadow-sm border border-slate-200">
            Đang tải dữ liệu hệ thống Quản lý Xe & Giáo viên Sông Tiền...
          </div>
        ) : viewMode === 'single-page' ? (
          <div className="space-y-10">
            {/* Banner cảnh báo nhanh trên đầu trang */}
            <AttentionBanner
              attentionReport={attentionReport}
              compact
              onOpenFullTab={() => {
                const el = document.querySelector('#section-attention');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* PHẦN 1: TRA CỨU BIỂN SỐ XE & NGÀY KHAI GIẢNG */}
            <section id="section-search" className="scroll-mt-32 space-y-3">
              <div className="flex items-center gap-2 border-b-2 border-blue-900 pb-2">
                <span className="px-3 py-1 bg-blue-900 text-amber-300 font-black text-xs rounded-lg">
                  PHẦN 1
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 uppercase">
                  Tra Cứu Biển Số Xe & Lịch Sử Ngày Khai Giảng
                </h2>
              </div>
              <VehicleSearchTab />
            </section>

            {/* PHẦN 2: LÊN KHÓA KHAI GIẢNG & THEO DÕI ĐỊNH MỨC 5 HV (3 TUẦN / 6 TUẦN) */}
            <section id="section-allocations" className="scroll-mt-32 space-y-3">
              <div className="flex items-center gap-2 border-b-2 border-blue-900 pb-2">
                <span className="px-3 py-1 bg-blue-900 text-amber-300 font-black text-xs rounded-lg">
                  PHẦN 2
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 uppercase">
                  Lên Khóa Khai Giảng, Tính Số Lượng Còn Lại (3 Tuần / 6 Tuần) & Cảnh Báo Hộ Kinh Doanh
                </h2>
              </div>
              <CourseAllocationTab
                courses={courses}
                selectedCourseId={selectedCourseId}
                setSelectedCourseId={setSelectedCourseId}
                onRefreshAll={loadAllData}
              />
            </section>

            {/* PHẦN 3: NHẬP NHÓM GIÁO VIÊN, GIÁO VIÊN, XE & HỘ KINH DOANH */}
            <section id="section-teachers" className="scroll-mt-32 space-y-3">
              <div className="flex items-center gap-2 border-b-2 border-blue-900 pb-2">
                <span className="px-3 py-1 bg-blue-900 text-amber-300 font-black text-xs rounded-lg">
                  PHẦN 3
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 uppercase">
                  Quản Lý Nhóm Giáo Viên, Nhập Giáo Viên Thuộc Nhóm, Xe & Hộ Kinh Doanh
                </h2>
              </div>
              <TeacherGroupTab
                groups={groups}
                teachers={teachers}
                onRefresh={loadAllData}
              />
            </section>

            {/* PHẦN 4: DANH SÁCH CẦN CHÚ Ý (BỎ QUA 3 KHÓA KHAI GIẢNG) */}
            <section id="section-attention" className="scroll-mt-32 space-y-3">
              <div className="flex items-center gap-2 border-b-2 border-red-700 pb-2">
                <span className="px-3 py-1 bg-red-700 text-white font-black text-xs rounded-lg">
                  PHẦN 4
                </span>
                <h2 className="text-lg font-extrabold text-red-900 uppercase">
                  Danh Sách Nhóm Giáo Viên Cần Chú Ý (Bỏ Qua ≥ 3 Khóa Khai Giảng)
                </h2>
              </div>
              <AttentionBanner attentionReport={attentionReport} compact={false} />
            </section>

            {/* PHẦN 5: QUẢN TRỊ DỮ LIỆU TOÀN DIỆN CHO ADMIN (THÊM • SỬA • XÓA) */}
            <section id="section-admin" className="scroll-mt-32 space-y-3">
              <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-2">
                <span className="px-3 py-1 bg-slate-900 text-amber-400 font-black text-xs rounded-lg">
                  PHẦN 5
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 uppercase">
                  Bảng Quản Trị Dữ Liệu Toàn Diện Cho Admin (Thêm • Sửa • Xóa Mọi Bảng)
                </h2>
              </div>
              <AdminDataManagerTab
                groups={groups}
                teachers={teachers}
                courses={courses}
                onRefreshAll={loadAllData}
              />
            </section>
          </div>
        ) : (
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
            {activeTab === 'teachers' && (
              <TeacherGroupTab
                groups={groups}
                teachers={teachers}
                onRefresh={loadAllData}
              />
            )}
            {activeTab === 'search' && <VehicleSearchTab />}
            {activeTab === 'attention' && (
              <AttentionBanner attentionReport={attentionReport} compact={false} />
            )}
            {activeTab === 'admin' && (
              <AdminDataManagerTab
                groups={groups}
                teachers={teachers}
                courses={courses}
                onRefreshAll={loadAllData}
              />
            )}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        Hệ Thống Quản Lý Xe, Giáo Viên & Khai Giảng Sông Tiền • Xây dựng theo chuẩn GitHub Spec Kit (Node.js + React)
      </footer>
    </div>
  );
}
