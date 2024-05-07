// Test Hotelora: unit test logic gia/hoan tien + API test tren server that
// (SQLite in-memory). Chay: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createStore } from '../src/store/index.js';
import { seedStore } from '../src/seed.js';
import {
  multiplierFor, quoteStay, computeRefund, validatePromo, overlaps,
  addDays, todayStr, roundVnd,
} from '../src/services/pricing.js';

let server; let base; let store;
let adminToken; let guestToken; let guest2Token; let partner1Token; let partner2Token; let partner3Token;

const future = (n) => addDays(todayStr(), n);

before(async () => {
  store = createStore({ sqlitePath: ':memory:' });
  await store.init();
  await seedStore(store, { force: true });
  server = createApp(store).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  adminToken = await login('admin@hotelora.vn', 'Admin@123');
  guestToken = await login('khach@hotelora.vn', 'Khach@123');
  guest2Token = await login('lan@hotelora.vn', 'Khach@123');
  partner1Token = await login('partner1@hotelora.vn', 'Partner@123');
  partner2Token = await login('partner2@hotelora.vn', 'Partner@123');
  partner3Token = await login('partner3@hotelora.vn', 'Partner@123');
});

after(async () => { server.close(); await store.close(); });

async function login(email, password) {
  const r = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(r.status, 200, `login ${email}`);
  return (await r.json()).token;
}

