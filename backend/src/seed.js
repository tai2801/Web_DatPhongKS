// Du lieu mau Hotelora: 3 doi tac, 6 khach san o 5 dia diem, 11 loai phong,
// chinh sach huy khac nhau theo loai phong, don mau nhieu trang thai.
// Gia/dem cua don mau duoc tinh bang chinh service pricing de nhat quan.
import bcrypt from 'bcryptjs';
import { quoteStay } from './services/pricing.js';

const img = (id) => [`/images/${id}-a.svg`, `/images/${id}-b.svg`, `/images/${id}-c.svg`];

export const SEED_USERS = [
  { id: 'u-admin', name: 'Quan tri Hotelora', email: 'admin@hotelora.vn', password: 'Admin@123', role: 'ADMIN', phone: '0901000001' },
  { id: 'u-p1', name: 'Cong ty Azure Hospitality', email: 'partner1@hotelora.vn', password: 'Partner@123', role: 'PARTNER', phone: '0901000002' },
  { id: 'u-p2', name: 'Cong ty Coral Travel Group', email: 'partner2@hotelora.vn', password: 'Partner@123', role: 'PARTNER', phone: '0901000003' },
  { id: 'u-p3', name: 'Saigon Boutique Hotels', email: 'partner3@hotelora.vn', password: 'Partner@123', role: 'PARTNER', phone: '0901000004' },
  { id: 'u-g1', name: 'Nguyen Minh Khang', email: 'khach@hotelora.vn', password: 'Khach@123', role: 'GUEST', phone: '0912345678' },
  { id: 'u-g2', name: 'Tran Thu Lan', email: 'lan@hotelora.vn', password: 'Khach@123', role: 'GUEST', phone: '0987654321' },
];

export const SEED_HOTELS = [
  { id: 'h1', partnerId: 'u-p1', name: 'Azure Bay Resort & Spa', city: 'Da Nang', address: '88 Vo Nguyen Giap, Son Tra, Da Nang', stars: 5, status: 'ACTIVE', amenities: ['wifi', 'pool', 'spa', 'beach', 'breakfast', 'gym', 'restaurant', 'parking'], description: 'Resort bien 5 sao voi ho boi vo cuc va spa, cach bai bien My Khe 2 phut di bo.', images: img('h1') },
  { id: 'h2', partnerId: 'u-p1', name: 'Hanoi Old Quarter Hotel', city: 'Ha Noi', address: '12 Hang Bong, Hoan Kiem, Ha Noi', stars: 4, status: 'ACTIVE', amenities: ['wifi', 'breakfast', 'restaurant', 'parking', 'airportShuttle'], description: 'Khach san giua pho co, tien nghi cho chuyen cong tac va kham pha Ha Noi.', images: img('h2') },
  { id: 'h3', partnerId: 'u-p2', name: 'Dalat Pine Hill Retreat', city: 'Da Lat', address: '5 Tran Hung Dao, Phuong 10, Da Lat', stars: 4, status: 'ACTIVE', amenities: ['wifi', 'breakfast', 'garden', 'fireplace', 'parking'], description: 'Khu nghi duong tren doi thong, view thung lung va vuon hoa quanh nam.', images: img('h3') },
  { id: 'h4', partnerId: 'u-p2', name: 'Phu Quoc Coral Beach Resort', city: 'Phu Quoc', address: 'Bai Truong, Duong To, Phu Quoc', stars: 5, status: 'ACTIVE', amenities: ['wifi', 'pool', 'beach', 'spa', 'breakfast', 'bar', 'restaurant'], description: 'Resort bai bien rieng tai Bai Truong, noi ngam hoang hon dep nhat dao ngoc.', images: img('h4') },
  { id: 'h5', partnerId: 'u-p3', name: 'Saigon Riverside Boutique', city: 'TP. Ho Chi Minh', address: '21 Ton Duc Thang, Ben Nghe, Quan 1, TP.HCM', stars: 4, status: 'ACTIVE', amenities: ['wifi', 'pool', 'gym', 'restaurant', 'bar'], description: 'Khach san boutique ven song Sai Gon, phong cach hien dai toi gian.', images: img('h5') },
  { id: 'h6', partnerId: 'u-p3', name: 'Hue Heritage Garden Hotel', city: 'Hue', address: '9 Le Loi, Vinh Ninh, Hue', stars: 3, status: 'PENDING', amenities: ['wifi', 'garden', 'breakfast'], description: 'Khach san vuon gan song Huong - dang cho admin nen tang duyet dang ky.', images: img('h6') },
];

