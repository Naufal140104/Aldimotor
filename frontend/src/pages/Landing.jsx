import { Link } from "react-router-dom";
import PublicHeader from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CalendarClock, Users2, MessageCircle, ArrowRight,
  Wrench, Cog, Settings2, MessageSquareText,
  MousePointerClick, CalendarCheck, Bell, CheckCircle2,
  Phone, MapPin, Clock,
} from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1581858544302-c40e2254ff87?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwzfHxtb3RvcmN5Y2xlJTIwd29ya3Nob3AlMjBjbGVhbnxlbnwwfHx8fDE3ODc0NTgyMzV8MA&ixlib=rb-4.1.0&q=85";
const SERVICES_BG = "https://images.unsplash.com/photo-1636761358757-0a616eb9e17e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwyfHxtb3RvcmN5Y2xlJTIwbWVjaGFuaWMlMjBtb2Rlcm58ZW58MHx8fHwxNzg3NDU4MjM1fDA&ixlib=rb-4.1.0&q=85";

const services = [
  { icon: Wrench, name: "Servis Ringan", duration: "1 Jam", desc: "Servis berkala dan pemeriksaan ringan kendaraan." },
  { icon: Cog, name: "Servis Berat", duration: "2 Jam", desc: "Penanganan kerusakan atau pengerjaan lebih kompleks." },
  { icon: Settings2, name: "Overhaul", duration: "4 Jam", desc: "Pembongkaran dan pemeriksaan komponen mesin menyeluruh." },
  { icon: MessageSquareText, name: "Request Customer", duration: "Menyesuaikan", desc: "Jelaskan kebutuhan atau pekerjaan khusus Anda." },
];

const flow = [
  { icon: MousePointerClick, title: "Pilih Layanan", desc: "Tentukan jenis servis yang dibutuhkan motor Anda." },
  { icon: CalendarCheck, title: "Atur Jadwal", desc: "Pilih tanggal & jam servis yang tersedia (H+1 hingga 7 hari)." },
  { icon: Bell, title: "Konfirmasi", desc: "Isi data & kirim konfirmasi via WhatsApp otomatis." },
  { icon: CheckCircle2, title: "Datang Sesuai Jadwal", desc: "Tanpa antre, mekanik siap menangani motor Anda." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />

      {/* HERO */}
      <section id="beranda" className="relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <img src={HERO_IMG} alt="workshop" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F] via-transparent to-transparent" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-20 md:grid-cols-12 md:px-8 md:py-28">
          <div className="md:col-span-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-blue-200 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Booking Motor Online
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tighter text-white md:text-7xl">
              Servis Motor <br />
              <span className="text-blue-400">Tanpa Antre.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-200 md:text-xl">
              Menjadi bengkel motor yang unggul dan terpercaya dalam memberikan layanan perawatan dan perbaikan kendaraan, dengan mengutamakan kualitas, kejujuran, serta kepuasan pelanggan sebagai prioritas utama.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/reservasi">
                <Button
                  data-testid="hero-buat-reservasi-btn"
                  size="lg"
                  className="rounded-full bg-blue-600 px-8 py-6 text-base hover:bg-blue-700 transition-colors"
                >
                  Buat Reservasi <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#layanan" className="text-sm font-medium text-white/80 underline-offset-4 hover:underline">
                Lihat Layanan →
              </a>
            </div>

            <div className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-4">
              {[
                { icon: Users2, label: "5 Mekanik Profesional" },
                { icon: CalendarClock, label: "Booking Online" },
                { icon: Clock, label: "Jadwal Teratur" },
                { icon: MessageCircle, label: "Konfirmasi WhatsApp" },
              ].map((it, i) => (
                <div key={i} className="flex items-center gap-3 text-white/90">
                  <it.icon strokeWidth={1.5} className="h-6 w-6 text-blue-300" />
                  <span className="text-sm font-medium">{it.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LAYANAN */}
      <section id="layanan" className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="mb-14 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Layanan Kami</div>
            <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Pilih jenis servis <br />sesuai kebutuhan.
            </h2>
          </div>
          <p className="max-w-md text-slate-600">
            4 tipe servis dengan estimasi durasi yang jelas. Mekanik dialokasikan otomatis oleh sistem.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => {
            const codeMap = ["ringan", "berat", "overhaul", "request"];
            const code = codeMap[i] || `svc-${i}`;
            return (
            <Card
              key={s.name}
              data-testid={`service-card-${code}`}
              className="group relative overflow-hidden border-slate-200 bg-white p-6 shadow-none transition-transform hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <s.icon strokeWidth={1.5} className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-semibold">{s.name}</h3>
              <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Durasi · {s.duration}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              <div className="absolute bottom-6 right-6 opacity-0 transition-opacity group-hover:opacity-100">
                <ArrowRight className="h-4 w-4 text-blue-600" />
              </div>
            </Card>
            );
          })}
        </div>
      </section>

      {/* CARA RESERVASI */}
      <section id="cara-reservasi" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Cara Reservasi</div>
              <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                4 langkah mudah, <br />motor cepat siap.
              </h2>
              <p className="mt-6 text-slate-600">
                Reservasi dapat dilakukan mulai H+1 hingga 7 hari ke depan. Bengkel buka Senin–Sabtu, jam 08.00–16.00.
              </p>
              <div className="mt-8 overflow-hidden rounded-xl">
                <img src={SERVICES_BG} alt="mechanic" className="h-64 w-full object-cover" />
              </div>
            </div>
            <div className="md:col-span-7">
              <ol className="space-y-4">
                {flow.map((f, i) => (
                  <li
                    key={i}
                    className="flex gap-5 rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                      <f.icon strokeWidth={1.5} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Langkah {i + 1}</div>
                      <h3 className="mt-1 font-display text-lg font-semibold">{f.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8">
                <Link to="/reservasi">
                  <Button
                    data-testid="cara-reservasi-cta-btn"
                    size="lg"
                    className="rounded-full bg-blue-600 px-8 hover:bg-blue-700 transition-colors"
                  >
                    Mulai Reservasi <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KONTAK / FOOTER */}
      <section id="kontak" className="bg-[#0A192F] py-16 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 md:grid-cols-3 md:px-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-600">
                <Wrench strokeWidth={2} className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-bold">ALDI MOTOR</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-slate-400">
              Bengkel motor terpercaya dengan sistem reservasi online. Tanpa antre, langsung dilayani.
            </p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Jam Operasional</div>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex items-center gap-3">
                <Clock strokeWidth={1.5} className="h-4 w-4 text-blue-400" />
                Senin – Sabtu · 08.00 – 16.00
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <Clock strokeWidth={1.5} className="h-4 w-4" />
                Minggu · Tutup
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Hubungi Kami</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <Phone strokeWidth={1.5} className="h-4 w-4 text-blue-400" />
                +62 812-3456-7890
              </div>
              <div className="flex items-center gap-3">
                <MapPin strokeWidth={1.5} className="h-4 w-4 text-blue-400" />
                Jl. Motor Raya No. 12, Makassar
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-4 pt-6 text-center text-xs text-slate-500 md:px-8">
          © {new Date().getFullYear()} ALDI MOTOR. All rights reserved.
        </div>
      </section>
    </div>
  );
}
