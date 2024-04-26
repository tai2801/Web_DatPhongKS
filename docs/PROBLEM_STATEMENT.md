# Problem Statement & Requirements — Hotelora

## Bài toán

Khách sạn vừa và nhỏ tại Việt Nam khó tự xây kênh bán phòng trực tuyến: thiếu hệ thống chống bán trùng phòng, định giá linh hoạt theo mùa và kênh chăm sóc khách sau đặt phòng. Khách du lịch thì phải tra cứu rời rạc từng khách sạn, giá hiển thị thường chưa gồm phụ phí cuối tuần/mùa cao điểm và chính sách hủy không rõ ràng cho tới khi đặt xong.

Hotelora giải quyết bằng một sàn chung: đối tác đăng ký → admin duyệt → bán phòng với giá động minh bạch từng đêm, chính sách hủy công bố trước khi đặt, hoàn tiền tự động theo chính sách khi hủy.

## Functional Requirements (FR)

| Mã | Yêu cầu |
|---|---|
| FR-01 | Khách tìm khách sạn theo địa điểm, ngày, số khách; lọc theo giá, hạng sao, tiện nghi, loại phòng; sắp xếp giá/đánh giá |
| FR-02 | Hệ thống chỉ hiển thị khách sạn ACTIVE và loại phòng còn phòng trống trong khoảng ngày |
| FR-03 | Đặt phòng nhiều bước: chọn phòng → giữ phòng tạm 15 phút → thanh toán mô phỏng → nhận mã đặt phòng HL-XXXXXX |
| FR-04 | Chống đặt trùng: tổng số phòng đã đặt (CONFIRMED/CHECKED_IN/đang giữ) không vượt số phòng vật lý của loại phòng |
| FR-05 | Giá từng đêm theo quy tắc giá động, snapshot vào booking, không thay đổi khi đối tác sửa giá sau đó |
| FR-06 | Áp mã giảm giá hợp lệ (còn hạn, đủ đơn tối thiểu, còn lượt dùng), từ chối mã hết hạn ở server |
| FR-07 | Hủy đặt phòng: tính hoàn tiền theo snapshot chính sách của loại phòng (100% trong mốc miễn phí, % cấu hình khi hủy trễ, 0% với loại không hoàn hủy), ghi giao dịch hoàn mô phỏng |
| FR-08 | Đánh giá khách sạn chỉ với đặt phòng đã CHECKED_OUT, mỗi đặt phòng 1 lần |
| FR-09 | Wishlist khách sạn cho người dùng đã đăng nhập |
| FR-10 | Gợi ý khách sạn theo ngân sách/đêm kèm điểm phù hợp |
| FR-11 | Đối tác CRUD khách sạn/loại phòng của mình (403 với khách sạn của đối tác khác), xác nhận check-in/check-out, xem doanh thu sau hoa hồng, phản hồi đánh giá |
| FR-12 | Admin duyệt/từ chối khách sạn PENDING, xem người dùng, giao dịch toàn sàn, xử lý khiếu nại, báo cáo doanh thu + hoa hồng 10% |
| FR-13 | Khách gửi khiếu nại gắn khách sạn/đặt phòng; admin cập nhật trạng thái xử lý |

## Non-Functional Requirements (NFR)

| Mã | Yêu cầu |
|---|---|
| NFR-01 | Mọi quy tắc tiền (giá động, giảm giá, hoàn tiền, hoa hồng) tính ở server; client chỉ hiển thị |
| NFR-02 | Mật khẩu băm bcrypt; xác thực JWT; phân quyền theo vai trò ở middleware + kiểm tra quyền sở hữu ở từng thao tác đối tác |
| NFR-03 | API trả lỗi JSON thống nhất `{ error }` kèm HTTP status đúng ngữ nghĩa (400/401/403/404/409/410) |
| NFR-04 | Giao diện responsive, tiếng Việt, có trạng thái loading/empty/error |
| NFR-05 | Không chứa khóa bí mật/mật khẩu thật trong source; cấu hình qua `.env` |
| NFR-06 | Bộ test tự động bao phủ logic giá động, hoàn tiền, chống overbook, hold, phân quyền — chạy bằng `npm test` |
