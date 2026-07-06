export interface User {
  id: number;
  fullName: string;
  email: string;
  role: "ROLE_USER" | "ROLE_ADMIN";
  avatar?: string;
  loyaltyPoints: number;
  joinedAt: string;
}

export interface District {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export interface Place {
  id: number;
  district_id: number;
  name: string;
}

export interface Turf {
  id: number;
  placeId?: number;
  districtId?: number;
  districtName?: string;
  name: string;
  turfName?: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  sportsType: string;
  sports?: string;
  sport?: string;
  description: string;
  pricePerHour: number;
  price?: number;
  availability?: string;
  availableToday?: boolean;
  isActive: boolean;
  image: string;
  images?: string[];
  rating: number;
  openTime?: string;
  type?: string;
  owner_id?: number;
}

export interface Booking {
  id: number;
  turfId: number;
  userId: number;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
}

export interface Payment {
  id: number;
  bookingId: number;
  userId: number;
  amount: number;
  paymentMethod: "STRIPE" | "UPI" | "CREDIT_CARD";
  transactionId?: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  createdAt: string;
}

export interface Review {
  id: number;
  turfId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: "USER" | "AI";
  message: string;
  timestamp: string;
}

export interface ApiLog {
  id: string;
  timestamp: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  requestBody?: string;
  responseBody?: string;
  status: number;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}
