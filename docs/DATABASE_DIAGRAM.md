# Database Diagram — Hotelora

Mô hình dữ liệu (tương ứng 1-1 giữa lớp SQLite dev/test và `prisma/schema.prisma` cho PostgreSQL):

```mermaid
erDiagram
  USER ||--o{ HOTEL : "partner so huu"
  USER ||--o{ BOOKING : "dat phong"
  USER ||--o{ REVIEW : "viet"
  USER ||--o{ WISHLIST : "luu"
  USER ||--o{ COMPLAINT : "gui"
  HOTEL ||--o{ ROOM_TYPE : "co"
  HOTEL ||--o{ BOOKING : "nhan"
  HOTEL ||--o{ REVIEW : "duoc danh gia"
  ROOM_TYPE ||--o{ BOOKING : "duoc dat"
  BOOKING ||--o{ TRANSACTION : "phat sinh"
  BOOKING ||--o| REVIEW : "mo khoa danh gia"

  USER {
    string id PK
    string name
    string email UK
    string passwordHash
    string role "GUEST|PARTNER|ADMIN"
    string phone
  }
  HOTEL {
    string id PK
    string partnerId FK
    string name
    string city
    int stars
    string status "PENDING|ACTIVE|REJECTED"
    json amenities
    json images
  }
  ROOM_TYPE {
    string id PK
    string hotelId FK
    string name
    int basePrice "VND/dem"
    int maxGuests
    int totalRooms "so phong vat ly"
    json cancelPolicy "freeCancelDays, lateRefundPercent, nonRefundable"
  }
  BOOKING {
    string id PK
    string code UK "HL-XXXXXX"
    string userId FK
    string hotelId FK
    string roomTypeId FK
    date checkin
    date checkout
    int rooms
    int guests
    string status "PENDING_PAYMENT|CONFIRMED|CHECKED_IN|CHECKED_OUT|CANCELLED|EXPIRED"
    json nightly "snapshot gia tung dem"
    int subtotal
    int discount
    int total
    json policySnapshot "snapshot chinh sach huy"
    datetime holdExpiresAt
  }
  TRANSACTION {
    string id PK
    string bookingId FK
    string type "PAYMENT_SIMULATED|REFUND_SIMULATED"
    int amount
    int commission "hoa hong san 10%"
    int partnerAmount
  }
  REVIEW {
    string id PK
    string bookingId UK "1 don - 1 danh gia"
    int rating "1..5"
    string comment
    string partnerReply
  }
  PROMOTION {
    string code UK
    string type "PERCENT|FIXED"
    int value
    int maxDiscount
    int minSubtotal
    datetime expiresAt
    int maxUses
    int usedCount
  }
  WISHLIST {
    string id PK
    string userId FK
    string hotelId FK
  }
  COMPLAINT {
    string id PK
    string userId FK
    string hotelId FK
    string status "OPEN|IN_PROGRESS|RESOLVED|REJECTED"
    string adminNote
  }
```

## Ghi chú toàn vẹn

- `Booking.code` duy nhất; `Review.bookingId` duy nhất (mỗi đơn một đánh giá).
- `Wishlist (userId, hotelId)` duy nhất.
- Ràng buộc chống trùng phòng thực thi ở tầng service bằng đếm booking hiệu lực theo khoảng ngày (xem ARCHITECTURE) vì phụ thuộc cả trạng thái và thời gian giữ phòng — không thể biểu diễn bằng UNIQUE đơn thuần.
