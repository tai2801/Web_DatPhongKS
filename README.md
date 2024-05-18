# Hotelora Booking — Nền tảng đặt phòng khách sạn trực tuyến

Đồ án môn **Công nghệ Web** — Trường Đại học Công Thương TP.HCM (HUIT).

Hotelora là sàn đặt phòng **đa khách sạn**: đối tác đăng ký bán phòng, admin nền tảng duyệt và thu hoa hồng 10%, khách hàng tìm kiếm — đặt phòng — thanh toán mô phỏng — hủy/hoàn tiền theo chính sách từng loại phòng — đánh giá sau lưu trú.

## Tính năng chính

**Khách hàng**
- Tìm khách sạn theo địa điểm/ngày/số khách; lọc giá, hạng sao, tiện nghi, loại phòng; sắp xếp.
- Gợi ý khách sạn theo ngân sách/đêm kèm điểm phù hợp.
- Chi tiết khách sạn + gallery, xem phòng còn trống theo khoảng ngày và giá từng đêm.
- Đặt phòng nhiều bước với **giữ phòng tạm 15 phút**, mã đặt phòng `HL-XXXXXX`, **thanh toán mô phỏng** (không thu tiền thật).
- Hủy phòng với hoàn tiền tính ở server theo chính sách; đánh giá chỉ sau khi đã check-out; wishlist; khiếu nại.

**Logic đặc trưng (đều tính ở server và có test)**
- **Chống đặt trùng** theo số phòng vật lý + khoảng ngày nửa mở `[checkin, checkout)` — đặt back-to-back vẫn được.
- **Giá động từng đêm:** ngày thường ×1.0, cuối tuần (T6–T7) ×1.15, mùa cao điểm (tháng 6–8, 20/12–05/01) ×1.3; giá được **snapshot** vào đơn.
- **Chính sách hủy theo loại phòng:** hủy miễn phí trước X ngày → hoàn 100%; hủy trễ → hoàn theo % cấu hình; loại không hoàn hủy → 0%. Chính sách cũng được snapshot vào đơn.
- **Mã giảm giá** validate ở server (hạn dùng, đơn tối thiểu, lượt dùng, trần giảm).

**Đối tác khách sạn** — quản lý khách sạn/loại phòng của mình (không sửa được của đối tác khác), xác nhận check-in/check-out, doanh thu sau hoa hồng, phản hồi đánh giá.

**Admin nền tảng** — duyệt/từ chối khách sạn, quản lý người dùng, giao dịch toàn sàn, xử lý khiếu nại, báo cáo doanh thu + hoa hồng.

## Công nghệ

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS 4 | Giao diện khách hàng, đối tác và quản trị |
| Backend | Node.js + Express + JWT + bcryptjs | REST API phân quyền 3 vai trò |
| DB dev/test | SQLite qua `node:sqlite` | Mặc định khi chạy local và unit/API test |
| DB production | PostgreSQL + Prisma (`prisma/schema.prisma`) | Schema chuẩn cho triển khai thực tế |

## Cài đặt & chạy

Yêu cầu: Node.js ≥ 22.

```bash
# Backend (cổng 4100, tự seed dữ liệu mẫu lần đầu)
cd backend
npm install
npm start            # http://localhost:4100/health

# Frontend (cổng 5174, proxy /api sang backend)
cd frontend
npm install
npm run dev          # http://localhost:5174
```

Biến môi trường: sao chép `.env.example` thành `.env` trong `backend/` (PORT, JWT_SECRET, SQLITE_PATH).

## Tài khoản mẫu

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | admin@hotelora.vn | Admin@123 |
| Đối tác 1 (Azure Bay, Hanoi Old Quarter) | partner1@hotelora.vn | Partner@123 |
| Đối tác 2 (Dalat Pine Hill, Phu Quoc Coral) | partner2@hotelora.vn | Partner@123 |
| Đối tác 3 (Saigon Riverside, Hue Heritage — chờ duyệt) | partner3@hotelora.vn | Partner@123 |
| Khách | khach@hotelora.vn | Khach@123 |
| Khách | lan@hotelora.vn | Khach@123 |

## Dữ liệu mẫu

6 khách sạn ở 5 địa điểm (Đà Nẵng, Hà Nội, Đà Lạt, Phú Quốc, TP.HCM + Huế đang chờ duyệt), 11 loại phòng với chính sách hủy khác nhau (gồm 1 loại không hoàn hủy), 3 mã giảm giá (WELCOME10, STAY200K, OLDCODE đã hết hạn để minh họa), 7 đặt phòng mẫu nhiều trạng thái, 2 đánh giá, 1 khiếu nại.

Ảnh khách sạn là **SVG tự sinh** bằng `node tools/generate-images.mjs` (18 ảnh trong `frontend/public/images/`) — không hotlink ảnh ngoài.

## Kiểm thử

```bash
cd backend && npm test     # 19 test: unit logic giá/hoàn tiền + API test (xem docs/TEST_REPORT.md)
cd frontend && npm run build
```

## Cấu trúc thư mục

```
Web_DatPhongKS/
├── backend/            # Express API (39 endpoints) + tests
│   └── src/
│       ├── services/pricing.js   # giá động, hoàn tiền, promo — hàm thuần
│       ├── store/                # lớp dữ liệu SQLite (collection)
│       ├── seed.js               # dữ liệu mẫu
│       └── app.js                # toàn bộ routes theo 3 vai trò
├── frontend/           # React TS: 8 màn hình
├── prisma/schema.prisma  # mô hình PostgreSQL cho production
├── docs/               # Overview, Problem+FR/NFR, Use Case, Architecture,
│                       # Database Diagram, Activity+Sequence, Test Report,
│                       # Future Improvements, References
├── tools/generate-images.mjs
└── screenshots/        # Thư mục ảnh chụp màn hình
```

## Đưa lên GitHub

```bash
git init && git add . && git commit -m "Hotelora Booking - initial release"
git remote add origin https://github.com/tai2801/Web_DatPhongKS.git
git push -u origin main
```

## Giấy phép

MIT — xem `LICENSE`.
