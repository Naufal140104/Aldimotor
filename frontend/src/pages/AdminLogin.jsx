import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@aldimotor.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  if (user) return <Navigate to="/admin" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.ok) { toast.success("Login berhasil"); nav("/admin"); }
    else toast.error(r.error);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-slate-200 p-8">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Wrench strokeWidth={2} className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Admin ALDI MOTOR</h1>
          <p className="mt-1 text-sm text-slate-500">Masuk ke dashboard pengelolaan</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              data-testid="admin-email-input" className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw" type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              data-testid="admin-password-input" className="mt-2"
            />
          </div>
          <Button
            type="submit" disabled={loading}
            data-testid="admin-login-btn"
            className="w-full rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</> : "Masuk"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
