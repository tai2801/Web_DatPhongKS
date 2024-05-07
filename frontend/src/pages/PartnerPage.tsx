import { useEffect, useState } from 'react';
import { api, fmtVnd, STATUS_LABELS } from '../api';
import type { Hotel, Booking, Review } from '../types';

export default function PartnerPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [revenue, setRevenue] = useState<any>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [newHotel, setNewHotel] = useState({ name: '', city: '', address: '', stars: 3, description: '' });
  const [rtForm, setRtForm] = useState<Record<string, { name: string; basePrice: number; maxGuests: number; totalRooms: number; freeCancelDays: number; lateRefundPercent: number }>>({});
  const [replies, setReplies] = useState<Record<string, string>>({});

  async function load() {
    try {
      const [h, b, r, rev] = await Promise.all([
        api<{ results: Hotel[] }>('/api/partner/hotels'),
        api<{ results: Booking[] }>('/api/partner/bookings'),
        api<{ results: Review[] }>('/api/partner/reviews'),
        api<any>('/api/partner/revenue'),
      ]);
      setHotels(h.results); setBookings(b.results); setReviews(r.results); setRevenue(rev);
    } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function createHotel() {
    try {
      await api('/api/partner/hotels', { method: 'POST', bodyObj: { ...newHotel, amenities: ['wifi', 'breakfast'] } });
      setMsg('Đã đăng ký khách sạn mới — đang chờ admin nền tảng duyệt.');
      setNewHotel({ name: '', city: '', address: '', stars: 3, description: '' });
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function addRoomType(hotelId: string) {
    const f = rtForm[hotelId];
    if (!f?.name || !f?.basePrice) { setError('Nhập tên và giá cho loại phòng.'); return; }
    try {
      await api(`/api/partner/hotels/${hotelId}/room-types`, {
        method: 'POST',
        bodyObj: {
          name: f.name, basePrice: f.basePrice, maxGuests: f.maxGuests || 2, totalRooms: f.totalRooms || 1,
          cancelPolicy: { freeCancelDays: f.freeCancelDays || 1, lateRefundPercent: f.lateRefundPercent ?? 50, nonRefundable: false },
        },
      });
      setMsg('Đã thêm loại phòng.');
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function transition(id: string, action: 'checkin' | 'checkout') {
    try {
      await api(`/api/partner/bookings/${id}/${action}`, { method: 'POST', bodyObj: {} });
      setMsg(action === 'checkin' ? 'Đã xác nhận khách nhận phòng.' : 'Đã xác nhận khách trả phòng.');
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function reply(reviewId: string) {
    try {
      await api(`/api/partner/reviews/${reviewId}/reply`, { method: 'PUT', bodyObj: { reply: replies[reviewId] || '' } });
      setMsg('Đã gửi phản hồi đánh giá.');
      load();
    } catch (e: any) { setError(e.message); }
  }

  if (error && hotels.length === 0) return <p className="text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Kênh đối tác khách sạn</h1>
      {msg && <p className="mb-3 text-sm bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2">{msg}</p>}
      {error && <p className="mb-3 text-sm bg-red-50 text-red-600 rounded-lg px-3 py-2">{error}</p>}

      {revenue && (
        <div className="grid md:grid-cols-4 gap-3 mb-6">
          {[
            ['Tổng doanh thu', revenue.gross], ['Hoa hồng sàn (10%)', revenue.commission],
            ['Đã hoàn khách', revenue.refundTotal], ['Thực nhận', revenue.netReceived],
          ].map(([label, v]) => (
            <div key={label as string} className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-xl font-bold text-sea-700">{fmtVnd(v as number)}</p>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-lg mb-2">Khách sạn của tôi</h2>
      <div className="space-y-3 mb-6">
        {hotels.map((h) => {
          const f = rtForm[h.id] || { name: '', basePrice: 0, maxGuests: 2, totalRooms: 1, freeCancelDays: 1, lateRefundPercent: 50 };
          const set = (patch: Partial<typeof f>) => setRtForm((s) => ({ ...s, [h.id]: { ...f, ...patch } }));
          return (
            <div key={h.id} className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="font-semibold">{h.name} <span className="text-xs bg-sea-100 text-sea-700 px-2 py-0.5 rounded-full">{STATUS_LABELS[h.status] || h.status}</span></p>
              <p className="text-sm text-slate-500">{h.city} · {h.address} · {h.roomTypeCount} loại phòng</p>
              <details className="mt-2">
                <summary className="text-sm text-sea-700 cursor-pointer">Thêm loại phòng</summary>
                <div className="flex flex-wrap gap-2 mt-2">
                  <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Tên loại phòng" className="border rounded-lg px-2 py-1.5 text-sm" />
                  <input type="number" value={f.basePrice || ''} onChange={(e) => set({ basePrice: Number(e.target.value) })} placeholder="Giá gốc/đêm" className="border rounded-lg px-2 py-1.5 text-sm w-32" />
                  <input type="number" value={f.maxGuests} onChange={(e) => set({ maxGuests: Number(e.target.value) })} placeholder="Khách/phòng" className="border rounded-lg px-2 py-1.5 text-sm w-28" />
                  <input type="number" value={f.totalRooms} onChange={(e) => set({ totalRooms: Number(e.target.value) })} placeholder="Số phòng" className="border rounded-lg px-2 py-1.5 text-sm w-24" />
                  <input type="number" value={f.freeCancelDays} onChange={(e) => set({ freeCancelDays: Number(e.target.value) })} placeholder="Ngày hủy miễn phí" className="border rounded-lg px-2 py-1.5 text-sm w-36" />
                  <input type="number" value={f.lateRefundPercent} onChange={(e) => set({ lateRefundPercent: Number(e.target.value) })} placeholder="% hoàn khi hủy trễ" className="border rounded-lg px-2 py-1.5 text-sm w-36" />
                  <button onClick={() => addRoomType(h.id)} className="bg-sea-600 text-white rounded-lg px-3 py-1.5 text-sm">Thêm</button>
                </div>
              </details>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6">
        <h3 className="font-semibold mb-2">Đăng ký khách sạn mới</h3>
        <div className="grid md:grid-cols-2 gap-2">
          <input value={newHotel.name} onChange={(e) => setNewHotel({ ...newHotel, name: e.target.value })} placeholder="Tên khách sạn" className="border rounded-lg px-3 py-2" />
          <input value={newHotel.city} onChange={(e) => setNewHotel({ ...newHotel, city: e.target.value })} placeholder="Thành phố (VD: Nha Trang)" className="border rounded-lg px-3 py-2" />
          <input value={newHotel.address} onChange={(e) => setNewHotel({ ...newHotel, address: e.target.value })} placeholder="Địa chỉ" className="border rounded-lg px-3 py-2" />
          <input type="number" min={1} max={5} value={newHotel.stars} onChange={(e) => setNewHotel({ ...newHotel, stars: Number(e.target.value) })} placeholder="Hạng sao" className="border rounded-lg px-3 py-2" />
        </div>
        <textarea value={newHotel.description} onChange={(e) => setNewHotel({ ...newHotel, description: e.target.value })} placeholder="Mô tả khách sạn" className="border rounded-lg px-3 py-2 w-full mt-2" />
        <button onClick={createHotel} className="mt-2 bg-sea-600 text-white rounded-lg px-4 py-2 text-sm font-medium">Gửi đăng ký (chờ duyệt)</button>
      </div>

      <h2 className="font-semibold text-lg mb-2">Đặt phòng tại khách sạn của tôi</h2>
      <div className="space-y-2 mb-6">
        {bookings.length === 0 && <p className="text-slate-500 text-sm">Chưa có đặt phòng nào.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border border-slate-100 p-3 flex flex-wrap justify-between gap-2 items-center">
            <p className="text-sm"><b className="font-mono">{b.code}</b> · {b.guestName} · {b.checkin} → {b.checkout} · {fmtVnd(b.total)} · {STATUS_LABELS[b.status] || b.status}</p>
            <div className="flex gap-2">
              {b.status === 'CONFIRMED' && <button onClick={() => transition(b.id, 'checkin')} className="bg-sea-600 text-white rounded-lg px-3 py-1.5 text-sm">Xác nhận check-in</button>}
              {b.status === 'CHECKED_IN' && <button onClick={() => transition(b.id, 'checkout')} className="bg-amber-500 text-white rounded-lg px-3 py-1.5 text-sm">Xác nhận check-out</button>}
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-lg mb-2">Đánh giá của khách</h2>
      <div className="space-y-2">
        {reviews.length === 0 && <p className="text-slate-500 text-sm">Chưa có đánh giá.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-100 p-3">
            <p className="text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
            <p className="text-sm">{r.comment}</p>
            {r.partnerReply
              ? <p className="text-sm mt-1 bg-sea-50 rounded px-2 py-1"><b>Phản hồi:</b> {r.partnerReply}</p>
              : <div className="flex gap-2 mt-2">
                  <input value={replies[r.id] || ''} onChange={(e) => setReplies((s) => ({ ...s, [r.id]: e.target.value }))} placeholder="Phản hồi của khách sạn…" className="border rounded-lg px-2 py-1.5 text-sm grow" />
                  <button onClick={() => reply(r.id)} className="bg-sea-600 text-white rounded-lg px-3 py-1.5 text-sm">Gửi phản hồi</button>
                </div>}
          </div>
        ))}
      </div>
    </div>
  );
}
