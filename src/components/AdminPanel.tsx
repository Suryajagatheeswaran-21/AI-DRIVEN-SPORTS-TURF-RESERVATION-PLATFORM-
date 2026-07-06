import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  Layers, 
  Database, 
  Trash2, 
  PlusCircle, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Award,
  RefreshCw,
  Users,
  Edit,
  Shield,
  Download,
  Search,
  Plus,
  CreditCard,
  Filter,
  Activity,
  FileSpreadsheet,
  Settings
} from "lucide-react";
import { Turf, Booking, Payment, User } from "../types";

interface AdminPanelProps {
  turfs: Turf[];
  setTurfs: React.Dispatch<React.SetStateAction<Turf[]>>;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onAddTurf: (turf: Omit<Turf, "id" | "rating">) => void;
  onDeleteTurf: (id: number) => void;
  onUpdateBookingStatus: (id: number, status: "CONFIRMED" | "CANCELLED") => void;
  onAddApiLog: (method: "GET" | "POST" | "DELETE" | "PUT", url: string, reqBody?: string, respBody?: string, status?: number) => void;
}

export default function AdminPanel({
  turfs,
  setTurfs,
  bookings,
  setBookings,
  payments,
  setPayments,
  users,
  setUsers,
  onAddTurf,
  onDeleteTurf,
  onUpdateBookingStatus,
  onAddApiLog
}: AdminPanelProps) {
  // Navigation inside Admin Control Panel
  const [adminTab, setAdminTab] = useState<"overview" | "users" | "turfs" | "bookings" | "payments" | "reports">("overview");

  // Filter/Search states
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [turfSearch, setTurfSearch] = useState("");
  const [turfSportFilter, setTurfSportFilter] = useState<string>("ALL");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("ALL");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("ALL");

  // Modals / Forms States
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState<"ROLE_USER" | "ROLE_ADMIN">("ROLE_USER");
  const [newUserPoints, setNewUserPoints] = useState("100");

  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Turf Edit Modal State
  const [editingTurf, setEditingTurf] = useState<Turf | null>(null);

  // Booking Create State (Admin creating on behalf of any user)
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [newBookingUserId, setNewBookingUserId] = useState<string>("");
  const [newBookingTurfId, setNewBookingTurfId] = useState<string>("");
  const [newBookingDate, setNewBookingDate] = useState("2026-07-05");
  const [newBookingHour, setNewBookingHour] = useState("18");

  // Booking Edit State
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Add turf modal form state (for Tab)
  const [showAddTurfForm, setShowAddTurfForm] = useState(false);
  const [newTurfName, setNewTurfName] = useState("");
  const [newTurfLocation, setNewTurfLocation] = useState("");
  const [newTurfType, setNewTurfType] = useState<"FOOTBALL" | "CRICKET" | "TENNIS" | "SQUASH" | "BASKETBALL">("FOOTBALL");
  const [newTurfPrice, setNewTurfPrice] = useState("100");
  const [newTurfDesc, setNewTurfDesc] = useState("");
  const [newTurfImage, setNewTurfImage] = useState("");

  // Reports interactive simulations
  const [reportingMonth, setReportingMonth] = useState("2026-07");
  const [reportProgress, setReportProgress] = useState<string[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activeReportData, setActiveReportData] = useState<any>(null);

  // --- DYNAMIC OVERVIEW STATS CALCULATIONS ---
  const completedPayments = payments.filter(p => p.status === "COMPLETED");
  const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const refundAmount = payments.filter(p => p.status === "REFUNDED").reduce((sum, p) => sum + p.amount, 0);

  const activeBookingsCount = bookings.filter(b => b.status === "CONFIRMED").length;
  const pendingBookingsCount = bookings.filter(b => b.status === "PENDING").length;
  const cancelledBookingsCount = bookings.filter(b => b.status === "CANCELLED").length;

  const totalRegisteredUsers = users.length;
  const customerCount = users.filter(u => u.role === "ROLE_USER").length;
  const administratorCount = users.filter(u => u.role === "ROLE_ADMIN").length;

  // --- COMPUTE ACTUAL DYNAMIC STATS FOR POPULARITY ---
  const sportsTypeCount: Record<string, number> = { FOOTBALL: 0, CRICKET: 0, TENNIS: 0, SQUASH: 0, BASKETBALL: 0 };
  bookings.forEach(b => {
    const turf = turfs.find(t => t.id === b.turfId);
    if (turf && b.status === "CONFIRMED") {
      sportsTypeCount[turf.sportsType] = (sportsTypeCount[turf.sportsType] || 0) + 1;
    }
  });
  const maxSportBookings = Math.max(...Object.values(sportsTypeCount), 1);

  // --- COMPUTE DYNAMIC GATEWAY SPLITS ---
  const gatewaySplits: Record<string, number> = { STRIPE: 0, UPI: 0, CREDIT_CARD: 0 };
  payments.forEach(p => {
    if (p.status === "COMPLETED") {
      gatewaySplits[p.paymentMethod] = (gatewaySplits[p.paymentMethod] || 0) + p.amount;
    }
  });
  const totalGatewayAmount = Object.values(gatewaySplits).reduce((a, b) => a + b, 1);

  // --- USER HANDLERS ---
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserFullName) return;

    if (users.some(u => u.email.toLowerCase() === newUserEmail.toLowerCase())) {
      alert("Email is already registered on AreaAI.");
      return;
    }

    const newUserObj: User = {
      id: users.length + 1,
      fullName: newUserFullName,
      email: newUserEmail,
      role: newUserRole,
      loyaltyPoints: parseInt(newUserPoints) || 100,
      joinedAt: new Date().toISOString().split("T")[0],
      avatar: `https://images.unsplash.com/photo-${newUserFullName.includes("Sarah") ? "1494790108377-be9c29b29330" : "1535713875002-d1d0cf377fde"}?w=150`
    };

    setUsers(prev => [...prev, newUserObj]);
    setShowAddUser(false);
    
    // Reset Form
    setNewUserEmail("");
    setNewUserFullName("");
    setNewUserRole("ROLE_USER");
    setNewUserPoints("100");

    onAddApiLog(
      "POST",
      "/api/v1/admin/users",
      JSON.stringify(newUserObj),
      JSON.stringify({ status: "CREATED", user: newUserObj }),
      201
    );
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
    
    onAddApiLog(
      "PUT",
      `/api/v1/admin/users/${editingUser.id}`,
      JSON.stringify(editingUser),
      JSON.stringify({ status: "UPDATED", user: editingUser }),
      200
    );

    setEditingUser(null);
  };

  const handleDeleteUser = (userId: number) => {
    if (confirm("Are you sure you want to delete this user? All their bookings will be isolated.")) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setBookings(prev => prev.filter(b => b.userId !== userId));
      setPayments(prev => prev.filter(p => p.userId !== userId));
      
      onAddApiLog(
        "DELETE",
        `/api/v1/admin/users/${userId}`,
        undefined,
        JSON.stringify({ status: "DELETED_SUCCESS", id: userId }),
        200
      );
    }
  };

  // --- TURF HANDLERS ---
  const handleAddNewTurf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTurfName || !newTurfLocation || !newTurfPrice) return;

    const imgUrl = newTurfImage || "https://images.unsplash.com/photo-1517747614396-d21a78b850e8?w=800";
    const turfData = {
      name: newTurfName,
      location: newTurfLocation,
      sportsType: newTurfType,
      description: newTurfDesc || "Premium sports arena featuring state-of-the-art facilities, nighttime floodlights, and a lush playing surface.",
      pricePerHour: parseFloat(newTurfPrice),
      isActive: true,
      image: imgUrl
    };

    onAddTurf(turfData);

    // Reset Form
    setNewTurfName("");
    setNewTurfLocation("");
    setNewTurfPrice("100");
    setNewTurfDesc("");
    setNewTurfImage("");
    setShowAddTurfForm(false);
  };

  const handleUpdateTurfDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTurf) return;

    setTurfs(prev => prev.map(t => t.id === editingTurf.id ? editingTurf : t));

    onAddApiLog(
      "PUT",
      `/api/v1/admin/turfs/update/${editingTurf.id}`,
      JSON.stringify(editingTurf),
      JSON.stringify({ status: "MODIFIED", turf: editingTurf }),
      200
    );

    setEditingTurf(null);
  };

  const handleDeleteTurf = (turfId: number) => {
    if (confirm("Delete this arena catalog entry? Customers will no longer be able to discover or schedule slots on this turf.")) {
      onDeleteTurf(turfId);
    }
  };

  // --- BOOKING HANDLERS ---
  const handleCreateAdminBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookingUserId || !newBookingTurfId) return;

    const matchedTurf = turfs.find(t => t.id === parseInt(newBookingTurfId));
    const matchedUser = users.find(u => u.id === parseInt(newBookingUserId));
    if (!matchedTurf || !matchedUser) return;

    // Check overlap
    const targetStartTime = `${newBookingDate}T${newBookingHour.padStart(2, "0")}:00:00`;
    const hasCollision = bookings.some(b => 
      b.turfId === matchedTurf.id && 
      b.startTime === targetStartTime && 
      b.status === "CONFIRMED"
    );

    if (hasCollision) {
      alert("Scheduling Conflict! This slot is already booked for this Arena.");
      return;
    }

    const price = matchedTurf.pricePerHour;
    const bookingId = bookings.length + 1;

    const newBookingObj: Booking = {
      id: bookingId,
      turfId: matchedTurf.id,
      userId: matchedUser.id,
      startTime: targetStartTime,
      endTime: `${newBookingDate}T${(parseInt(newBookingHour) + 1).toString().padStart(2, "0")}:00:00`,
      totalPrice: price,
      status: "CONFIRMED",
      createdAt: new Date().toISOString()
    };

    const newPaymentObj: Payment = {
      id: payments.length + 1,
      bookingId: bookingId,
      userId: matchedUser.id,
      amount: price,
      paymentMethod: "STRIPE",
      transactionId: `ch_admin_${Math.random().toString(36).substring(2, 12)}`,
      status: "COMPLETED",
      createdAt: new Date().toISOString()
    };

    setBookings(prev => [newBookingObj, ...prev]);
    setPayments(prev => [newPaymentObj, ...prev]);
    setShowAddBooking(false);

    onAddApiLog(
      "POST",
      "/api/v1/admin/bookings",
      JSON.stringify(newBookingObj),
      JSON.stringify({ status: "CREATED", booking: newBookingObj, payment: newPaymentObj }),
      201
    );
  };

  const handleUpdateBookingDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    setBookings(prev => prev.map(b => b.id === editingBooking.id ? editingBooking : b));

    onAddApiLog(
      "PUT",
      `/api/v1/admin/bookings/${editingBooking.id}`,
      JSON.stringify(editingBooking),
      JSON.stringify({ status: "MODIFIED", booking: editingBooking }),
      200
    );

    setEditingBooking(null);
  };

  const handleDeleteBooking = (bookingId: number) => {
    if (confirm("Permanently erase booking record from platform audits?")) {
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      setPayments(prev => prev.filter(p => p.bookingId !== bookingId));
      
      onAddApiLog(
        "DELETE",
        `/api/v1/admin/bookings/${bookingId}`,
        undefined,
        JSON.stringify({ success: true, bookingId }),
        200
      );
    }
  };

  // --- PAYMENT HANDLERS ---
  const handleUpdatePaymentStatus = (paymentId: number, status: Payment["status"]) => {
    setPayments(prev => prev.map(p => {
      if (p.id === paymentId) {
        // Automatically sync associated booking if payment fails or is refunded
        if (status === "REFUNDED" || status === "FAILED") {
          setBookings(bPrev => bPrev.map(b => b.id === p.bookingId ? { ...b, status: "CANCELLED" } : b));
        } else if (status === "COMPLETED") {
          setBookings(bPrev => bPrev.map(b => b.id === p.bookingId ? { ...b, status: "CONFIRMED" } : b));
        }
        return { ...p, status };
      }
      return p;
    }));

    onAddApiLog(
      "PUT",
      `/api/v1/admin/payments/${paymentId}/status?status=${status}`,
      undefined,
      JSON.stringify({ success: true, paymentId, status }),
      200
    );
  };

  // --- REPORTS HANDLER (Simulated Console consolidation with CSV Export) ---
  const triggerPerformanceReport = () => {
    setIsGeneratingReport(true);
    setReportProgress([]);
    
    const steps = [
      "Accessing local database nodes...",
      "Consolidating 1536-dimensional HNSW vector index files...",
      "Reading customer bookings mapped to Spring Security contexts...",
      "Aggregating gross revenue splits on Stripe & UPI pathways...",
      "Resolving facility cancellations and refunds...",
      "Platform Performance Audit consolidated successfully!"
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setReportProgress(prev => [...prev, step]);
        if (index === steps.length - 1) {
          setIsGeneratingReport(false);
          // Generate actual consolidated stats
          const activeSportsBreakdown = { ...sportsTypeCount };
          const activeRevenueBreakdown = { ...gatewaySplits };
          const activeUsageCount = bookings.length;
          const grossSpend = totalRevenue;

          setActiveReportData({
            generatedAt: new Date().toLocaleString(),
            month: reportingMonth,
            activeUsageCount,
            grossSpend,
            activeSportsBreakdown,
            activeRevenueBreakdown,
            auditStatus: "SECURE_PASS"
          });

          onAddApiLog(
            "GET",
            `/api/v1/admin/reports/consolidate?month=${reportingMonth}`,
            undefined,
            JSON.stringify({ generated: true, timestamp: new Date().toISOString() }),
            200
          );
        }
      }, (index + 1) * 600);
    });
  };

  // --- ACTUAL DYNAMIC CLIENT-SIDE CSV EXPORT ---
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "--- ARENAAI SYSTEM PERFORMANCE AUDIT ---\r\n";
    csvContent += `Generated At,${new Date().toLocaleString()}\r\n`;
    csvContent += `Selected Month,${reportingMonth}\r\n`;
    csvContent += `Total Customers,${customerCount}\r\n`;
    csvContent += `Registered Arenas,${turfs.length}\r\n`;
    csvContent += `Total Gross Revenue,$${totalRevenue.toFixed(2)}\r\n`;
    csvContent += `Refund Volume,$${refundAmount.toFixed(2)}\r\n\r\n`;

    csvContent += "--- ACTIVE SPORT BOOKINGS ---\r\n";
    Object.entries(sportsTypeCount).forEach(([sport, count]) => {
      csvContent += `${sport},${count} Games\r\n`;
    });
    csvContent += "\r\n";

    csvContent += "--- PAYMENT GATEWAYS splits ---\r\n";
    Object.entries(gatewaySplits).forEach(([gateway, amt]) => {
      csvContent += `${gateway},$${amt.toFixed(2)}\r\n`;
    });
    csvContent += "\r\n";

    csvContent += "--- ACTIVE TURF CATALOG MATRIX ---\r\n";
    csvContent += "ID,Name,Type,Location,HourlyPrice,Status\r\n";
    turfs.forEach(t => {
      csvContent += `${t.id},"${t.name.replace(/"/g, '""')}",${t.sportsType},"${t.location.replace(/"/g, '""')}",$${t.pricePerHour},${t.isActive ? "ACTIVE" : "INACTIVE"}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `arenaai_performance_audit_${reportingMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddApiLog(
      "GET",
      `/api/v1/admin/reports/export?format=CSV&month=${reportingMonth}`,
      undefined,
      "CSV Generated and downloaded in browser",
      200
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub navigation bar */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl max-w-fit">
        {[
          { id: "overview", label: "Dashboard Overview", icon: Activity },
          { id: "users", label: "Manage Users", icon: Users },
          { id: "turfs", label: "Manage Turfs", icon: Layers },
          { id: "bookings", label: "Manage Bookings", icon: Calendar },
          { id: "payments", label: "Manage Payments", icon: CreditCard },
          { id: "reports", label: "Interactive Reports", icon: FileSpreadsheet }
        ].map((tab) => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                adminTab === tab.id
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <IconComp className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* --- SUB TAB 1: OVERVIEW DASHBOARD --- */}
      {adminTab === "overview" && (
        <div className="space-y-6">
          {/* Overview Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Gross Platform Revenue</p>
                <h4 className="text-xl font-black text-emerald-400 mt-1">${totalRevenue.toFixed(2)}</h4>
                <p className="text-[10px] text-slate-400 mt-1">Refund claims: ${refundAmount.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-500/10 p-2.5 rounded-lg text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Active Allocations</p>
                <h4 className="text-xl font-black text-cyan-400 mt-1">{activeBookingsCount} Slots</h4>
                <p className="text-[10px] text-slate-400 mt-1">{pendingBookingsCount} pending approvals</p>
              </div>
              <div className="bg-cyan-500/10 p-2.5 rounded-lg text-cyan-400">
                <Calendar className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Registered Turfs</p>
                <h4 className="text-xl font-black text-white mt-1">{turfs.length} Arenas</h4>
                <p className="text-[10px] text-slate-400 mt-1">Vector search indexed</p>
              </div>
              <div className="bg-blue-500/10 p-2.5 rounded-lg text-blue-400">
                <Layers className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Players</p>
                <h4 className="text-xl font-black text-purple-400 mt-1">{customerCount} Players</h4>
                <p className="text-[10px] text-slate-400 mt-1">{administratorCount} Admin Privileges</p>
              </div>
              <div className="bg-purple-500/10 p-2.5 rounded-lg text-purple-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Dynamic SVG Charts with Hover Effect */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Live Sports Popularity Index (Bookings Count)
              </h4>
              <div className="h-44 flex items-end gap-5 px-4 pt-4">
                {Object.entries(sportsTypeCount).map(([sport, count]) => {
                  const pct = Math.max((count / maxSportBookings) * 85, 8);
                  return (
                    <div key={sport} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full bg-emerald-500/30 rounded-t-md relative group cursor-pointer" style={{ height: `${pct}%` }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500 to-cyan-400 opacity-80 rounded-t-md"></div>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-emerald-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded shadow">
                          {count}
                        </div>
                      </div>
                      <span className="text-[8px] font-mono font-bold text-slate-400 uppercase truncate max-w-full">{sport}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 bg-slate-900/60 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-cyan-400" />
                Payment Gateway Revenue Splits
              </h4>
              <div className="h-44 flex items-center justify-around">
                {Object.entries(gatewaySplits).map(([gateway, amount]) => {
                  const share = totalGatewayAmount > 1 ? Math.round((amount / totalGatewayAmount) * 100) : 0;
                  const borderCol = gateway === "STRIPE" ? "border-emerald-400" : gateway === "UPI" ? "border-cyan-400" : "border-slate-500";
                  return (
                    <div key={gateway} className="flex flex-col items-center gap-2">
                      <div className={`h-16 w-16 rounded-full border-4 ${borderCol} flex flex-col items-center justify-center bg-slate-950 shadow`}>
                        <span className="text-xs font-black text-white">{share}%</span>
                      </div>
                      <span className="text-[9px] font-mono font-extrabold text-slate-400">{gateway}</span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold">${amount.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB TAB 2: MANAGE USERS (CRUD) --- */}
      {adminTab === "users" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">System Users CRUD Controller</h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users..."
                    className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1 text-xs pl-8 w-44 focus:outline-none focus:border-emerald-500"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2" />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-slate-950 text-slate-300 border border-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Roles</option>
                  <option value="ROLE_USER">Customer (ROLE_USER)</option>
                  <option value="ROLE_ADMIN">Admin (ROLE_ADMIN)</option>
                </select>
                <button
                  onClick={() => setShowAddUser(!showAddUser)}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[10px] rounded flex items-center gap-1 cursor-pointer transition-all uppercase"
                >
                  <Plus className="h-3.5 w-3.5" /> Add User
                </button>
              </div>
            </div>

            {/* Add User Form Collapse */}
            <AnimatePresence>
              {showAddUser && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleCreateUser}
                  className="p-4 bg-slate-950/80 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs overflow-hidden"
                >
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Authorization Privilege Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 focus:border-emerald-500"
                    >
                      <option value="ROLE_USER">ROLE_USER (Customer)</option>
                      <option value="ROLE_ADMIN">ROLE_ADMIN (Platform Admin)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Starting Loyalty Points</label>
                    <input
                      type="number"
                      value={newUserPoints}
                      onChange={(e) => setNewUserPoints(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded cursor-pointer hover:bg-emerald-600 transition-colors"
                    >
                      Commit User Registration
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Edit User Form Modal (Overlay if active) */}
            {editingUser && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <form
                  onSubmit={handleUpdateUser}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs"
                >
                  <h4 className="text-sm font-black text-white border-b border-slate-800 pb-2">Modify User Account Properties</h4>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editingUser.fullName}
                      onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Email address</label>
                    <input
                      type="email"
                      required
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Loyalty Account Points</label>
                    <input
                      type="number"
                      value={editingUser.loyaltyPoints}
                      onChange={(e) => setEditingUser({ ...editingUser, loyaltyPoints: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Privilege Level</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2"
                    >
                      <option value="ROLE_USER">ROLE_USER (Customer)</option>
                      <option value="ROLE_ADMIN">ROLE_ADMIN (Platform Administrator)</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded"
                    >
                      Apply Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List users */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80">
                    <th className="p-3">User Profile</th>
                    <th className="p-3">Joined Date</th>
                    <th className="p-3">Spring Role Privilege</th>
                    <th className="p-3">Loyalty Points</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {users
                    .filter(u => {
                      const matchesSearch = u.fullName.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
                      const matchesRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
                      return matchesSearch && matchesRole;
                    })
                    .map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/20 text-slate-200">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <img src={user.avatar} className="h-7 w-7 rounded-lg object-cover border border-slate-700" alt="" />
                            <div>
                              <span className="font-bold block">{user.fullName}</span>
                              <span className="text-[10px] text-slate-500 font-mono block">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-400 font-mono">{user.joinedAt || "2026-07-01"}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            user.role === "ROLE_ADMIN" 
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-cyan-400">{user.loyaltyPoints} Pts</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="text-cyan-400 hover:text-cyan-300 p-1 hover:bg-cyan-500/10 rounded cursor-pointer"
                              title="Edit user profile properties"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB TAB 3: MANAGE TURFS (CRUD) --- */}
      {adminTab === "turfs" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Turf Arenas Database CRUD</h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={turfSearch}
                    onChange={(e) => setTurfSearch(e.target.value)}
                    placeholder="Search arenas..."
                    className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1 text-xs pl-8 w-44 focus:outline-none focus:border-emerald-500"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2" />
                </div>
                <select
                  value={turfSportFilter}
                  onChange={(e) => setTurfSportFilter(e.target.value)}
                  className="bg-slate-950 text-slate-300 border border-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Sports</option>
                  <option value="FOOTBALL">Football</option>
                  <option value="CRICKET">Cricket</option>
                  <option value="TENNIS">Tennis</option>
                  <option value="SQUASH">Squash</option>
                  <option value="BASKETBALL">Basketball</option>
                </select>
                <button
                  onClick={() => setShowAddTurfForm(!showAddTurfForm)}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[10px] rounded flex items-center gap-1 cursor-pointer transition-all uppercase animate-pulse"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Turf
                </button>
              </div>
            </div>

            {/* Turf Add Form Collapse */}
            <AnimatePresence>
              {showAddTurfForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleAddNewTurf}
                  className="p-4 bg-slate-950/80 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs overflow-hidden"
                >
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Arena Name *</label>
                    <input
                      type="text"
                      required
                      value={newTurfName}
                      onChange={(e) => setNewTurfName(e.target.value)}
                      placeholder="Arena Park Field 4"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Address Location *</label>
                    <input
                      type="text"
                      required
                      value={newTurfLocation}
                      onChange={(e) => setNewTurfLocation(e.target.value)}
                      placeholder="Downtown Precinct"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Sport Classification</label>
                    <select
                      value={newTurfType}
                      onChange={(e) => setNewTurfType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                    >
                      <option value="FOOTBALL">FOOTBALL</option>
                      <option value="CRICKET">CRICKET</option>
                      <option value="TENNIS">TENNIS</option>
                      <option value="SQUASH">SQUASH</option>
                      <option value="BASKETBALL">BASKETBALL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Hourly Ticket Cost ($) *</label>
                    <input
                      type="number"
                      required
                      value={newTurfPrice}
                      onChange={(e) => setNewTurfPrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 font-semibold mb-1">Semantic Metadata Description (for pgvector Similarity Search)</label>
                    <textarea
                      value={newTurfDesc}
                      onChange={(e) => setNewTurfDesc(e.target.value)}
                      placeholder="Add descriptions about turf size, turf spikes clearance, ceiling height, and lighting specs..."
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 h-16"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 font-semibold mb-1">Image URL</label>
                    <input
                      type="text"
                      value={newTurfImage}
                      onChange={(e) => setNewTurfImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                    />
                  </div>
                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded cursor-pointer hover:bg-emerald-600 transition-colors"
                    >
                      Insert Arena to Database Node
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Edit Turf Overlay Modal */}
            {editingTurf && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <form
                  onSubmit={handleUpdateTurfDetails}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs text-left"
                >
                  <h4 className="text-sm font-black text-white border-b border-slate-800 pb-2 flex items-center gap-1.5">
                    <Settings className="h-4 w-4 text-emerald-400" />
                    Modify Arena Specifications
                  </h4>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Arena Name</label>
                    <input
                      type="text"
                      required
                      value={editingTurf.name}
                      onChange={(e) => setEditingTurf({ ...editingTurf, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Sports Type</label>
                      <select
                        value={editingTurf.sportsType}
                        onChange={(e) => setEditingTurf({ ...editingTurf, sportsType: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200"
                      >
                        <option value="FOOTBALL">FOOTBALL</option>
                        <option value="CRICKET">CRICKET</option>
                        <option value="TENNIS">TENNIS</option>
                        <option value="SQUASH">SQUASH</option>
                        <option value="BASKETBALL">BASKETBALL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Price per Hour ($)</label>
                      <input
                        type="number"
                        required
                        value={editingTurf.pricePerHour}
                        onChange={(e) => setEditingTurf({ ...editingTurf, pricePerHour: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Address Location</label>
                    <input
                      type="text"
                      required
                      value={editingTurf.location}
                      onChange={(e) => setEditingTurf({ ...editingTurf, location: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Description</label>
                    <textarea
                      value={editingTurf.description}
                      onChange={(e) => setEditingTurf({ ...editingTurf, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 h-16"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive_chk"
                      checked={editingTurf.isActive}
                      onChange={(e) => setEditingTurf({ ...editingTurf, isActive: e.target.checked })}
                      className="accent-emerald-500 h-4 w-4 rounded"
                    />
                    <label htmlFor="isActive_chk" className="text-slate-200 font-bold">Arena active for booking searches</label>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingTurf(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded"
                    >
                      Apply Arena Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Turfs Listing Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80">
                    <th className="p-3">Turf Arena</th>
                    <th className="p-3">Sports Type</th>
                    <th className="p-3">Location Address</th>
                    <th className="p-3">Hourly Rate</th>
                    <th className="p-3">Operating Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {turfs
                    .filter(t => {
                      const matchesSearch = t.name.toLowerCase().includes(turfSearch.toLowerCase()) || t.location.toLowerCase().includes(turfSearch.toLowerCase());
                      const matchesSport = turfSportFilter === "ALL" || t.sportsType === turfSportFilter;
                      return matchesSearch && matchesSport;
                    })
                    .map((turf) => (
                      <tr key={turf.id} className="hover:bg-slate-800/20 text-slate-200">
                        <td className="p-3 font-semibold flex items-center gap-2.5">
                          <img src={turf.image} className="h-7 w-10 object-cover rounded" alt="" />
                          <span>{turf.name}</span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] uppercase">
                            {turf.sportsType}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 truncate max-w-xs">{turf.location}</td>
                        <td className="p-3 font-medium text-emerald-400">${turf.pricePerHour}/hr</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            turf.isActive 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {turf.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingTurf(turf)}
                              className="text-cyan-400 hover:text-cyan-300 p-1 hover:bg-cyan-500/10 rounded cursor-pointer"
                              title="Edit Arena Details"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTurf(turf.id)}
                              className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded cursor-pointer"
                              title="Delete Arena from catalog"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB TAB 4: MANAGE BOOKINGS (CRUD) --- */}
      {adminTab === "bookings" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Interactive Reservation Planner</h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search bookings..."
                    className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1 text-xs pl-8 w-44 focus:outline-none focus:border-emerald-500"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2" />
                </div>
                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="bg-slate-950 text-slate-300 border border-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <button
                  onClick={() => {
                    setShowAddBooking(!showAddBooking);
                    if (users.length > 0) setNewBookingUserId(users[0].id.toString());
                    if (turfs.length > 0) setNewBookingTurfId(turfs[0].id.toString());
                  }}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[10px] rounded flex items-center gap-1 cursor-pointer transition-all uppercase"
                >
                  <Plus className="h-3.5 w-3.5" /> Book on Behalf
                </button>
              </div>
            </div>

            {/* Create Admin Booking Form Collapse */}
            <AnimatePresence>
              {showAddBooking && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleCreateAdminBooking}
                  className="p-4 bg-slate-950/80 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs overflow-hidden"
                >
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Select Customer User *</label>
                    <select
                      value={newBookingUserId}
                      onChange={(e) => setNewBookingUserId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Select Arena Turf *</label>
                    <select
                      value={newBookingTurfId}
                      onChange={(e) => setNewBookingTurfId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                    >
                      {turfs.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (${t.pricePerHour}/hr)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Desired Booking Date</label>
                    <input
                      type="date"
                      required
                      value={newBookingDate}
                      onChange={(e) => setNewBookingDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">1-Hour Slot Interval</label>
                    <select
                      value={newBookingHour}
                      onChange={(e) => setNewBookingHour(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-200"
                    >
                      <option value="09">09:00 AM - 10:00 AM</option>
                      <option value="10">10:00 AM - 11:00 AM</option>
                      <option value="11">11:00 AM - 12:00 PM</option>
                      <option value="15">03:00 PM - 04:00 PM</option>
                      <option value="16">04:00 PM - 05:00 PM</option>
                      <option value="18">06:00 PM - 07:00 PM</option>
                      <option value="19">07:00 PM - 08:00 PM</option>
                      <option value="20">08:00 PM - 09:00 PM</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded cursor-pointer hover:bg-emerald-600 transition-colors"
                    >
                      Register Admin-Mediated Booking
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Booking Edit Overlay Modal */}
            {editingBooking && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <form
                  onSubmit={handleUpdateBookingDetails}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs text-left"
                >
                  <h4 className="text-sm font-black text-white border-b border-slate-800 pb-2 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-emerald-400" />
                    Modify Allocation Schedule
                  </h4>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Arena</label>
                    <select
                      value={editingBooking.turfId}
                      onChange={(e) => {
                        const newId = parseInt(e.target.value);
                        const tf = turfs.find(t => t.id === newId);
                        setEditingBooking({ ...editingBooking, turfId: newId, totalPrice: tf ? tf.pricePerHour : editingBooking.totalPrice });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200"
                    >
                      {turfs.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (${t.pricePerHour}/hr)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Schedule Start Time</label>
                    <input
                      type="text"
                      required
                      value={editingBooking.startTime}
                      onChange={(e) => setEditingBooking({ ...editingBooking, startTime: e.target.value })}
                      placeholder="YYYY-MM-DDTHH:MM:SS"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Schedule End Time</label>
                    <input
                      type="text"
                      required
                      value={editingBooking.endTime}
                      onChange={(e) => setEditingBooking({ ...editingBooking, endTime: e.target.value })}
                      placeholder="YYYY-MM-DDTHH:MM:SS"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Status</label>
                      <select
                        value={editingBooking.status}
                        onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Invoice Price ($)</label>
                      <input
                        type="number"
                        required
                        value={editingBooking.totalPrice}
                        onChange={(e) => setEditingBooking({ ...editingBooking, totalPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingBooking(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded"
                    >
                      Commit Booking Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List Bookings */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80">
                    <th className="p-3">Reservation ID</th>
                    <th className="p-3">Player Profile</th>
                    <th className="p-3">Arena</th>
                    <th className="p-3">Time Schedule</th>
                    <th className="p-3">Total Cost</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {bookings
                    .filter(b => {
                      const associatedUser = users.find(u => u.id === b.userId);
                      const associatedTurf = turfs.find(t => t.id === b.turfId);
                      const userStr = associatedUser ? associatedUser.fullName + " " + associatedUser.email : "Guest";
                      const turfStr = associatedTurf ? associatedTurf.name : "Deleted Turf";
                      const matchesSearch = userStr.toLowerCase().includes(bookingSearch.toLowerCase()) || turfStr.toLowerCase().includes(bookingSearch.toLowerCase());
                      const matchesStatus = bookingStatusFilter === "ALL" || b.status === bookingStatusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((booking) => {
                      const associatedUser = users.find(u => u.id === booking.userId);
                      const associatedTurf = turfs.find(t => t.id === booking.turfId);
                      return (
                        <tr key={booking.id} className="hover:bg-slate-800/20 text-slate-200">
                          <td className="p-3 font-mono text-slate-400">#RES-00{booking.id}</td>
                          <td className="p-3">
                            <span className="font-semibold block">{associatedUser?.fullName || "Guest Player"}</span>
                            <span className="block text-[10px] text-slate-500 font-mono">{associatedUser?.email}</span>
                          </td>
                          <td className="p-3 font-medium text-slate-300">{associatedTurf?.name || "Deleted Arena"}</td>
                          <td className="p-3 text-slate-400">
                            {new Date(booking.startTime).toLocaleDateString()}
                            <span className="block text-[10px] font-mono">
                              {new Date(booking.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-emerald-400">${booking.totalPrice}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              booking.status === "CONFIRMED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : booking.status === "CANCELLED"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse"
                            }`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {booking.status === "PENDING" && (
                                <>
                                  <button
                                    onClick={() => onUpdateBookingStatus(booking.id, "CONFIRMED")}
                                    className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded cursor-pointer"
                                    title="Approve Reservation"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => onUpdateBookingStatus(booking.id, "CANCELLED")}
                                    className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded cursor-pointer"
                                    title="Cancel Reservation"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => setEditingBooking(booking)}
                                className="text-cyan-400 hover:text-cyan-300 p-1 hover:bg-cyan-500/10 rounded cursor-pointer"
                                title="Edit booking schedule"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded cursor-pointer"
                                title="Delete Booking record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB TAB 5: MANAGE PAYMENTS --- */}
      {adminTab === "payments" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Platform Payment Auditing</h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    placeholder="Search transaction ID..."
                    className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2.5 py-1 text-xs pl-8 w-44 focus:outline-none focus:border-emerald-500"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2" />
                </div>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="bg-slate-950 text-slate-300 border border-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Payments</option>
                  <option value="PENDING">PENDING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="REFUNDED">REFUNDED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>
            </div>

            {/* Payments List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80">
                    <th className="p-3">Payment ID</th>
                    <th className="p-3">Associated Res.</th>
                    <th className="p-3">Customer Profile</th>
                    <th className="p-3">Invoice Amount</th>
                    <th className="p-3">Gateway</th>
                    <th className="p-3">Transaction hash</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Resolve Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {payments
                    .filter(p => {
                      const user = users.find(u => u.id === p.userId);
                      const emailStr = user ? user.email : "";
                      const txHash = p.transactionId || "";
                      const matchesSearch = txHash.toLowerCase().includes(paymentSearch.toLowerCase()) || emailStr.toLowerCase().includes(paymentSearch.toLowerCase());
                      const matchesStatus = paymentStatusFilter === "ALL" || p.status === paymentStatusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((pay) => {
                      const associatedUser = users.find(u => u.id === pay.userId);
                      return (
                        <tr key={pay.id} className="hover:bg-slate-800/20 text-slate-200">
                          <td className="p-3 font-mono text-slate-500">#PAY-{pay.id}</td>
                          <td className="p-3 font-mono text-slate-400">#RES-00{pay.bookingId}</td>
                          <td className="p-3">
                            <span className="font-semibold block">{associatedUser?.fullName || "Guest User"}</span>
                            <span className="block text-[10px] text-slate-500 font-mono">{associatedUser?.email}</span>
                          </td>
                          <td className="p-3 font-bold text-emerald-400">${pay.amount}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px]">
                              {pay.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={pay.transactionId}>
                            {pay.transactionId || "N/A"}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pay.status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : pay.status === "REFUNDED"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : pay.status === "FAILED"
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse"
                            }`}>
                              {pay.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {pay.status === "COMPLETED" ? (
                                <button
                                  onClick={() => handleUpdatePaymentStatus(pay.id, "REFUNDED")}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded border border-rose-500/20 font-mono text-[9px] font-black uppercase cursor-pointer"
                                >
                                  Refund Outbound
                                </button>
                              ) : pay.status === "PENDING" ? (
                                <>
                                  <button
                                    onClick={() => handleUpdatePaymentStatus(pay.id, "COMPLETED")}
                                    className="p-1 text-emerald-400 hover:text-emerald-300"
                                    title="Settle Payment as Completed"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdatePaymentStatus(pay.id, "FAILED")}
                                    className="p-1 text-rose-400 hover:text-rose-300"
                                    title="Mark Payment as Failed"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-slate-500 text-[9px] font-mono uppercase">Settled</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB TAB 6: REPORTS & EXPORTER (INTERACTIVE) --- */}
      {adminTab === "reports" && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                  Executive Audit & Report Synthesizer
                </h3>
                <p className="text-xs text-slate-400 mt-1">Simulate high-fidelity consolidations, fetch vector embeddings similarity spreads, and download reports.</p>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Target Month:</span>
                <select
                  value={reportingMonth}
                  onChange={(e) => setReportingMonth(e.target.value)}
                  className="bg-slate-950 text-xs font-bold text-slate-200 border border-slate-800 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="2026-07">July 2026</option>
                  <option value="2026-06">June 2026</option>
                  <option value="2026-05">May 2026</option>
                </select>
                <button
                  onClick={triggerPerformanceReport}
                  disabled={isGeneratingReport}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingReport ? "animate-spin" : ""}`} />
                  {isGeneratingReport ? "Consolidating..." : "Consolidate Report"}
                </button>
              </div>
            </div>

            {/* Generating Report Progress Screen */}
            <AnimatePresence>
              {isGeneratingReport && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[11px] text-emerald-400 space-y-2 relative overflow-hidden"
                >
                  <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 absolute top-0 left-0 animate-pulse w-full"></div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Simulating Live Console Trace</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {reportProgress.map((prog, index) => (
                      <p key={index} className="flex items-center gap-1.5">
                        <span className="text-emerald-500">➜</span>
                        {prog}
                      </p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Consolidated Audit Summary Output */}
            {activeReportData ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                <div className="md:col-span-2 space-y-4">
                  <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-3.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">Platform Utilization Audit</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-slate-500 block">Total Transactions consolidation:</span>
                        <span className="font-bold text-white text-sm">{activeReportData.activeUsageCount} Confirmed Bookings</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block">Gross Revenue Settled:</span>
                        <span className="font-black text-emerald-400 text-sm">${activeReportData.grossSpend.toFixed(2)}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block">Consolidation Date:</span>
                        <span className="font-mono text-slate-400 text-[11px]">{activeReportData.generatedAt}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block">System Sec. Integrity:</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase text-[9px]">
                          {activeReportData.auditStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sport Popularity Table */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sports Fields Distribution Matrix</h5>
                    <div className="space-y-2">
                      {Object.entries(activeReportData.activeSportsBreakdown).map(([sport, count]: any) => {
                        const usageRatio = activeReportData.activeUsageCount > 0 ? (count / activeReportData.activeUsageCount) * 100 : 0;
                        return (
                          <div key={sport} className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-300">{sport}</span>
                            <div className="flex-1 mx-4 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${usageRatio}%` }}></div>
                            </div>
                            <span className="text-emerald-400 font-bold">{count} Games ({usageRatio.toFixed(0)}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Exporter sidebar */}
                <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">Export Outbounds</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">Download structured report data containing platform-wide user lists, active turf catalogs, financial aggregates, and scheduling metrics.</p>
                  </div>

                  <div className="space-y-2 pt-4">
                    <button
                      onClick={handleExportCSV}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                    >
                      <Download className="h-4 w-4" />
                      Download Performance CSV
                    </button>
                    <button
                      onClick={() => alert("Simulation: Report consolidated as PDF file. Outbound mail triggers initiated back to primary admin email.")}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Shield className="h-4 w-4 text-cyan-400" />
                      Email Secure PDF Audit
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Configure month options and trigger consolidation mapping above to initiate system metrics consolidations.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
