import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wrench, LayoutDashboard, CalendarDays, Users2, Settings, LogOut,
  Loader2, Plus, Trash2, MessageCircle, CheckCircle2, PlayCircle, XCircle, Clock,
  FileText, Download, CalendarRange, History, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, addDays, startOfWeek } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API } from "@/lib/apiClient";

const rupiah = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

const STATUSES = ["Menunggu Konfirmasi", "Dikonfirmasi", "Sedang Diproses", "Selesai", "Dibatalkan"];
const statusColor = {
  "Menunggu Konfirmasi": "bg-amber-100 text-amber-800",
  "Dikonfirmasi": "bg-blue-100 text-blue-800",
  "Sedang Diproses": "bg-purple-100 text-purple-800",
  "Selesai": "bg-green-100 text-green-800",
  "Dibatalkan": "bg-slate-200 text-slate-700",
};

export default function Admin() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("overview");

  const handleLogout = async () => { await logout(); nav("/admin/login"); };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar + Content layout */}
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
          <div className="p-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white">
                <Wrench strokeWidth={2} className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold">ALDI MOTOR</span>
            </Link>
            <div className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Admin Panel</div>
          </div>
          <nav className="px-3">
            {[
              { id: "overview", icon: LayoutDashboard, label: "Dashboard" },
              { id: "bookings", icon: CalendarDays, label: "Reservasi" },
              { id: "calendar", icon: CalendarRange, label: "Kalender" },
              { id: "mechanics", icon: Users2, label: "Mekanik" },
              { id: "reports", icon: FileText, label: "Laporan" },
              { id: "settings", icon: Settings, label: "Pengaturan" },
            ].map((it) => (
              <button
                key={it.id}
                onClick={() => setTab(it.id)}
                data-testid={`sidebar-${it.id}`}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === it.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <it.icon strokeWidth={1.5} className="h-4 w-4" />
                {it.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Admin</div>
              <h1 className="font-display text-lg font-semibold">Selamat datang, {user?.name}</h1>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="mr-2 h-4 w-4" /> Keluar
            </Button>
          </div>

          {/* Mobile tab bar */}
          <div className="md:hidden border-b border-slate-200 bg-white px-4 py-2">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Home</TabsTrigger>
                <TabsTrigger value="bookings">Reservasi</TabsTrigger>
                <TabsTrigger value="calendar">Kalender</TabsTrigger>
                <TabsTrigger value="mechanics">Mekanik</TabsTrigger>
                <TabsTrigger value="reports">Laporan</TabsTrigger>
                <TabsTrigger value="settings">Setting</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="p-6">
            {tab === "overview" && <Overview />}
            {tab === "bookings" && <Bookings />}
            {tab === "calendar" && <CalendarView />}
            {tab === "mechanics" && <Mechanics />}
            {tab === "reports" && <Reports />}
            {tab === "settings" && <SettingsPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, testid }) {
  return (
    <Card data-testid={testid} className="border-slate-200 bg-white p-5 shadow-none transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </Card>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)); }, []);
  if (!stats) return <Loader />;
  return (
    <div className="space-y-6" data-testid="admin-overview">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard testid="stat-total" label="Total Reservasi" value={stats.total} />
        <StatCard testid="stat-today" label="Reservasi Hari Ini" value={stats.today} />
        <StatCard testid="stat-tomorrow" label="Reservasi Besok" value={stats.tomorrow} />
        <StatCard testid="stat-menunggu" label="Menunggu Konfirmasi" value={stats.by_status["Menunggu Konfirmasi"]} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Dikonfirmasi" value={stats.by_status["Dikonfirmasi"]} />
        <StatCard label="Sedang Diproses" value={stats.by_status["Sedang Diproses"]} />
        <StatCard label="Selesai" value={stats.by_status["Selesai"]} />
        <StatCard label="Dibatalkan" value={stats.by_status["Dibatalkan"]} />
      </div>
    </div>
  );
}

function Bookings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [plateFilter, setPlateFilter] = useState("");
  const [mechanics, setMechanics] = useState([]);
  const [historyPlate, setHistoryPlate] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) { params.set("date_from", dateFilter); params.set("date_to", dateFilter); }
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (plateFilter.trim()) params.set("plate", plateFilter.trim().toUpperCase());
      const r = await api.get(`/admin/bookings?${params.toString()}`);
      setItems(r.data);
    } catch (e) { toast.error(formatApiError(e)); }
    setLoading(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); api.get("/mechanics").then((r) => setMechanics(r.data)); }, [dateFilter, statusFilter, plateFilter]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/bookings/${id}`, { status });
      toast.success("Status diperbarui");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const updateMechanic = async (id, mechanic_id) => {
    try {
      await api.patch(`/admin/bookings/${id}`, { mechanic_id });
      toast.success("Mekanik diperbarui");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const updateDuration = async (id, duration_hours) => {
    try {
      await api.patch(`/admin/bookings/${id}`, { duration_hours });
      toast.success("Durasi diperbarui");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const updatePrice = async (id, price) => {
    try {
      await api.patch(`/admin/bookings/${id}`, { price });
      toast.success("Harga diperbarui");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-4" data-testid="admin-bookings">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Filter Tanggal</Label>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="mt-2 w-48" data-testid="filter-date" />
        </div>
        <div>
          <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Filter Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="mt-2 w-56" data-testid="filter-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">No Polisi</Label>
          <Input placeholder="DD 1234 XX" value={plateFilter} onChange={(e) => setPlateFilter(e.target.value)} className="mt-2 w-40 uppercase" data-testid="filter-plate" />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setDateFilter(""); setStatusFilter("all"); setPlateFilter(""); }}>Reset</Button>
      </div>

      {loading ? <Loader /> : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">Belum ada reservasi.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <Card key={b.id} data-testid={`booking-row-${b.booking_number}`} className="border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="font-display text-lg font-bold text-blue-600">{b.booking_number}</div>
                    <Badge className={statusColor[b.status]}>{b.status}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    <span className="font-semibold">{b.customer_name}</span> · {b.plate_number} · WA {b.whatsapp}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {b.service_name} · {b.booking_date} · {b.start_time}–{b.end_time} · {b.mechanic_name}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    Harga: {rupiah(b.price)}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Keluhan: {b.complaint}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Quick action buttons */}
                  {b.status === "Menunggu Konfirmasi" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(b.id, "Dikonfirmasi")}
                      data-testid={`confirm-btn-${b.booking_number}`}
                      className="rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Konfirmasi
                    </Button>
                  )}
                  {b.status === "Dikonfirmasi" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(b.id, "Sedang Diproses")}
                      data-testid={`process-btn-${b.booking_number}`}
                      className="rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      <PlayCircle className="mr-1.5 h-4 w-4" /> Mulai Servis
                    </Button>
                  )}
                  {b.status === "Sedang Diproses" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(b.id, "Selesai")}
                      data-testid={`complete-btn-${b.booking_number}`}
                      className="rounded-full bg-green-600 hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Selesaikan
                    </Button>
                  )}
                  {!["Selesai", "Dibatalkan"].includes(b.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm(`Batalkan reservasi ${b.booking_number}?`)) {
                          updateStatus(b.id, "Dibatalkan");
                        }
                      }}
                      data-testid={`cancel-btn-${b.booking_number}`}
                      className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" /> Batalkan
                    </Button>
                  )}

                  <Select value={b.mechanic_id} onValueChange={(v) => updateMechanic(b.id, v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {mechanics.filter((m) => m.status === "active").map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {b.service_code === "request" && (
                    <Input
                      type="number" min="0.5" step="0.5" defaultValue={b.duration_hours}
                      className="w-24" placeholder="jam"
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (v && v !== b.duration_hours) updateDuration(b.id, v);
                      }}
                    />
                  )}
                  <Input
                    type="number" min="0" step="1000" defaultValue={b.price || 0}
                    className="w-28" placeholder="Harga"
                    data-testid={`price-input-${b.booking_number}`}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v !== (b.price || 0)) updatePrice(b.id, v);
                    }}
                  />
                  <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="icon" data-testid={`wa-btn-${b.booking_number}`}><MessageCircle className="h-4 w-4" /></Button>
                  </a>
                  <Button
                    variant="outline" size="icon" title="Lihat riwayat plat ini"
                    onClick={() => setHistoryPlate(b.plate_number)}
                    data-testid={`history-btn-${b.booking_number}`}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Plate history dialog */}
      <PlateHistoryDialog plate={historyPlate} onClose={() => setHistoryPlate(null)} />
    </div>
  );
}

function PlateHistoryDialog({ plate, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!plate) return;
    setLoading(true);
    api.get(`/customer/history?plate=${encodeURIComponent(plate)}`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [plate]);
  return (
    <Dialog open={!!plate} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="plate-history-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Riwayat Servis Motor</DialogTitle>
          {plate && <div className="text-sm text-slate-500">Plat: <span className="font-semibold text-blue-600">{plate}</span></div>}
        </DialogHeader>
        {loading ? <Loader /> : (
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {(!data || data.count === 0) && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Belum ada riwayat servis untuk plat ini.
              </div>
            )}
            {data && data.count > 0 && (
              <>
                <div className="text-xs text-slate-500">Total {data.count} kunjungan · menampilkan {data.recent.length} terbaru</div>
                {data.recent.map((h) => (
                  <div key={h.booking_number} className="rounded-md border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-blue-700">{h.booking_number}</div>
                      <Badge className={statusColor[h.status]}>{h.status}</Badge>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="font-medium">{h.service_name}</span> · {h.mechanic_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{h.booking_date} · {h.start_time}</div>
                    <div className="mt-2 text-sm italic text-slate-700">"{h.complaint}"</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Mechanics() {
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const load = async () => setList((await api.get("/mechanics")).data);
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!name.trim()) return;
    try { await api.post("/admin/mechanics", { name }); setName(""); toast.success("Mekanik ditambahkan"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const toggle = async (m) => {
    const next = m.status === "active" ? "inactive" : "active";
    try { await api.patch(`/admin/mechanics/${m.id}`, { status: next }); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const rename = async (m, newName) => {
    try { await api.patch(`/admin/mechanics/${m.id}`, { name: newName }); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const remove = async (m) => {
    if (!window.confirm(`Hapus ${m.name}?`)) return;
    try { await api.delete(`/admin/mechanics/${m.id}`); toast.success("Mekanik dihapus"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-4" data-testid="admin-mechanics">
      <Card className="border-slate-200 p-5">
        <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Tambah Mekanik</Label>
        <div className="mt-3 flex gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama mekanik" data-testid="new-mechanic-input" />
          <Button onClick={add} data-testid="add-mechanic-btn" className="rounded-full bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Tambah
          </Button>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {list.map((m) => (
          <Card key={m.id} className="border-slate-200 p-4 flex items-center justify-between gap-3">
            <Input
              defaultValue={m.name}
              onBlur={(e) => { if (e.target.value !== m.name) rename(m, e.target.value); }}
              className="flex-1"
            />
            <Button variant={m.status === "active" ? "default" : "outline"} size="sm" onClick={() => toggle(m)}>
              {m.status === "active" ? "Aktif" : "Nonaktif"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => remove(m)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [bh, setBh] = useState(null);
  const [services, setServices] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [newHol, setNewHol] = useState({ date: "", description: "" });

  const load = async () => {
    setBh((await api.get("/business-hours")).data);
    setServices((await api.get("/services")).data);
    setHolidays((await api.get("/holidays")).data);
  };
  useEffect(() => { load(); }, []);

  const saveHours = async () => {
    try {
      await api.put("/admin/business-hours", { opening_time: bh.opening_time, closing_time: bh.closing_time });
      toast.success("Jam operasional disimpan");
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const saveService = async (s, patch) => {
    try {
      await api.patch(`/admin/services/${s.id}`, patch);
      toast.success(`${s.name} diperbarui`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const addHoliday = async () => {
    if (!newHol.date || !newHol.description) return;
    try { await api.post("/admin/holidays", newHol); setNewHol({ date: "", description: "" }); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const delHoliday = async (id) => {
    try { await api.delete(`/admin/holidays/${id}`); load(); } catch (e) { toast.error(formatApiError(e)); }
  };

  if (!bh) return <Loader />;
  return (
    <div className="space-y-6" data-testid="admin-settings">
      <Card className="border-slate-200 p-6">
        <h3 className="font-display text-lg font-semibold">Jam Operasional</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 max-w-md">
          <div>
            <Label>Jam Buka</Label>
            <Input type="time" value={bh.opening_time} onChange={(e) => setBh({ ...bh, opening_time: e.target.value })} className="mt-2" data-testid="opening-time" />
          </div>
          <div>
            <Label>Jam Tutup</Label>
            <Input type="time" value={bh.closing_time} onChange={(e) => setBh({ ...bh, closing_time: e.target.value })} className="mt-2" data-testid="closing-time" />
          </div>
        </div>
        <Button onClick={saveHours} data-testid="save-hours-btn" className="mt-4 rounded-full bg-blue-600 hover:bg-blue-700">Simpan</Button>
      </Card>

      <Card className="border-slate-200 p-6">
        <h3 className="font-display text-lg font-semibold">Durasi Layanan</h3>
        <div className="mt-4 space-y-3">
          {services.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-slate-500">{s.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Durasi</div>
                  <div className="flex items-center gap-1">
                    <Input type="number" min="0.5" step="0.5" defaultValue={s.duration_hours} className="w-20"
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (v && v !== s.duration_hours) saveService(s, { duration_hours: v });
                      }}
                      data-testid={`duration-${s.code}`}
                    />
                    <span className="text-xs text-slate-500">jam</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Harga</div>
                  <Input type="number" min="0" step="1000" defaultValue={s.price || 0} className="w-32"
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v !== (s.price || 0)) saveService(s, { price: v });
                    }}
                    data-testid={`price-${s.code}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-slate-200 p-6">
        <h3 className="font-display text-lg font-semibold">Hari Libur Khusus</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <Input type="date" value={newHol.date} onChange={(e) => setNewHol({ ...newHol, date: e.target.value })} className="w-48" data-testid="holiday-date" />
          <Input placeholder="Keterangan (mis. HUT RI)" value={newHol.description} onChange={(e) => setNewHol({ ...newHol, description: e.target.value })} className="flex-1 min-w-48" data-testid="holiday-desc" />
          <Button onClick={addHoliday} data-testid="add-holiday-btn" className="rounded-full bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" /> Tambah</Button>
        </div>
        <div className="mt-4 space-y-2">
          {holidays.length === 0 && <p className="text-sm text-slate-500">Belum ada hari libur khusus.</p>}
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <div>
                <span className="font-medium">{h.date}</span> · <span className="text-slate-600">{h.description}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => delHoliday(h.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CalendarView() {
  const [view, setView] = useState("day"); // day | week
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dayData, setDayData] = useState(null);
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadDay = async (d) => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/calendar/day?date=${format(d, "yyyy-MM-dd")}`);
      setDayData(r.data);
    } catch (e) { toast.error(formatApiError(e)); }
    setLoading(false);
  };
  const loadWeek = async (d) => {
    setLoading(true);
    try {
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const r = await api.get(`/admin/calendar/week?start=${format(start, "yyyy-MM-dd")}`);
      setWeekData(r.data);
    } catch (e) { toast.error(formatApiError(e)); }
    setLoading(false);
  };

  useEffect(() => {
    if (view === "day") loadDay(date); else loadWeek(date);
    // eslint-disable-next-line
  }, [view, date]);

  const shiftDays = (n) => setDate(addDays(date, n));

  return (
    <div className="space-y-6" data-testid="admin-calendar">
      <Card className="border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Kalender Reservasi</div>
            <h3 className="mt-1 font-display text-2xl font-semibold">
              {view === "day"
                ? format(date, "EEEE, dd MMMM yyyy", { locale: idLocale })
                : `Minggu ${format(startOfWeek(date, { weekStartsOn: 1 }), "dd MMM", { locale: idLocale })} – ${format(addDays(startOfWeek(date, { weekStartsOn: 1 }), 6), "dd MMM yyyy", { locale: idLocale })}`}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={view} onValueChange={setView}>
              <TabsList>
                <TabsTrigger value="day" data-testid="cal-view-day">Harian</TabsTrigger>
                <TabsTrigger value="week" data-testid="cal-view-week">Mingguan</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" onClick={() => shiftDays(view === "day" ? -1 : -7)} data-testid="cal-prev">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const d = new Date(); d.setHours(0, 0, 0, 0); setDate(d);
            }} data-testid="cal-today">Hari Ini</Button>
            <Button variant="outline" size="icon" onClick={() => shiftDays(view === "day" ? 1 : 7)} data-testid="cal-next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {loading && <Loader />}

      {!loading && view === "day" && dayData && (
        <Card className="border-slate-200 p-4 overflow-x-auto" data-testid="cal-day-grid">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th className="w-24 border-b border-slate-200 p-2 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mekanik
                </th>
                {dayData.hours.map((h) => (
                  <th key={h} className="border-b border-slate-200 p-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dayData.mechanics.map((m) => (
                <tr key={m.id} className={m.status === "inactive" ? "opacity-40" : ""}>
                  <td className="border-b border-slate-100 p-2 align-top">
                    <div className="font-medium text-sm">{m.name}</div>
                    {m.status === "inactive" && <div className="text-xs text-slate-400">nonaktif</div>}
                  </td>
                  {m.cells.map((cell, i) => {
                    if (cell.type === "covered") return null;
                    if (cell.type === "empty") {
                      return (
                        <td key={i} className="border-b border-slate-100 p-1">
                          <div className="h-14 rounded-md border border-dashed border-slate-200 bg-slate-50/60" />
                        </td>
                      );
                    }
                    // booking cell
                    const b = cell.booking;
                    const colors = statusCellColor[b.status] || "bg-blue-100 border-blue-300 text-blue-900";
                    return (
                      <td key={i} colSpan={cell.span} className="border-b border-slate-100 p-1">
                        <button
                          onClick={() => setSelectedBooking(b)}
                          data-testid={`cal-cell-${b.booking_number}`}
                          className={`h-14 w-full rounded-md border-2 ${colors} p-1.5 text-left transition-transform hover:scale-[1.02]`}
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider truncate">{b.booking_number}</div>
                          <div className="text-xs font-semibold truncate">{b.customer_name}</div>
                          <div className="text-[10px] truncate">{b.service_name}</div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {dayData.mechanics.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">Tidak ada mekanik terdaftar.</div>
          )}
        </Card>
      )}

      {!loading && view === "week" && weekData && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7" data-testid="cal-week-grid">
          {weekData.days.map((d) => {
            const dt = new Date(d.date + "T00:00:00");
            const isClosed = d.is_closed;
            const filled = d.capacity > 0 ? Math.round((d.occupied_slots / d.capacity) * 100) : 0;
            let dens = "bg-emerald-50 border-emerald-200 text-emerald-800";
            if (filled >= 70) dens = "bg-red-50 border-red-200 text-red-800";
            else if (filled >= 40) dens = "bg-amber-50 border-amber-200 text-amber-800";
            if (isClosed) dens = "bg-slate-100 border-slate-200 text-slate-500";
            return (
              <button
                key={d.date}
                onClick={() => { if (!isClosed) { setDate(dt); setView("day"); } }}
                data-testid={`cal-week-day-${d.date}`}
                disabled={isClosed}
                className={`rounded-lg border-2 p-3 text-left transition-transform hover:-translate-y-0.5 ${dens} ${isClosed ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">
                  {format(dt, "EEE", { locale: idLocale })}
                </div>
                <div className="mt-1 font-display text-2xl font-bold">
                  {format(dt, "dd", { locale: idLocale })}
                </div>
                <div className="text-xs text-slate-500 mb-3">
                  {format(dt, "MMM", { locale: idLocale })}
                </div>
                {isClosed ? (
                  <div className="text-xs font-medium">{d.closed_reason}</div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{d.bookings_count}</div>
                    <div className="text-[10px] uppercase tracking-wider">reservasi</div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
                      <div className="h-full bg-current opacity-70" style={{ width: `${Math.min(100, filled)}%` }} />
                    </div>
                    <div className="mt-1 text-[10px]">{d.occupied_slots}/{d.capacity} slot ({filled}%)</div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedBooking} onOpenChange={(o) => !o && setSelectedBooking(null)}>
        <DialogContent className="max-w-md" data-testid="booking-detail-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {selectedBooking?.booking_number}
            </DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-medium">{selectedBooking.customer_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Plat</span><span className="font-medium">{selectedBooking.plate_number}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Servis</span><span className="font-medium">{selectedBooking.service_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Jam</span><span className="font-medium">{selectedBooking.start_time}–{selectedBooking.end_time}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Mekanik</span><span className="font-medium">{selectedBooking.mechanic_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><Badge className={statusColor[selectedBooking.status]}>{selectedBooking.status}</Badge></div>
              <div className="pt-2">
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Keluhan</div>
                <div className="italic">"{selectedBooking.complaint}"</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const statusCellColor = {
  "Menunggu Konfirmasi": "bg-amber-100 border-amber-300 text-amber-900",
  "Dikonfirmasi": "bg-blue-100 border-blue-300 text-blue-900",
  "Sedang Diproses": "bg-purple-100 border-purple-300 text-purple-900",
  "Selesai": "bg-green-100 border-green-300 text-green-900",
  "Dibatalkan": "bg-slate-100 border-slate-300 text-slate-500",
};

function Reports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/reports/monthly?year=${year}&month=${month}`);
      setData(r.data);
    } catch (e) { toast.error(formatApiError(e)); }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year, month]);

  const downloadPdf = () => {
    const token = localStorage.getItem("aldi_token");
    const url = `${API}/admin/reports/monthly.pdf?year=${year}&month=${month}&token=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
  };

  const years = [];
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) years.push(y);

  return (
    <div className="space-y-6" data-testid="admin-reports">
      <Card className="border-slate-200 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Laporan Bulanan</div>
            <h3 className="font-display text-2xl font-semibold mt-1">
              {MONTHS[month - 1]} {year}
            </h3>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Bulan</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="mt-2 w-40" data-testid="report-month"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Tahun</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="mt-2 w-28" data-testid="report-year"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={downloadPdf}
              data-testid="download-pdf-btn"
              className="rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Download className="mr-2 h-4 w-4" /> Unduh PDF
            </Button>
          </div>
        </div>
      </Card>

      {loading || !data ? <Loader /> : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard testid="report-total" label="Total Reservasi" value={data.total} />
            <StatCard testid="report-selesai" label="Selesai" value={data.by_status["Selesai"] || 0} />
            <StatCard label="Pendapatan Selesai" value={rupiah(data.revenue_completed)} />
            <StatCard label="Pendapatan Aktif" value={rupiah(data.revenue_total)} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-slate-200 p-5">
              <h3 className="font-display text-base font-semibold">Rekap Status</h3>
              <div className="mt-3 space-y-2 text-sm">
                {["Menunggu Konfirmasi", "Dikonfirmasi", "Sedang Diproses", "Selesai", "Dibatalkan"].map((s) => (
                  <div key={s} className="flex justify-between">
                    <span className="text-slate-600">{s}</span>
                    <Badge className={statusColor[s]}>{data.by_status[s] || 0}</Badge>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="border-slate-200 p-5">
              <h3 className="font-display text-base font-semibold">Rekap Jenis Servis</h3>
              <div className="mt-3 space-y-2 text-sm">
                {Object.keys(data.by_service).length === 0 && (
                  <div className="text-slate-500">Tidak ada data.</div>
                )}
                {Object.entries(data.by_service).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-600">{k}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="border-slate-200 p-5">
            <h3 className="font-display text-base font-semibold">Detail Reservasi</h3>
            {data.bookings.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Tidak ada reservasi pada periode ini.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-3">No Reservasi</th>
                      <th className="py-2 pr-3">Tanggal</th>
                      <th className="py-2 pr-3">Customer</th>
                      <th className="py-2 pr-3">Servis</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3 text-right">Harga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bookings.map((b) => (
                      <tr key={b.id} className="border-t border-slate-100">
                        <td className="py-2 pr-3 font-medium text-blue-600">{b.booking_number}</td>
                        <td className="py-2 pr-3">{b.booking_date} · {b.start_time}</td>
                        <td className="py-2 pr-3">{b.customer_name}</td>
                        <td className="py-2 pr-3">{b.service_name}</td>
                        <td className="py-2 pr-3"><Badge className={statusColor[b.status]}>{b.status}</Badge></td>
                        <td className="py-2 pr-3 text-right font-medium">{rupiah(b.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Loader() {
  return <div className="flex items-center gap-2 text-slate-500 py-8"><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</div>;
}
