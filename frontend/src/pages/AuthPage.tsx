import { useState } from 'react';
import { api, setSession, type SessionUser } from '../api';

interface Props { onAuth: (u: SessionUser) => void; go: (v: any) => void }

export default function AuthPage({ onAuth, go }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('GUEST');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError('');
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { email, password } : { name, email, password, phone, role };
      const r = await api<{ token: string; user: SessionUser }>(path, { method: 'POST', bodyObj: body });
      setSession(r.token, r.user);
      onAuth(r.user);
      go({ name: r.user.role === 'ADMIN' ? 'admin' : r.user.role === 'PARTNER' ? 'partner' : 'home' });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-100 p-6">
      <h1 className="text-xl font-bold mb-1">{mode === 'login' ? 'Đăng nhập Hotelora' : 'Tạo tài khoản Hotelora'}</h1>
      <p className="text-sm text-slate-500 mb-4">
        Tài khoản mẫu — Khách: khach@hotelora.vn / Khach@123 · Đối tác: partner1@hotelora.vn / Partner@123 · Admin: admin@hotelora.vn / Admin@123
      </p>
      {mode === 'register' && (
        <>
          <label className="block text-sm mb-1">Họ tên / Tên doanh nghiệp</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-3" />
          <label className="block text-sm mb-1">Số điện thoại</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-3" />
          <label className="block text-sm mb-1">Loại tài khoản</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-3">
            <option value="GUEST">Khách du lịch</option>
            <option value="PARTNER">Đối tác khách sạn</option>
          </select>
        </>
      )}
      <label className="block text-sm mb-1">Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full border rounded-lg px-3 py-2 mb-3" />
      <label className="block text-sm mb-1">Mật khẩu</label>
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border rounded-lg px-3 py-2 mb-3" />
      {error && <p className="text-red-600 bg-red-50 rounded-lg px-3 py-2 text-sm mb-3">{error}</p>}
      <button disabled={busy} onClick={submit} className="w-full bg-sea-600 hover:bg-sea-700 disabled:bg-slate-300 text-white rounded-lg py-2.5 font-semibold">
        {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
      </button>
      <p className="text-sm text-center mt-3">
        {mode === 'login'
          ? <>Chưa có tài khoản? <button className="text-sea-700 underline" onClick={() => setMode('register')}>Đăng ký</button></>
          : <>Đã có tài khoản? <button className="text-sea-700 underline" onClick={() => setMode('login')}>Đăng nhập</button></>}
      </p>
    </div>
  );
}
