import { useState } from 'react';
import { getUser, setSession, type SessionUser } from './api';
import type { View } from './types';
import HomePage from './pages/HomePage';
import HotelDetailPage from './pages/HotelDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import MyBookingsPage from './pages/MyBookingsPage';
import WishlistPage from './pages/WishlistPage';
import AuthPage from './pages/AuthPage';
import PartnerPage from './pages/PartnerPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' });
  const [user, setUser] = useState<SessionUser | null>(getUser());
  const go = (v: View) => { setView(v); window.scrollTo({ top: 0 }); };

  function logout() {
    setSession(null, null);
    setUser(null);
    go({ name: 'home' });
  }

  const navBtn = "px-3 py-1.5 rounded-lg hover:bg-sea-700 text-sm";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-sea-900 text-white sticky top-0 z-10 shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 flex-wrap">
          <button onClick={() => go({ name: 'home' })} className="text-xl font-bold tracking-tight mr-3">
            Hotelora<span className="text-amber-400">.</span>
          </button>
          <nav className="flex items-center gap-1 flex-wrap">
            <button className={navBtn} onClick={() => go({ name: 'home' })}>Tìm khách sạn</button>
            {user && <button className={navBtn} onClick={() => go({ name: 'bookings' })}>Đặt phòng của tôi</button>}
            {user && <button className={navBtn} onClick={() => go({ name: 'wishlist' })}>Yêu thích</button>}
            {user?.role === 'PARTNER' && <button className={navBtn} onClick={() => go({ name: 'partner' })}>Kênh đối tác</button>}
            {user?.role === 'ADMIN' && <button className={navBtn} onClick={() => go({ name: 'admin' })}>Quản trị sàn</button>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user
              ? <>
                  <span className="text-sm text-sea-100">Xin chào, {user.name} ({user.role})</span>
                  <button className={navBtn} onClick={logout}>Đăng xuất</button>
                </>
              : <button className="bg-amber-400 text-slate-900 font-medium px-4 py-1.5 rounded-lg text-sm" onClick={() => go({ name: 'auth' })}>Đăng nhập</button>}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 w-full grow">
        {view.name === 'home' && <HomePage go={go} isLoggedIn={!!user} />}
        {view.name === 'hotel' && <HotelDetailPage hotelId={view.hotelId} go={go} isLoggedIn={!!user} />}
        {view.name === 'checkout' && <CheckoutPage booking={view.booking} go={go} />}
        {view.name === 'bookings' && <MyBookingsPage go={go} />}
        {view.name === 'wishlist' && <WishlistPage go={go} />}
        {view.name === 'auth' && <AuthPage onAuth={setUser} go={go} />}
        {view.name === 'partner' && <PartnerPage />}
        {view.name === 'admin' && <AdminPage />}
      </main>

      <footer className="bg-sea-900 text-sea-100 text-sm">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-wrap gap-2 justify-between">
          <p>Hotelora — nền tảng đặt phòng đa khách sạn. Đồ án môn Công nghệ Web, HUIT.</p>
          <p>Thanh toán trên hệ thống là mô phỏng, không thu tiền thật.</p>
        </div>
      </footer>
    </div>
  );
}
