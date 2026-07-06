import { User, Turf, Booking, Payment, Review } from "./types";

export const DEFAULT_USERS: User[] = [
  {
    id: 1,
    fullName: "Alex Morgan",
    email: "alex@example.com",
    role: "ROLE_USER",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    loyaltyPoints: 340,
    joinedAt: "2026-06-18"
  },
  {
    id: 2,
    fullName: "Marcus Rashford",
    email: "marcus@example.com",
    role: "ROLE_USER",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
    loyaltyPoints: 510,
    joinedAt: "2026-06-22"
  },
  {
    id: 3,
    fullName: "Serena Williams",
    email: "serena@example.com",
    role: "ROLE_USER",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    loyaltyPoints: 120,
    joinedAt: "2026-06-24"
  },
  {
    id: 4,
    fullName: "Admin David",
    email: "david.admin@example.com",
    role: "ROLE_ADMIN",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    loyaltyPoints: 0,
    joinedAt: "2026-06-04"
  },
  {
    id: 5,
    fullName: "Admin Sarah",
    email: "sarah.admin@example.com",
    role: "ROLE_ADMIN",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    loyaltyPoints: 0,
    joinedAt: "2026-06-06"
  }
];

import turfsData from "./data/turfs.json";

export const DEFAULT_TURFS: Turf[] = (turfsData as any[]).map((t: any) => ({
  id: t.id,
  placeId: t.place_id,
  name: t.name,
  location: t.address,
  address: t.address,
  latitude: t.latitude,
  longitude: t.longitude,
  sportsType: t.sports,
  description: `Premium ${t.sports.toLowerCase()} turf in ${t.district}. Equipped with professional floodlights and amenities.`,
  pricePerHour: t.price,
  isActive: true,
  image: t.images?.[0] || "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800",
  images: t.images || ["https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800"],
  rating: t.rating,
  availability: t.availability || "AVAILABLE",
  availableToday: t.availableToday !== undefined ? t.availableToday : true,
  type: t.type || "Indoor",
  openTime: t.openTime || "06:00 AM - 10:00 PM"
}));

export const DEFAULT_BOOKINGS: Booking[] = [
  {
    id: 1,
    turfId: 1,
    userId: 1,
    startTime: "2026-07-05T18:00:00",
    endTime: "2026-07-05T20:00:00",
    totalPrice: 2400,
    status: "CONFIRMED",
    createdAt: "2026-07-01T10:00:00"
  },
  {
    id: 2,
    turfId: 2,
    userId: 2,
    startTime: "2026-07-06T09:00:00",
    endTime: "2026-07-06T12:00:00",
    totalPrice: 4500,
    status: "CONFIRMED",
    createdAt: "2026-07-02T11:30:00"
  },
  {
    id: 3,
    turfId: 3,
    userId: 3,
    startTime: "2026-07-07T15:00:00",
    endTime: "2026-07-07T16:30:00",
    totalPrice: 1500,
    status: "PENDING",
    createdAt: "2026-07-03T09:15:00"
  },
  {
    id: 4,
    turfId: 1,
    userId: 2,
    startTime: "2026-07-08T20:00:00",
    endTime: "2026-07-08T21:00:00",
    totalPrice: 1200,
    status: "CANCELLED",
    createdAt: "2026-07-03T14:45:00"
  }
];

export const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: 1,
    bookingId: 1,
    userId: 1,
    amount: 2400,
    paymentMethod: "STRIPE",
    transactionId: "ch_stripe_9a2b8c7d6e",
    status: "COMPLETED",
    createdAt: "2026-07-01T10:05:00"
  },
  {
    id: 2,
    bookingId: 2,
    userId: 2,
    amount: 4500,
    paymentMethod: "UPI",
    transactionId: "upi_pay_883011928374",
    status: "COMPLETED",
    createdAt: "2026-07-02T11:32:00"
  },
  {
    id: 3,
    bookingId: 3,
    userId: 3,
    amount: 1500,
    paymentMethod: "CREDIT_CARD",
    status: "PENDING",
    createdAt: "2026-07-03T09:15:00"
  },
  {
    id: 4,
    bookingId: 4,
    userId: 2,
    amount: 1200,
    paymentMethod: "STRIPE",
    transactionId: "ch_stripe_1a2b3c4d5e",
    status: "REFUNDED",
    createdAt: "2026-07-03T15:00:00"
  }
];

export const DEFAULT_REVIEWS: Review[] = [
  {
    id: 1,
    turfId: 1,
    userId: 1,
    userName: "Alex Morgan",
    rating: 5,
    comment: "Absolutely outstanding indoor football turf. The astroturf feels like natural grass and the lighting is perfect for late evening matches!",
    createdAt: "2026-07-02"
  },
  {
    id: 2,
    turfId: 2,
    userId: 2,
    userName: "Marcus Rashford",
    rating: 4,
    comment: "Very well-maintained pitch for cricket. The practice nets were extremely helpful. Deducting one star because canteen facilities are limited.",
    createdAt: "2026-07-03"
  },
  {
    id: 3,
    turfId: 1,
    userId: 3,
    userName: "Serena Williams",
    rating: 5,
    comment: "Clean, spacious, and very easy parking access. We held a local friendly match here and everyone loved the facilities.",
    createdAt: "2026-07-03"
  }
];

// RAG Knowledge base documents
export const RAG_DOCUMENTS = [
  {
    title: "General Facility Rules & Shoes Rules",
    category: "RULES",
    content: "All players must wear non-marking sports shoes. Cleats are allowed only on natural turf. Food and soft drinks are strictly prohibited on the play area. Smoking, vaping, and alcohol are banned. Metal studs are forbidden to prevent turf degradation."
  },
  {
    title: "Slot Allocation Policy",
    category: "SLOT_POLICIES",
    content: "Slots are allocated on a first-come, first-served basis. AI scheduler holds pending slots for up to 10 minutes. If multiple reservations collide during the grace period, the user with a pre-validated payment method takes immediate precedence."
  },
  {
    title: "Cancellation & Refund Rules",
    category: "CANCELLATION",
    content: "Reservations can be fully cancelled and refunded up to 24 hours prior to the scheduled start time. Cancellations requested less than 24 hours in advance will forfeit 50% of the booking fee. No-shows are charged at 100% price. Refunds take 3-5 business days."
  }
];

// Simple cosine distance simulator on text keywords (acting as vector database text-embedding-004 logic)
export function calculateVectorSimilarity(query: string, text: string): number {
  const cleanQuery = query.toLowerCase().trim();
  const cleanText = text.toLowerCase().trim();
  
  if (!cleanQuery) return 0.5;

  const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 2);
  if (queryWords.length === 0) return 0.5;

  let matches = 0;
  queryWords.forEach(word => {
    if (cleanText.includes(word)) {
      matches += 1.2; // heavy weights for exact matches
    }
    // partial matches
    else {
      const subWords = cleanText.split(/\s+/);
      subWords.forEach(sub => {
        if (sub.includes(word) || word.includes(sub)) {
          matches += 0.4;
        }
      });
    }
  });

  // Normalize similarity between 0.35 and 0.98
  const score = 0.35 + (matches / queryWords.length) * 0.6;
  return Math.min(Math.max(score, 0.35), 0.98);
}
