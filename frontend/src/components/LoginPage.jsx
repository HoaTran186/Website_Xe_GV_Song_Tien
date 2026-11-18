import React, { useState } from 'react';
import { Car, Lock, User, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.login({ username: username.trim(), password });
      localStorage.setItem('auth_token', data.token);
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Tiêu đề */}
        <div className="text-center mb-6">
          <div className="inline-flex p-2 bg-white rounded-3xl shadow-2xl mb-3 border-2 border-amber-400">
            <img
              src="/logo-song-tien.jpg"
              alt="Logo Trung Tâm Sông Tiền"
              className="w-24 h-24 object-contain rounded-2xl"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            Trung Tâm Sông Tiền
          </h1>
          <p className="text-xs text-blue-200 mt-1">
            Trung Tâm GDNN Đào Tạo & Sát Hạch Lái Xe Sông Tiền
          </p>
        </div>

        {/* Khung Đăng Nhập */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold text-slate-900">
              Đăng Nhập Vào Hệ Thống
            </h2>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-xl text-xs font-semibold text-red-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên Đăng Nhập
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="VD: admin hoặc user1"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mật Khẩu
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <span>Đăng Nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          Chỉ Quản Trị Viên (Admin) mới có quyền tạo thêm tài khoản và phân quyền vào trang Quản Trị.
        </p>
      </div>
    </div>
  );
}
