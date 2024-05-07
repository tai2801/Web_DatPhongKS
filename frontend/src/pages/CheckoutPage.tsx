import { useState } from 'react';
import { api, fmtVnd, STATUS_LABELS } from '../api';
import type { Booking } from '../types';

interface Props { booking: Booking; go: (v: any) => void }

export default function CheckoutPage({ booking, go }: Props) {
  const [current, setCurrent] = useState(booking);
  const [method, setMethod] = useState('CARD_SIMULATED');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true); setError('');
    try {
      const r = await api<{ booking: Booking }>(`/api/bookings/${current.id}/pay`, { method: 'POST', bodyObj: { method } });
      setCurrent(r.booking);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  const kindLabel = (k: string) => (k === 'PEAK' ? 'Mùa cao điểm ×1.3' : k === 'WEEKEND' ? 'Cuối tuần ×1.15' : 'Ngày thường ×1.0');

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Xác nhận & thanh toán</h1>
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
        <p>Mã đặt phòng: <b className="text-sea-700 text-lg">{current.code}</b> · Trạng thái: <b>{STATUS_LABELS[current.status] || current.status}</b></p>
        <p className="text-sm text-slate-600">{current.checkin} → {current.checkout} · {current.rooms} phòng · {current.guests} khách · Khách: {current.guestName}</p>
        <div className="bg-sea-50 rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">Chi tiết giá từng đêm (đã snapshot, không đổi sau khi đặt):</p>
          {current.nightly.map((n) => (
            <p key={n.date} className="flex justify-between"><span>{n.date} — {kindLabel(n.kind)}</span><span>{fmtVnd(n.pricePerRoom)}/phòng</span></p>
          ))}
        </div>
        <div className="text-sm space-y-1">
          <p className="flex justify-between"><span>Tạm tính</span><span>{fmtVnd(current.subtotal)}</span></p>
          {current.discount > 0 && <p className="flex justify-between text-emerald-600"><span>Giảm giá ({current.promoCode})</span><span>-{fmtVnd(current.discount)}</span></p>}
          <p className="flex justify-between font-bold text-base border-t pt-2"><span>Tổng thanh toán</span><span>{fmtVnd(current.total)}</span></p>
        </div>
        <p className="text-sm text-slate-500">
          Chính sách hủy: {current.policySnapshot.nonRefundable
            ? 'Loại phòng không hoàn hủy.'
            : `Hủy miễn phí trước ${current.policySnapshot.freeCancelDays} ngày so với ngày nhận phòng; hủy trễ hoàn ${current.policySnapshot.lateRefundPercent}%.`}
        </p>

        {current.status === 'PENDING_PAYMENT' && (
          <>
            <div className="border-t pt-3">
              <label className="block text-sm mb-1">Phương thức thanh toán (mô phỏng)</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="border rounded-lg px-3 py-2 w-full">
                <option value="CARD_SIMULATED">Thẻ ngân hàng (mô phỏng)</option>
                <option value="WALLET_SIMULATED">Ví điện tử (mô phỏng)</option>
                <option value="BANK_TRANSFER_SIMULATED">Chuyển khoản (mô phỏng)</option>
              </select>
              <p className="text-xs text-amber-600 mt-1">Đây là thanh toán MÔ PHỎNG cho mục đích học tập — hệ thống không thu tiền thật. Phòng đang được giữ tạm 15 phút cho bạn.</p>
            </div>
            {error && <p className="text-red-600 bg-red-50 rounded-lg px-3 py-2 text-sm">{error}</p>}
            <button disabled={busy} onClick={pay} className="w-full bg-sea-600 hover:bg-sea-700 disabled:bg-slate-300 text-white rounded-lg py-3 font-semibold">
              {busy ? 'Đang xử lý…' : `Thanh toán mô phỏng ${fmtVnd(current.total)}`}
            </button>
          </>
        )}

        {current.status === 'CONFIRMED' && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
            <p className="font-medium text-emerald-700">Đặt phòng thành công!</p>
            <p className="text-sm">Mã đặt phòng của bạn là <b>{current.code}</b>. Hãy xuất trình mã này khi nhận phòng.</p>
            <button onClick={() => go({ name: 'bookings' })} className="mt-2 bg-sea-600 text-white rounded-lg px-4 py-2 text-sm">Xem đặt phòng của tôi</button>
          </div>
        )}
      </div>
    </div>
  );
}
