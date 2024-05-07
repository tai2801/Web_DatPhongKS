// Hotelora Booking API - nen tang dat phong DA KHACH SAN.
// 3 vai tro: GUEST (khach), PARTNER (doi tac - chi quan ly khach san cua minh),
// ADMIN (nen tang - duyet doi tac, giao dich, khieu nai).
// Thanh toan la MO PHONG (khong thu tien that) - ghi ro trong du lieu giao dich.
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import {
  quoteStay, computeRefund, validatePromo, overlaps,
  nightsBetween, todayStr,
} from './services/pricing.js';

let seq = 1000;
const nextId = (prefix) => `${prefix}${++seq}`;
const bookingCode = () => `HL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export function createApp(store) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const fail = (res, status, message) => res.status(status).json({ error: message });

  // ---------- Auth ----------
  async function auth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return fail(res, 401, 'Can dang nhap');
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const user = await store.getById('users', payload.sub);
      if (!user) return fail(res, 401, 'Tai khoan khong con ton tai');
      req.user = user;
      next();
    } catch { return fail(res, 401, 'Token khong hop le hoac da het han'); }
  }
  const requireRole = (...roles) => (req, res, next) =>
    (roles.includes(req.user.role) ? next() : fail(res, 403, 'Khong co quyen thuc hien thao tac nay'));

  const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone });

  app.get('/health', (req, res) => res.json({ ok: true, service: 'hotelora', store: store.constructor.name }));

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, phone } = req.body || {};
    if (!name || !email || !password) return fail(res, 400, 'Thieu ten, email hoac mat khau');
    if (String(password).length < 6) return fail(res, 400, 'Mat khau toi thieu 6 ky tu');
    const users = await store.getAll('users');
    if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      return fail(res, 409, 'Email da duoc dang ky');
    }
    const role = req.body.role === 'PARTNER' ? 'PARTNER' : 'GUEST';
    const user = {
      id: nextId('u'), name, email, phone: phone || null, role,
      passwordHash: bcrypt.hashSync(password, 10), createdAt: new Date().toISOString(),
    };
    await store.insert('users', user);
    const token = jwt.sign({ sub: user.id, role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    res.status(201).json({ token, user: publicUser(user) });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    const users = await store.getAll('users');
    const user = users.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());
    if (!user || !bcrypt.compareSync(String(password || ''), user.passwordHash)) {
      return fail(res, 401, 'Email hoac mat khau khong dung');
    }
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    res.json({ token, user: publicUser(user) });
  });

  app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

  // ---------- Helpers ----------
  async function ratingOf(hotelId) {
    const reviews = (await store.getAll('reviews')).filter((r) => r.hotelId === hotelId);
    if (!reviews.length) return { ratingAvg: null, ratingCount: 0 };
    return {
      ratingAvg: Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10,
      ratingCount: reviews.length,
    };
  }

  // So phong da bi chiem boi cac booking dang hieu luc trong khoang [in,out).
  async function roomsBooked(roomTypeId, checkin, checkout, now = new Date()) {
    const bookings = await store.getAll('bookings');
    return bookings
      .filter((b) => b.roomTypeId === roomTypeId
        && overlaps(b.checkin, b.checkout, checkin, checkout)
        && (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN'
          || (b.status === 'PENDING_PAYMENT' && b.holdExpiresAt && new Date(b.holdExpiresAt) > now)))
      .reduce((s, b) => s + b.rooms, 0);
  }

  async function roomTypeAvailability(rt, checkin, checkout) {
    const booked = await roomsBooked(rt.id, checkin, checkout);
    return Math.max(0, rt.totalRooms - booked);
  }

  async function hotelOut(hotel, { checkin, checkout, guests } = {}) {
    const rating = await ratingOf(hotel.id);
    const roomTypes = (await store.getAll('roomTypes')).filter((r) => r.hotelId === hotel.id);
    let startingAvgNightly = null;
    let availableTypes = 0;
    for (const rt of roomTypes) {
      if (guests && rt.maxGuests < guests) continue;
      if (checkin && checkout) {
        const avail = await roomTypeAvailability(rt, checkin, checkout);
        if (avail <= 0) continue;
        availableTypes += 1;
        const q = quoteStay(rt.basePrice, checkin, checkout, 1);
        const avg = Math.round(q.subtotal / q.nightCount);
        if (startingAvgNightly === null || avg < startingAvgNightly) startingAvgNightly = avg;
      } else if (startingAvgNightly === null || rt.basePrice < startingAvgNightly) {
        startingAvgNightly = rt.basePrice;
      }
    }
    return {
      ...hotel, ...rating, startingAvgNightly,
      availableTypes: checkin && checkout ? availableTypes : undefined,
      roomTypeCount: roomTypes.length,
    };
  }

  // ---------- Tim kiem khach san (cong khai) ----------
  app.get('/api/hotels/suggestions', async (req, res) => {
    const budget = Number(req.query.budget);
    if (!budget) return fail(res, 400, 'Can tham so budget (ngan sach moi dem)');
    const { city, checkin, checkout } = req.query;
    const hotels = (await store.getAll('hotels')).filter((h) => h.status === 'ACTIVE');
    const out = [];
    for (const h of hotels) {
      if (city && h.city !== city) continue;
      const o = await hotelOut(h, { checkin, checkout, guests: Number(req.query.guests) || undefined });
      if (o.startingAvgNightly === null || o.startingAvgNightly > budget) continue;
      // Diem phu hop: rating cao + gia cang gan ngan sach (dung het gia tri) cang tot.
      const priceFit = 1 - (budget - o.startingAvgNightly) / budget;
      o.fitScore = Math.round(((o.ratingAvg || 3) + priceFit * 2) * 100) / 100;
      out.push(o);
    }
    out.sort((a, b) => b.fitScore - a.fitScore);
    res.json({ budget, results: out });
  });

  app.get('/api/hotels', async (req, res) => {
    const {
      city, checkin, checkout, guests, minPrice, maxPrice, stars,
      amenities, roomType, sort,
    } = req.query;
    if ((checkin && !checkout) || (!checkin && checkout)) {
      return fail(res, 400, 'Can ca ngay nhan phong va tra phong');
    }
    if (checkin && nightsBetween(checkin, checkout) < 1) {
      return fail(res, 400, 'Ngay tra phong phai sau ngay nhan phong');
    }
    const amenityList = amenities ? String(amenities).split(',').filter(Boolean) : [];
    const guestCount = guests ? Number(guests) : undefined;
    let hotels = (await store.getAll('hotels')).filter((h) => h.status === 'ACTIVE');
    const out = [];
    for (const h of hotels) {
      if (city && h.city !== city) continue;
      if (stars && h.stars < Number(stars)) continue;
      if (amenityList.length && !amenityList.every((a) => h.amenities.includes(a))) continue;
      const o = await hotelOut(h, { checkin, checkout, guests: guestCount });
      if (checkin && checkout) {
        if (o.availableTypes === 0) continue;
        if (roomType) {
          const rts = (await store.getAll('roomTypes'))
            .filter((r) => r.hotelId === h.id && r.name.toLowerCase().includes(String(roomType).toLowerCase()));
          let ok = false;
          for (const rt of rts) if (await roomTypeAvailability(rt, checkin, checkout) > 0) ok = true;
          if (!ok) continue;
        }
      }
      if (minPrice && (o.startingAvgNightly === null || o.startingAvgNightly < Number(minPrice))) continue;
      if (maxPrice && (o.startingAvgNightly === null || o.startingAvgNightly > Number(maxPrice))) continue;
      out.push(o);
    }
    if (sort === 'price_asc') out.sort((a, b) => a.startingAvgNightly - b.startingAvgNightly);
    else if (sort === 'price_desc') out.sort((a, b) => b.startingAvgNightly - a.startingAvgNightly);
    else if (sort === 'rating') out.sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0));
    res.json({ count: out.length, results: out });
  });

  app.get('/api/hotels/:id', async (req, res) => {
    const hotel = await store.getById('hotels', req.params.id);
    if (!hotel || hotel.status !== 'ACTIVE') return fail(res, 404, 'Khong tim thay khach san');
    const { checkin, checkout } = req.query;
    const out = await hotelOut(hotel, { checkin, checkout });
    const roomTypes = (await store.getAll('roomTypes')).filter((r) => r.hotelId === hotel.id);
    const types = [];
    for (const rt of roomTypes) {
      const item = { ...rt };
      if (checkin && checkout && nightsBetween(checkin, checkout) >= 1) {
        item.availableRooms = await roomTypeAvailability(rt, checkin, checkout);
        item.quote = quoteStay(rt.basePrice, checkin, checkout, 1);
      }
      types.push(item);
    }
    const reviews = (await store.getAll('reviews')).filter((r) => r.hotelId === hotel.id);
    res.json({ ...out, roomTypes: types, reviews });
  });

  app.get('/api/cities', async (req, res) => {
    const hotels = (await store.getAll('hotels')).filter((h) => h.status === 'ACTIVE');
    res.json({ cities: [...new Set(hotels.map((h) => h.city))] });
  });

  // ---------- Wishlist ----------
  app.get('/api/wishlist', auth, async (req, res) => {
    const items = (await store.getAll('wishlists')).filter((w) => w.userId === req.user.id);
    const out = [];
    for (const w of items) {
      const h = await store.getById('hotels', w.hotelId);
      if (h) out.push({ id: w.id, hotel: await hotelOut(h) });
    }
    res.json({ results: out });
  });

  app.post('/api/wishlist', auth, async (req, res) => {
    const hotel = await store.getById('hotels', req.body?.hotelId);
    if (!hotel) return fail(res, 404, 'Khong tim thay khach san');
    const items = await store.getAll('wishlists');
    if (items.some((w) => w.userId === req.user.id && w.hotelId === hotel.id)) {
      return fail(res, 409, 'Khach san da co trong danh sach yeu thich');
    }
    const item = { id: nextId('w'), userId: req.user.id, hotelId: hotel.id, createdAt: new Date().toISOString() };
    await store.insert('wishlists', item);
    res.status(201).json(item);
  });

  app.delete('/api/wishlist/:hotelId', auth, async (req, res) => {
    const items = (await store.getAll('wishlists'))
      .filter((w) => w.userId === req.user.id && w.hotelId === req.params.hotelId);
    if (!items.length) return fail(res, 404, 'Khong tim thay trong wishlist');
    await store.remove('wishlists', items[0].id);
    res.json({ ok: true });
  });

  // ---------- Dat phong ----------
  async function loadBookingOwned(req, res) {
    const booking = await store.getById('bookings', req.params.id);
    if (!booking) { fail(res, 404, 'Khong tim thay dat phong'); return null; }
    if (booking.userId !== req.user.id && req.user.role !== 'ADMIN') {
      fail(res, 403, 'Dat phong khong thuoc ve ban'); return null;
    }
    return booking;
  }

  app.post('/api/bookings', auth, async (req, res) => {
    const {
      hotelId, roomTypeId, checkin, checkout, promoCode,
      guestName, guestPhone,
    } = req.body || {};
    const rooms = Number(req.body?.rooms || 1);
    const guests = Number(req.body?.guests || 1);
    const hotel = await store.getById('hotels', hotelId);
    if (!hotel) return fail(res, 404, 'Khong tim thay khach san');
    if (hotel.status !== 'ACTIVE') return fail(res, 400, 'Khach san chua duoc duyet hoac dang tam dung');
    const rt = await store.getById('roomTypes', roomTypeId);
    if (!rt || rt.hotelId !== hotel.id) return fail(res, 404, 'Khong tim thay loai phong');
    if (!checkin || !checkout || nightsBetween(checkin, checkout) < 1) {
      return fail(res, 400, 'Khoang ngay khong hop le');
    }
    if (checkin < todayStr()) return fail(res, 400, 'Ngay nhan phong khong duoc o qua khu');
    if (rooms < 1 || guests < 1) return fail(res, 400, 'So phong/so khach khong hop le');
    if (guests > rt.maxGuests * rooms) {
      return fail(res, 400, `Loai phong nay toi da ${rt.maxGuests} khach/phong`);
    }
    const available = await roomTypeAvailability(rt, checkin, checkout);
    if (rooms > available) {
      return fail(res, 409, `Chi con ${available} phong trong trong khoang ngay nay`);
    }
    const quote = quoteStay(rt.basePrice, checkin, checkout, rooms);
    let discount = 0; let promo = null;
    if (promoCode) {
      const promos = await store.getAll('promotions');
      promo = promos.find((p) => p.code === String(promoCode).toUpperCase());
      const v = validatePromo(promo, quote.subtotal);
      if (!v.ok) return fail(res, 400, v.reason);
      discount = v.discount;
    }
    const booking = {
      id: nextId('b'), code: bookingCode(),
      userId: req.user.id, hotelId: hotel.id, roomTypeId: rt.id,
      checkin, checkout, rooms, guests,
      guestName: guestName || req.user.name, guestPhone: guestPhone || req.user.phone,
      status: 'PENDING_PAYMENT',
      nightly: quote.nights, subtotal: quote.subtotal, discount,
      promoCode: promo ? promo.code : null,
      total: quote.subtotal - discount,
      policySnapshot: rt.cancelPolicy,
      paymentStatus: 'UNPAID', refundAmount: 0,
      holdExpiresAt: new Date(Date.now() + config.holdMinutes * 60000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await store.insert('bookings', booking);
    res.status(201).json(booking);
  });

  app.post('/api/bookings/:id/pay', auth, async (req, res) => {
    const booking = await loadBookingOwned(req, res);
    if (!booking) return;
    if (booking.status !== 'PENDING_PAYMENT') return fail(res, 400, 'Dat phong khong o trang thai cho thanh toan');
    if (new Date(booking.holdExpiresAt) <= new Date()) {
      await store.update('bookings', booking.id, { status: 'EXPIRED' });
      return fail(res, 410, 'Da het thoi gian giu phong, vui long dat lai');
    }
    // Thanh toan MO PHONG: khong thu tien that, chi ghi nhan giao dich.
    const commission = Math.round(booking.total * config.commissionRate);
    const tx = {
      id: nextId('tx'), bookingId: booking.id, hotelId: booking.hotelId, userId: booking.userId,
      type: 'PAYMENT_SIMULATED', method: req.body?.method || 'CARD_SIMULATED',
      amount: booking.total, commission, partnerAmount: booking.total - commission,
      createdAt: new Date().toISOString(),
    };
    await store.insert('transactions', tx);
    if (booking.promoCode) {
      const promos = await store.getAll('promotions');
      const promo = promos.find((p) => p.code === booking.promoCode);
      if (promo) await store.update('promotions', promo.id, { usedCount: promo.usedCount + 1 });
    }
    const updated = await store.update('bookings', booking.id, {
      status: 'CONFIRMED', paymentStatus: 'PAID_SIMULATED', holdExpiresAt: null,
    });
    res.json({ booking: updated, transaction: tx, note: 'Thanh toan mo phong - khong thu tien that' });
  });

  app.get('/api/bookings/mine', auth, async (req, res) => {
    const bookings = (await store.getAll('bookings'))
      .filter((b) => b.userId === req.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const out = [];
    for (const b of bookings) {
      const hotel = await store.getById('hotels', b.hotelId);
      const rt = await store.getById('roomTypes', b.roomTypeId);
      out.push({ ...b, hotelName: hotel?.name, hotelCity: hotel?.city, roomTypeName: rt?.name });
    }
    res.json({ results: out });
  });

  app.get('/api/bookings/:id/refund-preview', auth, async (req, res) => {
    const booking = await loadBookingOwned(req, res);
    if (!booking) return;
    if (booking.paymentStatus !== 'PAID_SIMULATED') {
      return res.json({ refundPercent: 0, refundAmount: 0, feeAmount: 0, note: 'Don chua thanh toan - huy khong phat sinh hoan tien' });
    }
    const r = computeRefund(booking.total, booking.policySnapshot, booking.checkin, todayStr());
    res.json({ ...r, policy: booking.policySnapshot });
  });

  app.post('/api/bookings/:id/cancel', auth, async (req, res) => {
    const booking = await loadBookingOwned(req, res);
    if (!booking) return;
    if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status)) {
      return fail(res, 400, `Khong the huy dat phong o trang thai ${booking.status}`);
    }
    let refund = { refundAmount: 0, feeAmount: 0, refundPercent: 0 };
    if (booking.paymentStatus === 'PAID_SIMULATED') {
      refund = computeRefund(booking.total, booking.policySnapshot, booking.checkin, todayStr());
      if (refund.refundAmount > 0) {
        await store.insert('transactions', {
          id: nextId('tx'), bookingId: booking.id, hotelId: booking.hotelId, userId: booking.userId,
          type: 'REFUND_SIMULATED', amount: refund.refundAmount, commission: 0, partnerAmount: 0,
          createdAt: new Date().toISOString(),
        });
      }
    }
    const updated = await store.update('bookings', booking.id, {
      status: 'CANCELLED', paymentStatus: booking.paymentStatus === 'PAID_SIMULATED' ? 'REFUNDED' : 'UNPAID',
      refundAmount: refund.refundAmount, cancelFee: refund.feeAmount,
      cancelledAt: new Date().toISOString(),
    });
    res.json({ booking: updated, refund });
  });

  // ---------- Danh gia ----------
  app.post('/api/reviews', auth, async (req, res) => {
    const { bookingId, rating, comment } = req.body || {};
    const booking = await store.getById('bookings', bookingId);
    if (!booking || booking.userId !== req.user.id) return fail(res, 404, 'Khong tim thay dat phong cua ban');
    if (booking.status !== 'CHECKED_OUT') {
      return fail(res, 403, 'Chi duoc danh gia sau khi da hoan tat luu tru (check-out)');
    }
    if (!rating || rating < 1 || rating > 5) return fail(res, 400, 'Diem danh gia tu 1 den 5');
    const reviews = await store.getAll('reviews');
    if (reviews.some((r) => r.bookingId === booking.id)) {
      return fail(res, 409, 'Dat phong nay da duoc danh gia');
    }
    const review = {
      id: nextId('rv'), bookingId: booking.id, userId: req.user.id, hotelId: booking.hotelId,
      rating, comment: comment || '', partnerReply: null, createdAt: new Date().toISOString(),
    };
    await store.insert('reviews', review);
    res.status(201).json(review);
  });

  // ---------- Khieu nai ----------
  app.post('/api/complaints', auth, async (req, res) => {
    const { hotelId, bookingId, subject, content } = req.body || {};
    if (!hotelId || !subject || !content) return fail(res, 400, 'Thieu khach san, tieu de hoac noi dung khieu nai');
    const hotel = await store.getById('hotels', hotelId);
    if (!hotel) return fail(res, 404, 'Khong tim thay khach san');
    const complaint = {
      id: nextId('cp'), userId: req.user.id, hotelId, bookingId: bookingId || null,
      subject, content, status: 'OPEN', adminNote: null, createdAt: new Date().toISOString(),
    };
    await store.insert('complaints', complaint);
    res.status(201).json(complaint);
  });

  app.get('/api/complaints/mine', auth, async (req, res) => {
    const list = (await store.getAll('complaints')).filter((c) => c.userId === req.user.id);
    res.json({ results: list });
  });

  // ---------- Doi tac ----------
  const partnerOwns = async (req, hotelId) => {
    const hotel = await store.getById('hotels', hotelId);
    if (!hotel) return { error: [404, 'Khong tim thay khach san'] };
    if (hotel.partnerId !== req.user.id) return { error: [403, 'Khach san khong thuoc quyen quan ly cua ban'] };
    return { hotel };
  };

  app.get('/api/partner/hotels', auth, requireRole('PARTNER'), async (req, res) => {
    const hotels = (await store.getAll('hotels')).filter((h) => h.partnerId === req.user.id);
    const out = [];
    for (const h of hotels) out.push(await hotelOut(h));
    res.json({ results: out });
  });

  app.post('/api/partner/hotels', auth, requireRole('PARTNER'), async (req, res) => {
    const { name, city, address, stars, amenities, description } = req.body || {};
    if (!name || !city) return fail(res, 400, 'Thieu ten hoac thanh pho');
    const hotel = {
      id: nextId('h'), partnerId: req.user.id, name, city, address: address || '',
      stars: Math.min(5, Math.max(1, Number(stars) || 3)), status: 'PENDING',
      amenities: amenities || [], description: description || '',
      images: ['/images/h1-a.svg'], createdAt: new Date().toISOString(),
    };
    await store.insert('hotels', hotel);
    res.status(201).json(hotel);
  });

  app.put('/api/partner/hotels/:id', auth, requireRole('PARTNER'), async (req, res) => {
    const { hotel, error } = await partnerOwns(req, req.params.id);
    if (error) return fail(res, error[0], error[1]);
    const { name, city, address, stars, amenities, description, images } = req.body || {};
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (city !== undefined) patch.city = city;
    if (address !== undefined) patch.address = address;
    if (stars !== undefined) patch.stars = Math.min(5, Math.max(1, Number(stars)));
    if (amenities !== undefined) patch.amenities = amenities;
    if (description !== undefined) patch.description = description;
    if (images !== undefined) patch.images = images;
    res.json(await store.update('hotels', hotel.id, patch));
  });

  app.post('/api/partner/hotels/:id/room-types', auth, requireRole('PARTNER'), async (req, res) => {
    const { hotel, error } = await partnerOwns(req, req.params.id);
    if (error) return fail(res, error[0], error[1]);
    const { name, basePrice, maxGuests, totalRooms, sizeM2, bed, cancelPolicy } = req.body || {};
    if (!name || !basePrice) return fail(res, 400, 'Thieu ten loai phong hoac gia goc');
    const rt = {
      id: nextId('rt'), hotelId: hotel.id, name,
      basePrice: Number(basePrice), maxGuests: Number(maxGuests) || 2,
      totalRooms: Number(totalRooms) || 1, sizeM2: Number(sizeM2) || 25, bed: bed || '',
      cancelPolicy: cancelPolicy || { freeCancelDays: 1, lateRefundPercent: 50, nonRefundable: false },
    };
    await store.insert('roomTypes', rt);
    res.status(201).json(rt);
  });

  app.put('/api/partner/room-types/:id', auth, requireRole('PARTNER'), async (req, res) => {
    const rt = await store.getById('roomTypes', req.params.id);
    if (!rt) return fail(res, 404, 'Khong tim thay loai phong');
    const { error } = await partnerOwns(req, rt.hotelId);
    if (error) return fail(res, error[0], error[1]);
    const patch = {};
    for (const k of ['name', 'basePrice', 'maxGuests', 'totalRooms', 'sizeM2', 'bed', 'cancelPolicy']) {
      if (req.body?.[k] !== undefined) patch[k] = req.body[k];
    }
    res.json(await store.update('roomTypes', rt.id, patch));
  });

  app.delete('/api/partner/room-types/:id', auth, requireRole('PARTNER'), async (req, res) => {
    const rt = await store.getById('roomTypes', req.params.id);
    if (!rt) return fail(res, 404, 'Khong tim thay loai phong');
    const { error } = await partnerOwns(req, rt.hotelId);
    if (error) return fail(res, error[0], error[1]);
    await store.remove('roomTypes', rt.id);
    res.json({ ok: true });
  });

  app.get('/api/partner/bookings', auth, requireRole('PARTNER'), async (req, res) => {
    const myHotels = new Set(
      (await store.getAll('hotels')).filter((h) => h.partnerId === req.user.id).map((h) => h.id),
    );
    const bookings = (await store.getAll('bookings'))
      .filter((b) => myHotels.has(b.hotelId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ results: bookings });
  });

  async function partnerTransition(req, res, from, to) {
    const booking = await store.getById('bookings', req.params.id);
    if (!booking) return fail(res, 404, 'Khong tim thay dat phong');
    const { error } = await partnerOwns(req, booking.hotelId);
    if (error) return fail(res, error[0], error[1]);
    if (booking.status !== from) {
      return fail(res, 400, `Chi co the chuyen tu ${from} sang ${to}, hien tai: ${booking.status}`);
    }
    res.json(await store.update('bookings', booking.id, { status: to }));
  }

  app.post('/api/partner/bookings/:id/checkin', auth, requireRole('PARTNER'),
    (req, res) => partnerTransition(req, res, 'CONFIRMED', 'CHECKED_IN'));
  app.post('/api/partner/bookings/:id/checkout', auth, requireRole('PARTNER'),
    (req, res) => partnerTransition(req, res, 'CHECKED_IN', 'CHECKED_OUT'));

  app.get('/api/partner/revenue', auth, requireRole('PARTNER'), async (req, res) => {
    const myHotels = new Set(
      (await store.getAll('hotels')).filter((h) => h.partnerId === req.user.id).map((h) => h.id),
    );
    const txs = (await store.getAll('transactions')).filter((t) => myHotels.has(t.hotelId));
    const payments = txs.filter((t) => t.type === 'PAYMENT_SIMULATED');
    const refunds = txs.filter((t) => t.type === 'REFUND_SIMULATED');
    const gross = payments.reduce((s, t) => s + t.amount, 0);
    const commission = payments.reduce((s, t) => s + t.commission, 0);
    const refundTotal = refunds.reduce((s, t) => s + t.amount, 0);
    res.json({
      gross, commission, refundTotal,
      netReceived: gross - commission - refundTotal,
      paymentCount: payments.length,
      note: 'Doanh thu cua cac khach san ban quan ly; san thu hoa hong 10% tren moi giao dich.',
    });
  });

  app.get('/api/partner/reviews', auth, requireRole('PARTNER'), async (req, res) => {
    const myHotels = new Set(
      (await store.getAll('hotels')).filter((h) => h.partnerId === req.user.id).map((h) => h.id),
    );
    const reviews = (await store.getAll('reviews')).filter((r) => myHotels.has(r.hotelId));
    res.json({ results: reviews });
  });

  app.put('/api/partner/reviews/:id/reply', auth, requireRole('PARTNER'), async (req, res) => {
    const review = await store.getById('reviews', req.params.id);
    if (!review) return fail(res, 404, 'Khong tim thay danh gia');
    const { error } = await partnerOwns(req, review.hotelId);
    if (error) return fail(res, error[0], error[1]);
    res.json(await store.update('reviews', review.id, { partnerReply: req.body?.reply || '' }));
  });

  // ---------- Admin nen tang ----------
  app.get('/api/admin/hotels', auth, requireRole('ADMIN'), async (req, res) => {
    let hotels = await store.getAll('hotels');
    if (req.query.status) hotels = hotels.filter((h) => h.status === req.query.status);
    const out = [];
    for (const h of hotels) out.push(await hotelOut(h));
    res.json({ results: out });
  });

  app.post('/api/admin/hotels/:id/approve', auth, requireRole('ADMIN'), async (req, res) => {
    const hotel = await store.getById('hotels', req.params.id);
    if (!hotel) return fail(res, 404, 'Khong tim thay khach san');
    if (hotel.status !== 'PENDING') return fail(res, 400, 'Khach san khong o trang thai cho duyet');
    res.json(await store.update('hotels', hotel.id, { status: 'ACTIVE' }));
  });

  app.post('/api/admin/hotels/:id/reject', auth, requireRole('ADMIN'), async (req, res) => {
    const hotel = await store.getById('hotels', req.params.id);
    if (!hotel) return fail(res, 404, 'Khong tim thay khach san');
    if (hotel.status !== 'PENDING') return fail(res, 400, 'Khach san khong o trang thai cho duyet');
    res.json(await store.update('hotels', hotel.id, { status: 'REJECTED' }));
  });

  app.get('/api/admin/users', auth, requireRole('ADMIN'), async (req, res) => {
    const users = await store.getAll('users');
    res.json({ results: users.map(publicUser) });
  });

  app.get('/api/admin/transactions', auth, requireRole('ADMIN'), async (req, res) => {
    const txs = (await store.getAll('transactions'))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ results: txs });
  });

  app.get('/api/admin/complaints', auth, requireRole('ADMIN'), async (req, res) => {
    const list = (await store.getAll('complaints'))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ results: list });
  });

  app.put('/api/admin/complaints/:id', auth, requireRole('ADMIN'), async (req, res) => {
    const complaint = await store.getById('complaints', req.params.id);
    if (!complaint) return fail(res, 404, 'Khong tim thay khieu nai');
    const { status, adminNote } = req.body || {};
    if (status && !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].includes(status)) {
      return fail(res, 400, 'Trang thai khieu nai khong hop le');
    }
    const patch = {};
    if (status) patch.status = status;
    if (adminNote !== undefined) patch.adminNote = adminNote;
    res.json(await store.update('complaints', complaint.id, patch));
  });

  app.get('/api/admin/report', auth, requireRole('ADMIN'), async (req, res) => {
    const txs = await store.getAll('transactions');
    const payments = txs.filter((t) => t.type === 'PAYMENT_SIMULATED');
    const refunds = txs.filter((t) => t.type === 'REFUND_SIMULATED');
    const bookings = await store.getAll('bookings');
    const byStatus = {};
    for (const b of bookings) byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    res.json({
      grossRevenue: payments.reduce((s, t) => s + t.amount, 0),
      refundTotal: refunds.reduce((s, t) => s + t.amount, 0),
      commissionRevenue: payments.reduce((s, t) => s + t.commission, 0),
      commissionRate: config.commissionRate,
      transactionCount: txs.length,
      hotelCount: (await store.getAll('hotels')).length,
      bookingByStatus: byStatus,
      note: 'Hoa hong san = 10% tong giao dich thanh toan mo phong.',
    });
  });

  app.use((req, res) => fail(res, 404, 'Khong tim thay endpoint'));
  return app;
}
