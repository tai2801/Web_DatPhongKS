import { useEffect, useState } from 'react';
import { api, fmtVnd, AMENITY_LABELS } from '../api';
import type { Hotel, RoomType, Review, Booking } from '../types';

interface Props { hotelId: string; go: (v: any) => void; isLoggedIn: boolean }

export default function HotelDetailPage({ hotelId, go, isLoggedIn }: Props) {
  const [hotel, setHotel] = useState<(Hotel & { roomTypes: RoomType[]; reviews: Review[] }) | null>(null);
  const [error, setError] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [activeImg, setActiveImg] = useState(0);
  const [forms, setForms] = useState<Record<string, { rooms: number; guests: number; promo: string }>>({});
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      const p = new URLSearchParams();
      if (checkin && checkout) { p.set('checkin', checkin); p.set('checkout', checkout); }
      const data = await api(`/api/hotels/${hotelId}?${p.toString()}`);
      setHotel(data);
    } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, [hotelId]);
  useEffect(() => { if (checkin && checkout) load(); }, [checkin, checkout]);

  async function book(rt: RoomType) {
    if (!isLoggedIn) { go({ name: 'auth' }); return; }
    const f = forms[rt.id] || { rooms: 1, guests: 2, promo: '' };
    setBusy(rt.id); setError('');
    try {
      const booking = await api<Booking>('/api/bookings', {
        method: 'POST',
        bodyObj: {
          hotelId, roomTypeId: rt.id, checkin, checkout,
          rooms: f.rooms, guests: f.guests, promoCode: f.promo || undefined,
        },
      });
      go({ name: 'checkout', booking });
    } catch (e: any) { setError(e.message); } finally { setBusy(''); }
  }

  if (error && !hotel) return <p className="text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>;
  if (!hotel) return <p className="text-slate-500">Đang tải thông tin khách sạn…</p>;

  const policyText = (rt: RoomType) => rt.cancelPolicy.nonRefundable
    ? 'Không hoàn hủy'
    : `Hủy miễn phí trước ${rt.cancelPolicy.freeCancelDays} ngày · hủy trễ hoàn ${rt.cancelPolicy.lateRefundPercent}%`;

  return (
    <div>
      <button onClick={() => go({ name: 'home' })} className="text-sea-700 text-sm mb-3">← Quay lại tìm kiếm</button>
      <div className="grid md:grid-cols-3 gap-3 mb-5">
        <img src={hotel.images[activeImg]} alt={hotel.name} className="md:col-span-2 h-72 w-full object-cover rounded-2xl" />
        <div className="grid grid-rows-3 gap-3">
          {hotel.images.map((src, i) => (
            <img key={src} src={src} alt="" onClick={() => setActiveImg(i)}
              className={`h-[5.5rem] w-full object-cover rounded-xl cursor-pointer ${i === activeImg ? 'ring-2 ring-sea-500' : ''}`} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-bold">{hotel.name} <span className="text-amber-500 text-base align-middle">{'★'.repeat(hotel.stars)}</span></h1>
          <p className="text-slate-500 text-sm">{hotel.address}</p>
        </div>
        <p className="text-sm">{hotel.ratingAvg ? <>Đánh giá <b>{hotel.ratingAvg}</b>/5 từ {hotel.ratingCount} khách</> : 'Chưa có đánh giá'}</p>
      </div>
      <p className="mb-3">{hotel.description}</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {hotel.amenities.map((a) => <span key={a} className="bg-sea-50 border border-sea-100 text-sea-700 text-xs px-2 py-1 rounded-full">{AMENITY_LABELS[a] || a}</span>)}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Nhận phòng</label>
          <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} className="border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Trả phòng</label>
          <input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} className="border rounded-lg px-3 py-2" />
        </div>
        <p className="text-sm text-slate-500">Chọn ngày để xem phòng còn trống và giá từng đêm (giá động: cuối tuần ×1.15, mùa cao điểm ×1.3).</p>
      </div>

      {error && <p className="text-red-600 bg-red-50 rounded-lg px-3 py-2 text-sm mb-4">{error}</p>}

      <div className="space-y-4 mb-8">
        {hotel.roomTypes.map((rt) => {
          const f = forms[rt.id] || { rooms: 1, guests: 2, promo: '' };
          const set = (patch: Partial<typeof f>) => setForms((s) => ({ ...s, [rt.id]: { ...f, ...patch } }));
          const soldOut = rt.availableRooms !== undefined && rt.availableRooms <= 0;
          return (
            <div key={rt.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col md:flex-row gap-4">
              <div className="grow">
                <h3 className="font-semibold text-lg">{rt.name}</h3>
                <p className="text-sm text-slate-500">{rt.sizeM2} m² · {rt.bed} · tối đa {rt.maxGuests} khách/phòng · tổng {rt.totalRooms} phòng</p>
                <p className="text-sm mt-1 text-sea-700">{policyText(rt)}</p>
                {rt.quote && (
                  <div className="mt-2 text-sm bg-sea-50 rounded-lg p-2">
                    {rt.quote.nights.map((n) => (
                      <span key={n.date} className="inline-block mr-3">{n.date}: <b>{fmtVnd(n.pricePerRoom)}</b> ({n.kind === 'PEAK' ? 'cao điểm' : n.kind === 'WEEKEND' ? 'cuối tuần' : 'ngày thường'})</span>
                    ))}
                    <p className="mt-1">Tổng {rt.quote.nightCount} đêm: <b>{fmtVnd(rt.quote.subtotal)}</b>/phòng</p>
                  </div>
                )}
                {rt.availableRooms !== undefined && (
                  <p className={`text-sm mt-1 font-medium ${soldOut ? 'text-red-600' : 'text-emerald-600'}`}>
                    {soldOut ? 'Hết phòng trong khoảng ngày này' : `Còn ${rt.availableRooms} phòng trống`}
                  </p>
                )}
              </div>
              <div className="w-full md:w-56 shrink-0 space-y-2">
                <p>Giá gốc từ <b className="text-sea-700">{fmtVnd(rt.basePrice)}</b>/đêm</p>
                <div className="flex gap-2">
                  <input type="number" min={1} value={f.rooms} onChange={(e) => set({ rooms: Number(e.target.value) })} className="w-1/2 border rounded-lg px-2 py-1.5" title="Số phòng" />
                  <input type="number" min={1} value={f.guests} onChange={(e) => set({ guests: Number(e.target.value) })} className="w-1/2 border rounded-lg px-2 py-1.5" title="Số khách" />
                </div>
                <input value={f.promo} onChange={(e) => set({ promo: e.target.value })} placeholder="Mã giảm giá (nếu có)" className="w-full border rounded-lg px-2 py-1.5" />
                <button disabled={!checkin || !checkout || soldOut || busy === rt.id} onClick={() => book(rt)}
                  className="w-full bg-sea-600 hover:bg-sea-700 disabled:bg-slate-300 text-white rounded-lg py-2 font-medium">
                  {busy === rt.id ? 'Đang giữ phòng…' : 'Đặt phòng'}
                </button>
                {!checkin && <p className="text-xs text-slate-400">Chọn ngày nhận/trả phòng để đặt.</p>}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="font-semibold text-lg mb-3">Đánh giá của khách đã lưu trú</h2>
      {hotel.reviews.length === 0 && <p className="text-slate-500 text-sm">Chưa có đánh giá nào.</p>}
      <div className="space-y-3">
        {hotel.reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-100 p-3">
            <p className="text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
            <p className="text-sm mt-1">{r.comment}</p>
            {r.partnerReply && <p className="text-sm mt-2 bg-sea-50 rounded-lg px-2 py-1"><b>Khách sạn phản hồi:</b> {r.partnerReply}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