async function call(path, token, options = {}) {
  const r = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const post = (path, token, body) => call(path, token, { method: 'POST', body: JSON.stringify(body || {}) });

// ---------- Unit: gia dong ----------
test('gia dong: ngay thuong x1.0, cuoi tuan x1.15, cao diem x1.3 (uu tien cao diem)', () => {
  assert.deepEqual(multiplierFor('2024-03-04'), { multiplier: 1, kind: 'WEEKDAY' }); // thu 2
  assert.deepEqual(multiplierFor('2024-03-08'), { multiplier: 1.15, kind: 'WEEKEND' }); // thu 6
  assert.deepEqual(multiplierFor('2024-03-09'), { multiplier: 1.15, kind: 'WEEKEND' }); // thu 7
  assert.deepEqual(multiplierFor('2024-07-17'), { multiplier: 1.3, kind: 'PEAK' }); // thu 4 nhung thang 7
  assert.deepEqual(multiplierFor('2024-12-27'), { multiplier: 1.3, kind: 'PEAK' }); // thu 6 nhung cua so 20/12-05/01
  assert.deepEqual(multiplierFor('2024-01-03'), { multiplier: 1.3, kind: 'PEAK' }); // van cao diem
});

test('quoteStay tinh tung dem va nhan so phong', () => {
  const q1 = quoteStay(1000000, '2024-03-04', '2024-03-06', 1);
  assert.equal(q1.nightCount, 2);
  assert.equal(q1.subtotal, 2000000);
  const q2 = quoteStay(1000000, '2024-03-07', '2024-03-10', 2); // T5 x1, T6 x1.15, T7 x1.15
  assert.deepEqual(q2.nights.map((n) => n.pricePerRoom), [1000000, 1150000, 1150000]);
  assert.equal(q2.subtotal, 3300000 * 2);
});

test('computeRefund: dung moc mien phi 100%, huy tre theo %, khong hoan = 0', () => {
  const policy = { freeCancelDays: 3, lateRefundPercent: 50, nonRefundable: false };
  const early = computeRefund(2000000, policy, '2024-03-10', '2024-03-06');
  assert.equal(early.refundPercent, 100); assert.equal(early.refundAmount, 2000000);
  const late = computeRefund(2000000, policy, '2024-03-10', '2024-03-09');
  assert.equal(late.refundPercent, 50); assert.equal(late.refundAmount, 1000000); assert.equal(late.feeAmount, 1000000);
  const noRefund = computeRefund(2000000, { freeCancelDays: 0, lateRefundPercent: 0, nonRefundable: true }, '2024-03-10', '2024-03-01');
  assert.equal(noRefund.refundAmount, 0);
});

test('overlaps: trung khoang / back-to-back khong trung', () => {
  assert.equal(overlaps('2024-03-02', '2024-03-05', '2024-03-04', '2024-03-06'), true);
  assert.equal(overlaps('2024-03-02', '2024-03-05', '2024-03-05', '2024-03-07'), false);
  assert.equal(overlaps('2024-03-05', '2024-03-07', '2024-03-02', '2024-03-05'), false);
});

test('validatePromo: het han / chua dat toi thieu / tran giam %', () => {
  const now = new Date('2024-05-15T00:00:00Z');
  assert.equal(validatePromo({ expiresAt: '2024-01-01', type: 'PERCENT', value: 20 }, 1000000, now).ok, false);
  assert.equal(validatePromo({ minSubtotal: 2000000, type: 'FIXED', value: 200000 }, 1000000, now).ok, false);
  const v = validatePromo({ type: 'PERCENT', value: 10, maxDiscount: 300000 }, 5000000, now);
  assert.equal(v.ok, true); assert.equal(v.discount, 300000);
});

// ---------- API ----------
test('health + login sai mat khau bi tu choi, thieu token 401', async () => {
  const h = await call('/health');
  assert.equal(h.body.ok, true);
  const bad = await post('/api/auth/login', null, { email: 'khach@hotelora.vn', password: 'sai' });
  assert.equal(bad.status, 401);
  const noTok = await call('/api/bookings/mine');
  assert.equal(noTok.status, 401);
});

test('tim kiem: loc thanh pho, KS cho duyet khong xuat hien cong khai', async () => {
  const dn = await call('/api/hotels?city=Da%20Nang');
  assert.equal(dn.status, 200);
  assert.ok(dn.body.results.some((h) => h.id === 'h1'));
  const all = await call('/api/hotels');
  assert.ok(!all.body.results.some((h) => h.id === 'h6'), 'h6 dang PENDING khong duoc hien');
  const pool = await call('/api/hotels?amenities=pool,beach');
  assert.ok(pool.body.results.every((h) => h.amenities.includes('pool') && h.amenities.includes('beach')));
});

test('goi y theo ngan sach: chi tra KS co gia dem <= ngan sach, co diem phu hop', async () => {
  const r = await call('/api/hotels/suggestions?budget=1000000');
  assert.equal(r.status, 200);
  assert.ok(r.body.results.length >= 1);
  assert.ok(r.body.results.every((h) => h.startingAvgNightly <= 1000000));
  assert.ok(r.body.results[0].fitScore !== undefined);
});

test('chong overbook theo so phong vat ly + back-to-back duoc phep', async () => {
  const ci = future(90); const co = future(92);
  // rt3 co totalRooms = 2
  const b1 = await post('/api/bookings', guestToken, { hotelId: 'h1', roomTypeId: 'rt3', checkin: ci, checkout: co, rooms: 2, guests: 2 });
  assert.equal(b1.status, 201, JSON.stringify(b1.body));
  const pay = await post(`/api/bookings/${b1.body.id}/pay`, guestToken, {});
  assert.equal(pay.status, 200);
  assert.equal(pay.body.booking.status, 'CONFIRMED');
  assert.equal(pay.body.transaction.type, 'PAYMENT_SIMULATED');
  const b2 = await post('/api/bookings', guest2Token, { hotelId: 'h1', roomTypeId: 'rt3', checkin: ci, checkout: co, rooms: 1, guests: 1 });
  assert.equal(b2.status, 409, 'het phong vat ly phai bi chan');
  const b3 = await post('/api/bookings', guest2Token, { hotelId: 'h1', roomTypeId: 'rt3', checkin: co, checkout: future(93), rooms: 1, guests: 1 });
  assert.equal(b3.status, 201, 'nhan phong dung ngay tra phong cua khach truoc thi duoc');
});

test('giu phong tam (hold) cung chiem ton phong; huy hold thi nha phong', async () => {
  const ci = future(120); const co = future(121);
  // rt5 totalRooms = 2; guest2 giu ca 2 phong nhung CHUA thanh toan
  const hold = await post('/api/bookings', guest2Token, { hotelId: 'h2', roomTypeId: 'rt5', checkin: ci, checkout: co, rooms: 2, guests: 2 });
  assert.equal(hold.status, 201);
  assert.equal(hold.body.status, 'PENDING_PAYMENT');
  const blocked = await post('/api/bookings', guestToken, { hotelId: 'h2', roomTypeId: 'rt5', checkin: ci, checkout: co, rooms: 1, guests: 1 });
  assert.equal(blocked.status, 409);
  const cancel = await post(`/api/bookings/${hold.body.id}/cancel`, guest2Token, {});
  assert.equal(cancel.status, 200);
  const ok = await post('/api/bookings', guestToken, { hotelId: 'h2', roomTypeId: 'rt5', checkin: ci, checkout: co, rooms: 1, guests: 1 });
  assert.equal(ok.status, 201);
});

test('snapshot gia tung dem trong booking khop service pricing', async () => {
  const ci = future(150); const co = future(153);
  const b = await post('/api/bookings', guestToken, { hotelId: 'h2', roomTypeId: 'rt4', checkin: ci, checkout: co, rooms: 1, guests: 2 });
  assert.equal(b.status, 201);
  const expected = quoteStay(950000, ci, co, 1);
  assert.deepEqual(b.body.nightly, expected.nights);
  assert.equal(b.body.total, expected.subtotal);
});

test('ma giam gia: het han bi tu choi, WELCOME10 giam dung tran', async () => {
  const ci = future(160); const co = future(161);
  const expired = await post('/api/bookings', guestToken, { hotelId: 'h2', roomTypeId: 'rt4', checkin: ci, checkout: co, promoCode: 'OLDCODE' });
  assert.equal(expired.status, 400);
  const ok = await post('/api/bookings', guestToken, { hotelId: 'h2', roomTypeId: 'rt4', checkin: ci, checkout: co, promoCode: 'WELCOME10' });
  assert.equal(ok.status, 201);
  const expected = Math.min(roundVnd(ok.body.subtotal * 0.1), 300000);
  assert.equal(ok.body.discount, expected);
  assert.equal(ok.body.total, ok.body.subtotal - expected);
});

test('huy som hoan 100%, huy tre (trong moc mien phi) hoan 50% theo chinh sach rt4', async () => {
  // rt4: freeCancelDays = 2, lateRefundPercent = 50
  const early = await post('/api/bookings', guestToken, { hotelId: 'h2', roomTypeId: 'rt4', checkin: future(30), checkout: future(31), guests: 2 });
  await post(`/api/bookings/${early.body.id}/pay`, guestToken, {});
  const preview = await call(`/api/bookings/${early.body.id}/refund-preview`, guestToken);
  assert.equal(preview.body.refundPercent, 100);
  const c1 = await post(`/api/bookings/${early.body.id}/cancel`, guestToken, {});
  assert.equal(c1.body.refund.refundAmount, early.body.total);

  const late = await post('/api/bookings', guestToken, { hotelId: 'h2', roomTypeId: 'rt4', checkin: future(1), checkout: future(2), guests: 2 });
  await post(`/api/bookings/${late.body.id}/pay`, guestToken, {});
  const c2 = await post(`/api/bookings/${late.body.id}/cancel`, guestToken, {});
  assert.equal(c2.body.refund.refundPercent, 50);
  assert.equal(c2.body.refund.refundAmount, roundVnd(late.body.total * 0.5));
  assert.ok(c2.body.booking.status === 'CANCELLED');
});

test('danh gia: chua check-out thi 403, da o xong thi 201, danh gia trung 409', async () => {
  const notYet = await post('/api/reviews', guestToken, { bookingId: 'bk3', rating: 5, comment: 'Chua di da danh gia' });
  assert.equal(notYet.status, 403);
  const ok = await post('/api/reviews', guestToken, { bookingId: 'bk2', rating: 5, comment: 'Phong dep, an sang ngon!' });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  const dup = await post('/api/reviews', guestToken, { bookingId: 'bk2', rating: 4, comment: 'Danh gia lai' });
  assert.equal(dup.status, 409);
});

test('partner: khong sua duoc KS cua doi tac khac (403), sua cua minh thi 200', async () => {
  const forbidden = await call('/api/partner/hotels/h1', partner2Token, {
    method: 'PUT', body: JSON.stringify({ name: 'Bi doi ten trai phep' }),
  });
  assert.equal(forbidden.status, 403);
  const own = await call('/api/partner/hotels/h1', partner1Token, {
    method: 'PUT', body: JSON.stringify({ description: 'Mo ta cap nhat boi doi tac' }),
  });
  assert.equal(own.status, 200);
  assert.equal(own.body.description, 'Mo ta cap nhat boi doi tac');
  const guestTry = await call('/api/partner/hotels', guestToken);
  assert.equal(guestTry.status, 403);
});

test('partner check-in/check-out: doi tac khac 403, chu KS lam dung luong', async () => {
  const wrong = await post('/api/partner/bookings/bk4/checkin', partner2Token, {});
  assert.equal(wrong.status, 403);
  const ci = await post('/api/partner/bookings/bk4/checkin', partner1Token, {});
  assert.equal(ci.status, 200); assert.equal(ci.body.status, 'CHECKED_IN');
  const co = await post('/api/partner/bookings/bk4/checkout', partner1Token, {});
  assert.equal(co.status, 200); assert.equal(co.body.status, 'CHECKED_OUT');
  const rev = await post('/api/reviews', guest2Token, { bookingId: 'bk4', rating: 4, comment: 'Vi tri dep, phong gon gang' });
  assert.equal(rev.status, 201, 'sau check-out khach moi danh gia duoc');
});

test('admin: duyet KS PENDING -> ACTIVE thi moi hien cong khai; khach thuong khong duyet duoc', async () => {
  const created = await post('/api/partner/hotels', partner3Token, { name: 'Nha Trang Seaside Inn', city: 'Nha Trang', stars: 3 });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'PENDING');
  const beforeApprove = await call('/api/hotels?city=Nha%20Trang');
  assert.equal(beforeApprove.body.count, 0);
  const guestApprove = await post(`/api/admin/hotels/${created.body.id}/approve`, guestToken, {});
  assert.equal(guestApprove.status, 403);
  const approved = await post(`/api/admin/hotels/${created.body.id}/approve`, adminToken, {});
  assert.equal(approved.status, 200); assert.equal(approved.body.status, 'ACTIVE');
  const afterApprove = await call('/api/hotels?city=Nha%20Trang');
  assert.equal(afterApprove.body.count, 1);
});

test('khieu nai: khach tao, admin xu ly RESOLVED', async () => {
  const cp = await post('/api/complaints', guestToken, { hotelId: 'h2', subject: 'Wifi phong 302 yeu', content: 'Wifi mat song lien tuc buoi toi.' });
  assert.equal(cp.status, 201);
  const upd = await call(`/api/admin/complaints/${cp.body.id}`, adminToken, {
    method: 'PUT', body: JSON.stringify({ status: 'RESOLVED', adminNote: 'Da yeu cau KS thay router' }),
  });
  assert.equal(upd.status, 200); assert.equal(upd.body.status, 'RESOLVED');
});

test('admin report + partner revenue: hoa hong san 10% nhat quan', async () => {
  const report = await call('/api/admin/report', adminToken);
  assert.equal(report.status, 200);
  assert.ok(report.body.grossRevenue > 0);
  assert.ok(Math.abs(report.body.commissionRevenue - report.body.grossRevenue * 0.1) < report.body.grossRevenue * 0.01);
  const rev = await call('/api/partner/revenue', partner1Token);
  assert.equal(rev.status, 200);
  assert.ok(rev.body.gross > 0);
  assert.equal(rev.body.netReceived, rev.body.gross - rev.body.commission - rev.body.refundTotal);
});