// cancelPolicy: { freeCancelDays, lateRefundPercent, nonRefundable }
export const SEED_ROOM_TYPES = [
  { id: 'rt1', hotelId: 'h1', name: 'Deluxe King Huong Bien', basePrice: 1800000, maxGuests: 2, totalRooms: 3, sizeM2: 38, bed: '1 giuong King', cancelPolicy: { freeCancelDays: 3, lateRefundPercent: 50, nonRefundable: false } },
  { id: 'rt2', hotelId: 'h1', name: 'Family Suite 2 Phong Ngu', basePrice: 3200000, maxGuests: 4, totalRooms: 2, sizeM2: 65, bed: '1 King + 2 don', cancelPolicy: { freeCancelDays: 5, lateRefundPercent: 50, nonRefundable: false } },
  { id: 'rt3', hotelId: 'h1', name: 'Standard Twin Tiet Kiem', basePrice: 1200000, maxGuests: 2, totalRooms: 2, sizeM2: 28, bed: '2 giuong don', cancelPolicy: { freeCancelDays: 1, lateRefundPercent: 0, nonRefundable: false } },
  { id: 'rt4', hotelId: 'h2', name: 'Superior Double Pho Co', basePrice: 950000, maxGuests: 2, totalRooms: 4, sizeM2: 26, bed: '1 giuong doi', cancelPolicy: { freeCancelDays: 2, lateRefundPercent: 50, nonRefundable: false } },
  { id: 'rt5', hotelId: 'h2', name: 'Executive Suite Cong Tac', basePrice: 1650000, maxGuests: 3, totalRooms: 2, sizeM2: 45, bed: '1 King + sofa bed', cancelPolicy: { freeCancelDays: 3, lateRefundPercent: 50, nonRefundable: false } },
  { id: 'rt6', hotelId: 'h3', name: 'Garden View Double', basePrice: 850000, maxGuests: 2, totalRooms: 3, sizeM2: 30, bed: '1 giuong doi', cancelPolicy: { freeCancelDays: 2, lateRefundPercent: 50, nonRefundable: false } },
  { id: 'rt7', hotelId: 'h3', name: 'Phong Tiet Kiem Khong Hoan Hủy', basePrice: 620000, maxGuests: 2, totalRooms: 2, sizeM2: 22, bed: '1 giuong doi', cancelPolicy: { freeCancelDays: 0, lateRefundPercent: 0, nonRefundable: true } },
  { id: 'rt8', hotelId: 'h4', name: 'Beach Villa Rieng Tu', basePrice: 4500000, maxGuests: 4, totalRooms: 2, sizeM2: 90, bed: '2 phong ngu King', cancelPolicy: { freeCancelDays: 7, lateRefundPercent: 50, nonRefundable: false } },
  { id: 'rt9', hotelId: 'h4', name: 'Deluxe Garden View', basePrice: 2400000, maxGuests: 2, totalRooms: 3, sizeM2: 42, bed: '1 giuong King', cancelPolicy: { freeCancelDays: 3, lateRefundPercent: 50, nonRefundable: false } },
  { id: 'rt10', hotelId: 'h5', name: 'Riverside Premium', basePrice: 1500000, maxGuests: 2, totalRooms: 3, sizeM2: 36, bed: '1 giuong King', cancelPolicy: { freeCancelDays: 2, lateRefundPercent: 50, nonRefundable: false } },
  { id: 'rt11', hotelId: 'h6', name: 'Heritage Double', basePrice: 700000, maxGuests: 2, totalRooms: 2, sizeM2: 25, bed: '1 giuong doi', cancelPolicy: { freeCancelDays: 2, lateRefundPercent: 50, nonRefundable: false } },
];

export const SEED_PROMOS = [
  { id: 'pm1', code: 'WELCOME10', type: 'PERCENT', value: 10, maxDiscount: 300000, minSubtotal: 0, expiresAt: '2024-12-31T23:59:59Z', maxUses: null, usedCount: 0, description: 'Giam 10% cho thanh vien moi (toi da 300.000d)' },
  { id: 'pm2', code: 'STAY200K', type: 'FIXED', value: 200000, maxDiscount: null, minSubtotal: 2000000, expiresAt: '2024-12-31T23:59:59Z', maxUses: 100, usedCount: 0, description: 'Giam thang 200.000d cho don tu 2.000.000d' },
  { id: 'pm3', code: 'OLDCODE', type: 'PERCENT', value: 20, maxDiscount: 500000, minSubtotal: 0, expiresAt: '2024-01-01T00:00:00Z', maxUses: null, usedCount: 0, description: 'Ma khuyen mai da het han (dung de minh hoa kiem tra han dung)' },
];

const BOOKING_SEEDS = [
  { id: 'bk1', userId: 'u-g2', roomTypeId: 'rt1', checkin: '2024-04-10', checkout: '2024-04-12', rooms: 1, guests: 2, status: 'CHECKED_OUT' },
  { id: 'bk2', userId: 'u-g1', roomTypeId: 'rt1', checkin: '2024-03-05', checkout: '2024-03-07', rooms: 1, guests: 2, status: 'CHECKED_OUT' },
  { id: 'bk3', userId: 'u-g1', roomTypeId: 'rt9', checkin: '2024-05-24', checkout: '2024-05-27', rooms: 1, guests: 2, status: 'CONFIRMED' },
  { id: 'bk4', userId: 'u-g2', roomTypeId: 'rt4', checkin: '2024-05-20', checkout: '2024-05-21', rooms: 1, guests: 1, status: 'CONFIRMED' },
  { id: 'bk5', userId: 'u-g1', roomTypeId: 'rt6', checkin: '2024-05-01', checkout: '2024-05-03', rooms: 1, guests: 2, status: 'CANCELLED', refundPercent: 100 },
  { id: 'bk6', userId: 'u-g2', roomTypeId: 'rt10', checkin: '2024-05-14', checkout: '2024-05-16', rooms: 1, guests: 2, status: 'CHECKED_IN' },
  { id: 'bk7', userId: 'u-g1', roomTypeId: 'rt6', checkin: '2024-02-14', checkout: '2024-02-15', rooms: 1, guests: 2, status: 'CHECKED_OUT' },
];

