// Cau hinh tap trung - doc tu bien moi truong, co gia tri mac dinh cho dev.
export const config = {
  port: Number(process.env.PORT || 4100),
  jwtSecret: process.env.JWT_SECRET || 'hotelora-dev-secret-thay-khi-production',
  jwtExpiresIn: '7d',
  sqlitePath: process.env.SQLITE_PATH || new URL('../data/hotelora.db', import.meta.url).pathname,
  // Hoa hong san Hotelora: 10% tren tong tien phong cua moi giao dich thanh toan.
  commissionRate: 0.1,
  // Thoi gian giu phong tam (phut) trong luc khach thanh toan mo phong.
  holdMinutes: 15,
  // Mua cao diem: cac thang he + cua so Tet/du lich cuoi nam 20/12 - 05/01.
  peakMonths: [6, 7, 8],
  weekendMultiplier: 1.15, // dem thu 6, thu 7
  peakMultiplier: 1.3,
};
