import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PublicHeader from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Wrench, Cog, Settings2, MessageSquareText, ChevronLeft, ChevronRight,
  Check, CalendarIcon, Loader2, MessageCircle, ArrowRight,
} from "lucide-react";
import api, { formatApiError } from "@/lib/apiClient";
import { format, addDays } from "date-fns";

const serviceIcons = {
  ringan: Wrench, berat: Cog, overhaul: Settings2, request: MessageSquareText,
};

const steps = [
  { n: 1, label: "Layanan" },
  { n: 2, label: "Jadwal" },
  { n: 3, label: "Data Customer" },
  { n: 4, label: "Konfirmasi" },
];

function Stepper({ current }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between">
        {steps.map((s, i) => {
          const done = current > s.n;
          const active = current === s.n;
          return (
            <div key={s.n} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  data-testid={`stepper-${s.n}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                    done
                      ? "border-blue-600 bg-blue-600 text-white"
                      : active
                      ? "border-blue-600 text-blue-600"
                      : "border-slate-300 text-slate-400"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : s.n}
                </div>
                <div className={`mt-2 hidden text-xs font-medium md:block ${active ? "text-blue-600" : "text-slate-500"}`}>{s.label}</div>
              </div>
              {i < steps.length - 1 && (
                <div className={`mx-2 h-0.5 flex-1 ${done ? "bg-blue-600" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Reservasi() {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [chosenService, setChosenService] = useState(null);
  const [date, setDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState(null);
  const [dateRange, setDateRange] = useState(null); // { today, min, max } from server
  const [customer, setCustomer] = useState({
    customer_name: "", whatsapp: "", plate_number: "", complaint: "",
  });
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [plateHistory, setPlateHistory] = useState(null);
  const [checkingPlate, setCheckingPlate] = useState(false);

  useEffect(() => {
    api.get("/services").then((r) => setServices(r.data)).catch(() => toast.error("Gagal memuat layanan"));
    api.get("/business-hours").then((r) => {
      setDateRange({
        today: new Date(r.data.today + "T00:00:00"),
        min: new Date(r.data.min_date + "T00:00:00"),
        max: new Date(r.data.max_date + "T00:00:00"),
      });
    }).catch(() => {});
  }, []);

  const minDate = useMemo(() => dateRange?.min || addDays(new Date(), 1), [dateRange]);
  const maxDate = useMemo(() => dateRange?.max || addDays(new Date(), 7), [dateRange]);

  const disabledDate = (d) => {
    const day = d.getDay();
    if (day === 0) return true; // Sunday
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const minOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    const maxOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    if (dOnly < minOnly) return true;
    if (dOnly > maxOnly) return true;
    return false;
  };

  useEffect(() => {
    if (!date || !chosenService) return;
    setLoadingSlots(true);
    const dateStr = format(date, "yyyy-MM-dd");
    api.get(`/availability?date=${dateStr}&service_id=${chosenService.id}`)
      .then((r) => setSlots(r.data.slots))
      .catch((e) => { setSlots([]); toast.error(formatApiError(e)); })
      .finally(() => setLoadingSlots(false));
  }, [date, chosenService]);

  const validateCustomer = () => {
    const e = {};
    if (customer.customer_name.trim().length < 3) e.customer_name = "Minimal 3 karakter";
    const digits = customer.whatsapp.replace(/\D/g, "");
    if (!(digits.startsWith("08") || digits.startsWith("628") || digits.startsWith("8")) || digits.length < 9)
      e.whatsapp = "Nomor WA tidak valid";
    if (!customer.plate_number.trim()) e.plate_number = "Nomor polisi wajib diisi";
    if (!customer.complaint.trim()) e.complaint = "Keluhan wajib diisi";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const fetchPlateHistory = async (plateRaw) => {
    const plate = plateRaw.toUpperCase().trim();
    if (plate.length < 3) { setPlateHistory(null); return; }
    setCheckingPlate(true);
    try {
      const r = await api.get(`/customer/history?plate=${encodeURIComponent(plate)}`);
      setPlateHistory(r.data.count > 0 ? r.data : null);
    } catch (_) {
      setPlateHistory(null);
    } finally {
      setCheckingPlate(false);
    }
  };

  const submitBooking = async () => {
    setSubmitting(true);
    try {
      const r = await api.post("/bookings", {
        ...customer,
        plate_number: customer.plate_number.toUpperCase(),
        service_id: chosenService.id,
        booking_date: format(date, "yyyy-MM-dd"),
        start_time: time,
      });
      setResult(r.data);
      toast.success("Reservasi berhasil dibuat!");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const b = result.booking;
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicHeader />
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-center font-display text-3xl font-bold" data-testid="success-title">Reservasi Berhasil!</h1>
          <p className="mt-3 text-center text-slate-600">Silakan simpan nomor reservasi Anda.</p>
          <Card className="mt-8 border-slate-200 p-6">
            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Nomor Reservasi</div>
              <div className="mt-2 font-display text-2xl font-bold text-blue-600" data-testid="booking-number">{b.booking_number}</div>
            </div>
            <div className="mt-6 space-y-2 text-sm">
              <Row k="Nama" v={b.customer_name} />
              <Row k="Jenis Servis" v={b.service_name} />
              <Row k="Tanggal" v={b.booking_date} />
              <Row k="Jam" v={`${b.start_time} - ${b.end_time}`} />
              <Row k="Mekanik" v={b.mechanic_name} />
              <Row k="Nomor Polisi" v={b.plate_number} />
              <Row k="Status" v={b.status} />
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <a href={result.wa_customer_link} target="_blank" rel="noreferrer">
                <Button data-testid="wa-customer-btn" className="w-full rounded-full bg-green-600 hover:bg-green-700 transition-colors">
                  <MessageCircle className="mr-2 h-4 w-4" /> Kirim Konfirmasi ke WhatsApp Saya
                </Button>
              </a>
              <a href={result.wa_admin_link} target="_blank" rel="noreferrer">
                <Button variant="outline" data-testid="wa-admin-btn" className="w-full rounded-full">
                  Notifikasi ke Bengkel
                </Button>
              </a>
              <Link to="/">
                <Button variant="ghost" className="w-full">Kembali ke Beranda</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Buat Reservasi</h1>
          <p className="mt-2 text-slate-600">Lengkapi 4 langkah singkat untuk booking servis motor Anda.</p>
        </div>

        <Stepper current={step} />

        {/* STEP 1: Service */}
        {step === 1 && (
          <div data-testid="step-1-services">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {services.map((s) => {
                const Icon = serviceIcons[s.code] || Wrench;
                const selected = chosenService?.id === s.id;
                return (
                  <button
                    key={s.id}
                    data-testid={`service-card-${s.code}`}
                    onClick={() => setChosenService(s)}
                    className={`group rounded-xl border-2 p-6 text-left transition-colors ${
                      selected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${selected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"}`}>
                        <Icon strokeWidth={1.5} className="h-5 w-5" />
                      </div>
                      {selected && <Check className="h-5 w-5 text-blue-600" />}
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold">{s.name}</h3>
                    <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                      Durasi · {s.code === "request" ? "Menyesuaikan" : `${s.duration_hours} Jam`}
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-8 flex justify-end">
              <Button
                data-testid="step1-next-btn"
                disabled={!chosenService}
                onClick={() => setStep(2)}
                className="rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Lanjutkan <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Schedule */}
        {step === 2 && (
          <div data-testid="step-2-schedule">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
              <Card className="border-slate-200 p-5 md:col-span-2">
                <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Pilih Tanggal</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      data-testid="date-picker-btn"
                      variant="outline"
                      className="mt-3 w-full justify-start rounded-md text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "dd MMM yyyy") : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => { setDate(d); setTime(null); }}
                      disabled={disabledDate}
                      defaultMonth={minDate}
                      fromDate={minDate}
                      toDate={maxDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="mt-4 text-xs text-slate-500">
                  Reservasi tersedia H+1 hingga 7 hari ke depan. Bengkel tutup setiap hari Minggu.
                </p>
              </Card>

              <Card className="border-slate-200 p-5 md:col-span-3">
                <Label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Pilih Jam</Label>
                {!date && <p className="mt-3 text-sm text-slate-500">Pilih tanggal terlebih dahulu.</p>}
                {date && loadingSlots && (
                  <div className="mt-4 flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Memuat jadwal...</div>
                )}
                {date && !loadingSlots && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {slots.map((s) => {
                      const disabled = s.status === "full" || s.status === "closed";
                      const selected = time === s.time;
                      let cls = "border-slate-200 bg-white text-slate-700 hover:border-blue-300";
                      if (s.status === "almost") cls = "border-amber-300 bg-amber-50 text-amber-800";
                      if (disabled) cls = "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed";
                      if (selected) cls = "border-blue-600 bg-blue-600 text-white";
                      return (
                        <button
                          key={s.time}
                          data-testid={`slot-${s.time}`}
                          disabled={disabled}
                          onClick={() => setTime(s.time)}
                          className={`rounded-md border-2 p-3 text-left transition-colors ${cls}`}
                        >
                          <div className="font-display text-base font-bold leading-tight">{s.time}</div>
                          <div className="mt-1.5 text-[10px] font-medium uppercase tracking-wider leading-tight">
                            {s.status === "closed" ? "Lewat tutup" : s.status === "full" ? "Penuh" : `${s.available} slot`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}><ChevronLeft className="mr-1 h-4 w-4" /> Kembali</Button>
              <Button
                data-testid="step2-next-btn"
                disabled={!date || !time}
                onClick={() => setStep(3)}
                className="rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Lanjutkan <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Customer data */}
        {step === 3 && (
          <div data-testid="step-3-customer">
            <Card className="border-slate-200 p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input
                    id="name" data-testid="input-name"
                    value={customer.customer_name}
                    onChange={(e) => setCustomer({ ...customer, customer_name: e.target.value })}
                    className="mt-2" placeholder="Andi"
                  />
                  {errors.customer_name && <p className="mt-1 text-xs text-red-600">{errors.customer_name}</p>}
                </div>
                <div>
                  <Label htmlFor="wa">Nomor WhatsApp</Label>
                  <Input
                    id="wa" data-testid="input-whatsapp"
                    value={customer.whatsapp}
                    onChange={(e) => setCustomer({ ...customer, whatsapp: e.target.value })}
                    className="mt-2" placeholder="081234567890"
                  />
                  {errors.whatsapp && <p className="mt-1 text-xs text-red-600">{errors.whatsapp}</p>}
                </div>
                <div>
                  <Label htmlFor="plate">Nomor Polisi</Label>
                  <Input
                    id="plate" data-testid="input-plate"
                    value={customer.plate_number}
                    onChange={(e) => setCustomer({ ...customer, plate_number: e.target.value.toUpperCase() })}
                    onBlur={(e) => fetchPlateHistory(e.target.value)}
                    className="mt-2 uppercase" placeholder="DD 1234 XX"
                  />
                  {errors.plate_number && <p className="mt-1 text-xs text-red-600">{errors.plate_number}</p>}
                </div>
              </div>
              <div className="mt-5">
                <Label htmlFor="complaint">Keluhan / Permintaan</Label>
                <Textarea
                  id="complaint" data-testid="input-complaint"
                  value={customer.complaint}
                  onChange={(e) => setCustomer({ ...customer, complaint: e.target.value })}
                  className="mt-2" rows={4}
                  placeholder="Jelaskan keluhan motor atau servis yang Anda inginkan..."
                />
                {errors.complaint && <p className="mt-1 text-xs text-red-600">{errors.complaint}</p>}
              </div>
            </Card>

            {/* Plate history */}
            {(checkingPlate || plateHistory) && (
              <Card className="mt-4 border-blue-200 bg-blue-50 p-5" data-testid="plate-history-card">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Wrench strokeWidth={2} className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-display text-sm font-semibold">
                      {checkingPlate ? "Memeriksa riwayat motor…" : `Motor ini pernah servis di sini`}
                    </div>
                    {plateHistory && (
                      <div className="text-xs text-slate-600">
                        {plateHistory.count} kali kunjungan sebelumnya — {plateHistory.plate_number}
                      </div>
                    )}
                  </div>
                </div>
                {plateHistory && (
                  <div className="mt-4 space-y-2">
                    {plateHistory.recent.map((h) => (
                      <div key={h.booking_number} className="rounded-md border border-blue-100 bg-white p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium text-blue-700">{h.booking_number}</div>
                          <div className="text-xs text-slate-500">{h.booking_date} · {h.start_time}</div>
                        </div>
                        <div className="mt-1 text-slate-700">
                          <span className="font-medium">{h.service_name}</span> · {h.mechanic_name} · <span className="text-slate-500">{h.status}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500 italic">Keluhan: "{h.complaint}"</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}><ChevronLeft className="mr-1 h-4 w-4" /> Kembali</Button>
              <Button
                data-testid="step3-next-btn"
                onClick={() => { if (validateCustomer()) setStep(4); }}
                className="rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Lanjutkan <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm */}
        {step === 4 && (
          <div data-testid="step-4-confirm">
            <Card className="border-slate-200 p-6">
              <h3 className="font-display text-lg font-semibold">Ringkasan Reservasi</h3>
              <div className="mt-4 space-y-2 text-sm">
                <Row k="Jenis Servis" v={chosenService?.name} />
                <Row k="Tanggal" v={date ? format(date, "dd MMM yyyy") : "-"} />
                <Row k="Jam" v={time} />
                <Row k="Estimasi Durasi" v={`${chosenService?.duration_hours} jam`} />
                <Row k="Mekanik" v="Otomatis dialokasikan sistem" />
                <div className="my-3 border-t border-slate-200" />
                <Row k="Nama" v={customer.customer_name} />
                <Row k="WhatsApp" v={customer.whatsapp} />
                <Row k="Nomor Polisi" v={customer.plate_number.toUpperCase()} />
                <Row k="Keluhan" v={customer.complaint} />
              </div>
              <div className="mt-6 flex items-start gap-3">
                <Checkbox id="confirm" data-testid="confirm-checkbox" checked={confirm} onCheckedChange={setConfirm} />
                <Label htmlFor="confirm" className="text-sm leading-relaxed text-slate-600">
                  Saya memastikan data reservasi sudah benar.
                </Label>
              </div>
            </Card>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}><ChevronLeft className="mr-1 h-4 w-4" /> Kembali</Button>
              <Button
                data-testid="submit-booking-btn"
                disabled={!confirm || submitting}
                onClick={submitBooking}
                className="rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</> : "Konfirmasi Reservasi"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4">
      <div className="text-slate-500">{k}</div>
      <div className="text-right font-medium text-slate-900">{v || "-"}</div>
    </div>
  );
}