export async function seedStore(store, { force = false } = {}) {
  const existing = await store.count('users');
  if (existing > 0 && !force) return { skipped: true };
  for (const c of ['users', 'hotels', 'roomTypes', 'bookings', 'reviews', 'wishlists', 'promotions', 'complaints', 'transactions']) {
    for (const d of await store.getAll(c)) await store.remove(c, d.id);
  }
  for (const u of SEED_USERS) {
    await store.insert('users', {
      id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone,
      passwordHash: bcrypt.hashSync(u.password, 10), createdAt: '2024-01-05T08:00:00Z',
    });
  }
  for (const h of SEED_HOTELS) await store.insert('hotels', { ...h, createdAt: '2024-01-10T08:00:00Z' });
  for (const r of SEED_ROOM_TYPES) await store.insert('roomTypes', r);
  for (const p of SEED_PROMOS) await store.insert('promotions', p);

  const rtById = Object.fromEntries(SEED_ROOM_TYPES.map((r) => [r.id, r]));
  const hotelOf = Object.fromEntries(SEED_ROOM_TYPES.map((r) => [r.id, r.hotelId]));
  let txSeq = 0;
  for (const b of BOOKING_SEEDS) {
    const rt = rtById[b.roomTypeId];
    const quote = quoteStay(rt.basePrice, b.checkin, b.checkout, b.rooms);
    const paid = b.status !== 'CANCELLED';
    const booking = {
      id: b.id, code: `HL-${b.id.toUpperCase()}24`,
      userId: b.userId, hotelId: hotelOf[b.roomTypeId], roomTypeId: b.roomTypeId,
      checkin: b.checkin, checkout: b.checkout, rooms: b.rooms, guests: b.guests,
      status: b.status, nightly: quote.nights, subtotal: quote.subtotal,
      discount: 0, promoCode: null, total: quote.subtotal,
      policySnapshot: rt.cancelPolicy,
      paymentStatus: paid ? 'PAID_SIMULATED' : 'REFUNDED',
      refundAmount: b.status === 'CANCELLED' ? quote.subtotal : 0,
      holdExpiresAt: null, createdAt: '2024-04-01T09:00:00Z',
    };
    await store.insert('bookings', booking);
    txSeq += 1;
    await store.insert('transactions', {
      id: `tx${txSeq}`, bookingId: b.id, hotelId: booking.hotelId, userId: b.userId,
      type: 'PAYMENT_SIMULATED', amount: quote.subtotal,
      commission: Math.round(quote.subtotal * 0.1), partnerAmount: quote.subtotal - Math.round(quote.subtotal * 0.1),
      createdAt: '2024-04-01T09:05:00Z',
    });
    if (b.status === 'CANCELLED') {
      txSeq += 1;
      await store.insert('transactions', {
        id: `tx${txSeq}`, bookingId: b.id, hotelId: booking.hotelId, userId: b.userId,
        type: 'REFUND_SIMULATED', amount: quote.subtotal, commission: 0, partnerAmount: 0,
        createdAt: '2024-04-20T09:05:00Z',
      });
    }
  }

  await store.insert('reviews', {
    id: 'rv1', bookingId: 'bk1', userId: 'u-g2', hotelId: 'h1', rating: 5,
    comment: 'Bien dep, nhan vien tan tam, bua sang ngon. Se quay lai!', partnerReply: 'Cam on chi Lan, hen gap lai gia dinh minh!',
    createdAt: '2024-04-13T10:00:00Z',
  });
  await store.insert('reviews', {
    id: 'rv2', bookingId: 'bk7', userId: 'u-g1', hotelId: 'h3', rating: 4,
    comment: 'Khong khi yen tinh, phong sach. Wifi hoi cham vao buoi toi.', partnerReply: null,
    createdAt: '2024-02-16T10:00:00Z',
  });
  await store.insert('complaints', {
    id: 'cp1', userId: 'u-g1', hotelId: 'h2', bookingId: null,
    subject: 'Nhan phong cham hon gio hen', content: 'Toi den luc 14h nhung 15h30 moi duoc nhan phong, khong duoc thong bao truoc.',
    status: 'OPEN', adminNote: null, createdAt: '2024-05-02T15:00:00Z',
  });
  return { skipped: false, users: SEED_USERS.length, hotels: SEED_HOTELS.length, roomTypes: SEED_ROOM_TYPES.length, bookings: BOOKING_SEEDS.length };
}
