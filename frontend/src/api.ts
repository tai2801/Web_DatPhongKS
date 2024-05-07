// Lop goi API Hotelora - token JWT luu o localStorage.
const TOKEN_KEY = 'hotelora_token';
const USER_KEY = 'hotelora_user';

export interface SessionUser { id: string; name: string; email: string; role: 'GUEST' | 'PARTNER' | 'ADMIN'; phone?: string }

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getUser = (): SessionUser | null => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
};
export const setSession = (token: string | null, user: SessionUser | null) => {
  if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user)); else localStorage.removeItem(USER_KEY);
};

export async function api<T = any>(path: string, options: RequestInit & { bodyObj?: unknown } = {}): Promise<T> {
  const { bodyObj, ...rest } = options;
  const res = await fetch(path, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(rest.headers || {}),
    },
    body: bodyObj !== undefined ? JSON.stringify(bodyObj) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Lỗi ${res.status}`);
  return data as T;
}

export const fmtVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`;

export const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi miễn phí', pool: 'Hồ bơi', spa: 'Spa', beach: 'Bãi biển riêng',
  breakfast: 'Bữa sáng', gym: 'Phòng gym', restaurant: 'Nhà hàng', parking: 'Bãi đỗ xe',
  bar: 'Quầy bar', garden: 'Sân vườn', fireplace: 'Lò sưởi', airportShuttle: 'Đưa đón sân bay',
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán', CONFIRMED: 'Đã xác nhận', CHECKED_IN: 'Đang lưu trú',
  CHECKED_OUT: 'Đã trả phòng', CANCELLED: 'Đã hủy', EXPIRED: 'Hết hạn giữ phòng',
  PENDING: 'Chờ duyệt', ACTIVE: 'Đang hoạt động', REJECTED: 'Bị từ chối',
  OPEN: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết',
};
