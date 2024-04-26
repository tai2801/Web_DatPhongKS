# TEST REPORT — Hotelora Booking

Ngày chạy: 18/05/2024 · Môi trường: Windows 10, Node.js, SQLite qua `node:sqlite`.

## 1. Backend tests — `npm test` (node:test)

Kết quả: **19/19 PASS** (5 unit test logic thuần + 14 API test trên server HTTP, DB SQLite in-memory đã seed).

Nhóm kiểm thử chính:
- **Giá động:** 04/03/2024 (thứ Hai) ×1.0; 08–09/03 (T6–T7) ×1.15; 17/07/2024 ×1.3 (tháng cao điểm); 27/12/2024 ×1.3 dù là thứ Sáu (ưu tiên mùa cao điểm); `quoteStay` tính từng đêm + nhân số phòng.
- **Hoàn tiền:** trong mốc miễn phí hoàn 100%; hủy trễ hoàn 50% theo chính sách `rt4` (mốc 2 ngày); loại không hoàn hủy hoàn 0%.
- **Chống overbook:** `rt3` có 2 phòng vật lý — đặt hết 2 phòng + thanh toán thì đơn chồng lấn bị HTTP 409; đặt back-to-back (nhận đúng ngày trả của đơn trước) vẫn được HTTP 201.
- **Giữ phòng tạm:** booking chưa thanh toán vẫn chiếm tồn phòng (đơn khác bị 409); hủy hold thì phòng được nhả.
- **Snapshot giá:** `nightly` trong booking khớp chính xác output của service pricing.
- **Mã giảm giá:** `OLDCODE` hết hạn → 400; `WELCOME10` giảm 10% đúng trần 300.000₫.
- **Hủy qua API:** xem trước `refund-preview` 100% → hủy hoàn đủ; đơn nhận phòng ngày mai (trong mốc trễ) hoàn đúng 50% (làm tròn nghìn).
- **Đánh giá:** booking chưa check-out → 403; đã check-out (`bk2`) → 201; đánh giá trùng → 409; sau khi partner check-out `bk4`, khách đánh giá được ngay.
- **Phân quyền đối tác:** `partner2` sửa khách sạn của `partner1` → 403; sửa của mình → 200; khách thường vào API partner → 403; partner khác check-in đơn của `partner1` → 403.
- **Admin:** khách sạn mới tạo ở trạng thái `PENDING` không hiện trong tìm kiếm công khai; khách thường duyệt → 403; admin duyệt → `ACTIVE` và xuất hiện; khiếu nại được admin chuyển `RESOLVED`.
- **Hoa hồng:** báo cáo admin có `commissionRevenue` ≈ 10% doanh thu gộp; doanh thu partner: `netReceived = gross − commission − refundTotal`.

## 2. Kiểm thử tích hợp API (curl)

Chạy `PORT=4100 node src/server.js` rồi gọi API:
- `GET /health` → `{ ok: true, service: 'hotelora', store: 'SqliteStore' }`.
- Đăng nhập `khach@hotelora.vn` → nhận JWT.
- `GET /api/hotels?city=Da Nang` → 1 kết quả (Azure Bay Resort & Spa).
- `GET /api/hotels/suggestions?budget=1000000` → có kết quả kèm `fitScore`, giá/đêm ≤ 1.000.000₫.
- Tạo booking `h2/rt4` ngày 24–26/12/2024 + mã `WELCOME10` → 201; cả 2 đêm đều `PEAK ×1.3` = 1.235.000₫/đêm (giá gốc 950.000₫), tạm tính 2.470.000₫, giảm 247.000₫, tổng **2.223.000₫**, có `holdExpiresAt` +15 phút và `policySnapshot`.

## 3. Frontend build

```
npm install && npm run build   (tsc -b && vite build)
→ 40 modules transformed, dist JS 184.57 kB (gzip 56.25 kB), CSS 16.91 kB — PASS
```
