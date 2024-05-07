import { useEffect, useState } from 'react';
import { api, fmtVnd, AMENITY_LABELS } from '../api';
import type { Hotel } from '../types';

interface Props { go: (v: any) => void; isLoggedIn: boolean }

export default function HomePage({ go, isLoggedIn }: Props) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [guests, setGuests] = useState(2);
  const [maxPrice, setMaxPrice] = useState('');
  const [minStars, setMinStars] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [sort, setSort] = useState('');
  const [budget, setBudget] = useState('');
  const [suggestions, setSuggestions] = useState<Hotel[] | null>(null);
  const [wishMsg, setWishMsg] = useState('');

  async function search() {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams();
      if (city) p.set('city', city);
      if (checkin && checkout) { p.set('checkin', checkin); p.set('checkout', checkout); }
      if (guests) p.set('guests', String(guests));
      if (maxPrice) p.set('maxPrice', maxPrice);
      if (minStars) p.set('stars', minStars);
      if (amenities.length) p.set('amenities', amenities.join(','));
      if (sort) p.set('sort', sort);
      const r = await api<{ results: Hotel[] }>(`/api/hotels?${p.toString()}`);
      setHotels(r.results);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { search(); api<{ cities: string[] }>('/api/cities').then((r) => setCities(r.cities)).catch(() => {}); }, []);

  async function suggest() {
    if (!budget) return;
    try {
      const p = new URLSearchParams({ budget });
      if (city) p.set('city', city);
      const r = await api<{ results: Hotel[] }>(`/api/hotels/suggestions?${p.toString()}`);
      setSuggestions(r.results);
    } catch (e: any) { setError(e.message); }
  }

  async function addWish(hotelId: string) {
    if (!isLoggedIn) { setWishMsg('Vui lòng đăng nhập để lưu khách sạn yêu thích.'); return; }
    try {
      await api('/api/wishlist', { method: 'POST', bodyObj: { hotelId } });
      setWishMsg('Đã thêm vào danh sách yêu thích.');
    } catch (e: any) { setWishMsg(e.message); }
  }

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const card = (h: Hotel, extra?: string) => (
    <div key={h.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 flex flex-col">
      <img src={h.images[0]} alt={h.name} className="h-44 w-full object-cover" />
      <div className="p-4 flex flex-col gap-1 grow">
        <div className="flex items-center justify-between">
          <span className="text-amber-500 text-sm">{'★'.repeat(h.stars)}</span>
          <span className="text-xs bg-sea-100 text-sea-700 px-2 py-0.5 rounded-full">{h.city}</span>
        </div>
        <h3 className="font-semibold text-lg leading-snug">{h.name}</h3>
        <p className="text-sm text-slate-500 line-clamp-2">{h.description}</p>
        <p className="text-sm mt-1">
          {h.ratingAvg ? <>Đánh giá <b>{h.ratingAvg}</b> ({h.ratingCount})</> : 'Chưa có đánh giá'}
          {extra ? <> · <span className="text-sea-600 font-medium">{extra}</span></> : null}
        </p>
        <p className="mt-auto pt-2">
          {h.startingAvgNightly
            ? <>Từ <span className="text-sea-600 font-bold text-lg">{fmtVnd(h.startingAvgNightly)}</span>/đêm</>
            : 'Liên hệ để biết giá'}
        </p>
        <div className="flex gap-2 mt-2">
          <button onClick={() => go({ name: 'hotel', hotelId: h.id })} className="flex-1 bg-sea-600 hover:bg-sea-700 text-white rounded-lg py-2 text-sm font-medium">Xem phòng</button>
          <button onClick={() => addWish(h.id)} className="px-3 rounded-lg border border-sea-600 text-sea-700 text-sm">♥ Lưu</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <section className="bg-sea-900 text-white rounded-3xl px-6 py-10 mb-6">
        <h1 className="text-3xl font-bold mb-2">Đặt phòng khách sạn khắp Việt Nam</h1>
        <p className="text-sea-100 mb-5">Giá động minh bạch theo từng đêm — cuối tuần, mùa cao điểm đều hiển thị rõ trước khi bạn đặt.</p>
        <div className="grid md:grid-cols-5 gap-3 bg-white/10 p-3 rounded-2xl">
          <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-lg px-3 py-2 text-slate-800">
            <option value="">Mọi địa điểm</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} className="rounded-lg px-3 py-2 text-slate-800" />
          <input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} className="rounded-lg px-3 py-2 text-slate-800" />
          <input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="rounded-lg px-3 py-2 text-slate-800" placeholder="Số khách" />
          <button onClick={search} className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold rounded-lg py-2">Tìm khách sạn</button>
        </div>
        <div className="flex flex-wrap gap-3 items-center mt-4">
          <span className="text-sm">Gợi ý theo ngân sách mỗi đêm:</span>
          <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" placeholder="VD: 1000000" className="rounded-lg px-3 py-1.5 text-slate-800 w-40" />
          <button onClick={suggest} className="bg-white text-sea-700 font-medium rounded-lg px-4 py-1.5 text-sm">Gợi ý cho tôi</button>
        </div>
      </section>

      {wishMsg && <p className="mb-3 text-sm bg-sea-50 border border-sea-100 rounded-lg px-3 py-2">{wishMsg}</p>}
      {suggestions && (
        <section className="mb-6">
          <h2 className="font-semibold text-lg mb-3">Phù hợp ngân sách {budget ? fmtVnd(Number(budget)) : ''}/đêm</h2>
          {suggestions.length === 0
            ? <p className="text-slate-500 text-sm">Chưa có khách sạn nào trong ngân sách này.</p>
            : <div className="grid md:grid-cols-3 gap-4">{suggestions.map((h) => card(h, `Điểm phù hợp ${h.fitScore}`))}</div>}
        </section>
      )}

      <div className="flex gap-6 items-start">
        <aside className="w-60 shrink-0 bg-white rounded-2xl border border-slate-100 p-4 hidden md:block">
          <h3 className="font-semibold mb-3">Bộ lọc</h3>
          <label className="block text-sm mb-1">Giá tối đa/đêm</label>
          <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" className="w-full border rounded-lg px-2 py-1.5 mb-3" placeholder="Không giới hạn" />
          <label className="block text-sm mb-1">Hạng sao tối thiểu</label>
          <select value={minStars} onChange={(e) => setMinStars(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 mb-3">
            <option value="">Mọi hạng</option><option value="3">3 sao trở lên</option><option value="4">4 sao trở lên</option><option value="5">5 sao</option>
          </select>
          <label className="block text-sm mb-1">Tiện nghi</label>
          <div className="space-y-1 mb-3">
            {Object.entries(AMENITY_LABELS).slice(0, 8).map(([k, v]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={amenities.includes(k)} onChange={() => toggleAmenity(k)} /> {v}
              </label>
            ))}
          </div>
          <label className="block text-sm mb-1">Sắp xếp</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 mb-3">
            <option value="">Mặc định</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option><option value="rating">Đánh giá cao nhất</option>
          </select>
          <button onClick={search} className="w-full bg-sea-600 text-white rounded-lg py-2 text-sm font-medium">Áp dụng lọc</button>
        </aside>

        <section className="grow">
          {loading && <p className="text-slate-500">Đang tải khách sạn…</p>}
          {error && <p className="text-red-600 bg-red-50 rounded-lg px-3 py-2 text-sm">{error}</p>}
          {!loading && !error && hotels.length === 0 && <p className="text-slate-500">Không tìm thấy khách sạn phù hợp. Hãy nới lỏng điều kiện lọc.</p>}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {hotels.map((h) => card(h))}
          </div>
        </section>
      </div>
    </div>
  );
}
