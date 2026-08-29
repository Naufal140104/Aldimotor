import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Wrench, Loader2, User, Lock } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  if (user) return <Navigate to="/admin" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(username, password);
    setLoading(false);
    if (r.ok) { toast.success("Login berhasil"); nav("/admin"); }
    else toast.error(r.error);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-600 text-white">
            <Wrench strokeWidth={2} className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            ALDI <span className="text-blue-600">MOTOR</span>
          </span>
        </div>
        <Card className="border-slate-200 p-8">
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Admin Panel</div>
            <h1 className="mt-2 font-display text-2xl font-bold">Masuk ke Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Silakan masuk dengan akun admin Anda.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="username">Username</Label>
              <div className="relative mt-2">
                <User strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="username" type="text" required autoComplete="username"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  data-testid="admin-username-input"
                  className="pl-9"
                  placeholder="masukkan username"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <div className="relative mt-2">
                <Lock strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="pw" type="password" required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  data-testid="admin-password-input"
                  className="pl-9"
                  placeholder="masukkan password"
                />
              </div>
            </div>
            <Button
              type="submit" disabled={loading}
              data-testid="admin-login-btn"
              className="w-full rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</> : "Masuk ke Dashboard"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-slate-500">
          Halaman khusus admin bengkel. Customer tidak perlu login untuk membuat reservasi.
        </p>
      </div>
    </div>
  );
}
