// Logic gia dong, hoan tien va trung lich - ham thuan, khong phu thuoc DB,
// de unit test doc lap. Moi quy tac deu tinh o SERVER, client khong tu tinh.
import { config } from '../config.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Ngay lam viec dang 'YYYY-MM-DD', xu ly bang UTC de khong lech mui gio.
export function parseDate(s) {
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

export function addDays(s, n) {
  return formatDate(new Date(parseDate(s).getTime() + n * DAY_MS));
}

export function todayStr(now = new Date()) {
  return formatDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

// So dem cua khoang [checkin, checkout); <= 0 neu khoang khong hop le.
export function nightsBetween(checkin, checkout) {
  const a = parseDate(checkin); const b = parseDate(checkout);
  if (!a || !b) return NaN;
  return Math.round((b - a) / DAY_MS);
}

export function listNights(checkin, checkout) {
  const n = nightsBetween(checkin, checkout);
  if (!Number.isFinite(n) || n <= 0) return [];
  return Array.from({ length: n }, (_, i) => addDays(checkin, i));
}

// Mua cao diem: thang cau hinh (mac dinh 6,7,8) hoac cua so 20/12 - 05/01.
export function isPeakDate(s) {
  const d = parseDate(s);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (config.peakMonths.includes(month)) return true;
  if (month === 12 && day >= 20) return true;
  if (month === 1 && day <= 5) return true;
  return false;
}

// Cuoi tuan theo quy tac Hotelora: dem thu 6 va thu 7.
export function isWeekendDate(s) {
  const dow = parseDate(s).getUTCDay(); // 0=CN ... 5=T6, 6=T7
  return dow === 5 || dow === 6;
}

// He so gia cua mot dem. Uu tien: mua cao diem > cuoi tuan > ngay thuong.
export function multiplierFor(s) {
  if (isPeakDate(s)) return { multiplier: config.peakMultiplier, kind: 'PEAK' };
  if (isWeekendDate(s)) return { multiplier: config.weekendMultiplier, kind: 'WEEKEND' };
  return { multiplier: 1, kind: 'WEEKDAY' };
}

export function roundVnd(x) { return Math.round(x / 1000) * 1000; }

// Bao gia mot ky nghi: tra ve chi tiet tung dem (snapshot vao booking khi dat).
export function quoteStay(basePrice, checkin, checkout, rooms = 1) {
  const nights = listNights(checkin, checkout).map((date) => {
    const { multiplier, kind } = multiplierFor(date);
    return { date, kind, multiplier, pricePerRoom: roundVnd(basePrice * multiplier) };
  });
  const subtotal = nights.reduce((s, n) => s + n.pricePerRoom, 0) * rooms;
  return { nights, nightCount: nights.length, subtotal };
}

// Hai khoang [aIn,aOut) va [bIn,bOut) co chong nhau khong?
// Tra phong dung ngay nhan phong cua khach tiep theo thi KHONG trung.
export function overlaps(aIn, aOut, bIn, bOut) {
  return aIn < bOut && bIn < aOut;
}

// Chinh sach huy cua mot loai phong:
//   { freeCancelDays: so ngay truoc check-in duoc huy mien phi,
//     lateRefundPercent: % duoc hoan khi huy tre (0 = khong hoan) }
// refund tinh tren tong so tien khach da thanh toan (total).
export function computeRefund(total, policy, checkin, cancelDate) {
  const daysBefore = nightsBetween(cancelDate, checkin);
  if (policy.nonRefundable) {
    return { daysBefore, refundPercent: 0, refundAmount: 0, feeAmount: total, tier: 'NON_REFUNDABLE' };
  }
  if (daysBefore >= policy.freeCancelDays) {
    return { daysBefore, refundPercent: 100, refundAmount: total, feeAmount: 0, tier: 'FREE' };
  }
  const refundPercent = policy.lateRefundPercent;
  const refundAmount = roundVnd((total * refundPercent) / 100);
  return { daysBefore, refundPercent, refundAmount, feeAmount: total - refundAmount, tier: 'LATE' };
}

// Kiem tra ma giam gia o server. Tra ve { ok, discount, reason? }.
export function validatePromo(promo, subtotal, now = new Date()) {
  if (!promo) return { ok: false, reason: 'Ma giam gia khong ton tai' };
  if (promo.expiresAt && new Date(promo.expiresAt) < now) {
    return { ok: false, reason: 'Ma giam gia da het han' };
  }
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return { ok: false, reason: 'Ma giam gia da het luot su dung' };
  }
  if (subtotal < (promo.minSubtotal || 0)) {
    return { ok: false, reason: `Don toi thieu ${promo.minSubtotal.toLocaleString('vi-VN')}d de dung ma nay` };
  }
  const discount = promo.type === 'PERCENT'
    ? Math.min(roundVnd((subtotal * promo.value) / 100), promo.maxDiscount || Infinity)
    : Math.min(promo.value, subtotal);
  return { ok: true, discount };
}
