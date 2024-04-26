# Project Overview — Hotelora Booking

**Môn học:** Công nghệ Web — HUIT.

**Hotelora** là nền tảng đặt phòng trực tuyến **đa khách sạn** (marketplace): nhiều đối tác khách sạn cùng đăng bán phòng trên một sàn, khách hàng tìm kiếm/so sánh/đặt phòng xuyên khách sạn, quản trị nền tảng duyệt đối tác, thu hoa hồng và xử lý khiếu nại.

## Ba nhóm người dùng

| Vai trò | Mô tả |
|---|---|
| GUEST | Khách du lịch: tìm kiếm, đặt phòng, thanh toán mô phỏng, hủy theo chính sách, đánh giá, khiếu nại, wishlist |
| PARTNER | Đối tác khách sạn: chỉ quản lý khách sạn của mình — thông tin, loại phòng, giá, chính sách hủy, check-in/out, doanh thu, phản hồi đánh giá |
| ADMIN | Quản trị nền tảng: duyệt/từ chối khách sạn đối tác, quản lý người dùng, giao dịch toàn sàn, xử lý khiếu nại, báo cáo doanh thu + hoa hồng |

## Điểm khác biệt so với các hệ thống đặt phòng đơn khách sạn

1. **Đa khách sạn có đối tác + admin sàn** duyệt đăng ký, xử lý khiếu nại, thu hoa hồng 10%.
2. **Giá động từng đêm**: ngày thường ×1.0, cuối tuần (T6–T7) ×1.15, mùa cao điểm (tháng 6–8 và 20/12–05/01) ×1.3 — tính ở server và **snapshot vào booking**.
3. **Giữ phòng tạm (hold) 15 phút** khi chờ thanh toán + chống đặt trùng theo số phòng vật lý và khoảng ngày nửa mở `[checkin, checkout)`.
4. **Chính sách hủy theo từng loại phòng** (mốc hủy miễn phí + % hoàn khi hủy trễ + loại không hoàn hủy), snapshot vào booking, hoàn tiền tính ở server.
5. **Mã giảm giá** validate ở server + **gợi ý khách sạn theo ngân sách** (điểm phù hợp = rating + độ khớp giá).

## Công nghệ

- Frontend: React + TypeScript + Vite + Tailwind CSS 4.
- Backend: Node.js + Express + JWT + bcryptjs.
- Dữ liệu dev/test: SQLite qua `node:sqlite`.
- Dữ liệu production (thiết kế): PostgreSQL + Prisma — xem `prisma/schema.prisma`.
- Thanh toán: **mô phỏng** — giao dịch ghi rõ loại `PAYMENT_SIMULATED`.
