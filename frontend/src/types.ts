export interface Hotel {
  id: string; partnerId: string; name: string; city: string; address: string;
  stars: number; status: string; amenities: string[]; description: string;
  images: string[]; ratingAvg: number | null; ratingCount: number;
  startingAvgNightly: number | null; availableTypes?: number; roomTypeCount?: number;
  fitScore?: number;
}

export interface CancelPolicy { freeCancelDays: number; lateRefundPercent: number; nonRefundable: boolean }

export interface RoomType {
  id: string; hotelId: string; name: string; basePrice: number; maxGuests: number;
  totalRooms: number; sizeM2: number; bed: string; cancelPolicy: CancelPolicy;
  availableRooms?: number;
  quote?: { nights: NightPrice[]; nightCount: number; subtotal: number };
}

export interface NightPrice { date: string; kind: 'WEEKDAY' | 'WEEKEND' | 'PEAK'; multiplier: number; pricePerRoom: number }

export interface Booking {
  id: string; code: string; userId: string; hotelId: string; roomTypeId: string;
  checkin: string; checkout: string; rooms: number; guests: number;
  guestName: string; guestPhone?: string; status: string;
  nightly: NightPrice[]; subtotal: number; discount: number; promoCode: string | null;
  total: number; policySnapshot: CancelPolicy; paymentStatus: string; refundAmount: number;
  holdExpiresAt: string | null; createdAt: string;
  hotelName?: string; hotelCity?: string; roomTypeName?: string;
}

export interface Review {
  id: string; bookingId: string; userId: string; hotelId: string;
  rating: number; comment: string; partnerReply: string | null; createdAt: string;
}

export type View =
  | { name: 'home' }
  | { name: 'hotel'; hotelId: string }
  | { name: 'checkout'; booking: Booking }
  | { name: 'bookings' }
  | { name: 'wishlist' }
  | { name: 'auth' }
  | { name: 'partner' }
  | { name: 'admin' };
