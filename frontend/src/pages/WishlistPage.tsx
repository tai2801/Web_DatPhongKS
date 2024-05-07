import { useEffect, useState } from 'react';
import { api, fmtVnd } from '../api';
import type { Hotel } from '../types';

export default function WishlistPage({ go }: { go: (v: any) => void }) {
  const [items, setItems] = useState<{ id: string; hotel: Hotel }[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const r = await api<{ results: { id: string; hotel: Hotel }[] }>('/api/wishlist');
      setItems(r.results);
    } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function remove(hotelId: string) {
    try {
      await api(`/api/wishlist/${hotelId}`, { method: 'DELETE' });
      load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Khách sạn yêu thích</h1>
      {error && <p className="mb-3 text-sm bg-red-50 text-red-600 rounded-lg px-3 py-2">{error}</p>}
      {items.length === 0 && <p className="text-slate-500">Chưa có khách sạn nào trong danh sách yêu thích.</p>}
      <div className="grid md:grid-cols-3 gap-4">
        {items.map(({ id, hotel }) => (
          <div key={id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <img src={hotel.images[0]} alt={hotel.name} className="h-40 w-full object-cover" />
            <div className="p-4">
              <h3 className="font-semibold">{hotel.name}</h3>
              <p className="text-sm text-slate-500">{hotel.city} · {hotel.ratingAvg ? `${hotel.ratingAvg}/5` : 'Chưa có đánh giá'}</p>
              {hotel.startingAvgNightly && <p className="mt-1">Từ <b className="text-sea-700">{fmtVnd(hotel.startingAvgNightly)}</b>/đêm</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => go({ name: 'hotel', hotelId: hotel.id })} className="flex-1 bg-sea-600 text-white rounded-lg py-2 text-sm">Xem phòng</button>
                <button onClick={() => remove(hotel.id)} className="px-3 border border-red-300 text-red-600 rounded-lg text-sm">Bỏ lưu</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
