# Future Improvements — Hotelora

1. **Production database:** triển khai Prisma + PostgreSQL theo `prisma/schema.prisma`, viết adapter Prisma cho lớp store, chạy `prisma migrate` và bộ test hiện tại trên PostgreSQL thật; bổ sung transaction/row-lock khi trừ tồn phòng để chịu tải đồng thời cao.
2. **Cổng thanh toán trực tuyến:** tích hợp cổng thanh toán (VNPay/MoMo) có webhook xác nhận và đối soát giao dịch.
3. **Rate calendar theo khách sạn:** cho đối tác tự đặt hệ số giá theo khoảng ngày lễ riêng thay cho quy tắc mùa cố định toàn sàn.
4. **Thông báo:** email/SMS xác nhận đặt phòng, nhắc check-in, thông báo khi khiếu nại được xử lý (hàng đợi + template).
5. **Tìm kiếm nâng cao:** gợi ý theo lịch sử xem/đặt, bản đồ vị trí khách sạn, bộ lọc khoảng cách tới điểm du lịch.
6. **Đa ngôn ngữ & đa tiền tệ** cho khách quốc tế; SEO cho trang chi tiết khách sạn.
7. **Chống gian lận đánh giá:** gắn cờ đánh giá bất thường, cho admin sàn ẩn đánh giá vi phạm.
8. **Ảnh thật:** thay SVG minh họa bằng ảnh do đối tác tải lên (lưu trữ đối tượng + kiểm duyệt nội dung).
