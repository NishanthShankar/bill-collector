import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function Login() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn("password", { email, password, flow: "signIn" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Header */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-primary uppercase font-headline tracking-tight">
            {import.meta.env.VITE_APP_NAME ?? "Financial Ledger"}
          </h1>
          <p className="text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase mt-1">
            {import.meta.env.VITE_APP_SUBTITLE ?? "Institutional Vault"}
          </p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest rounded-xl shadow-sm p-8 space-y-6"
        >
          <div className="text-center">
            <h2 className="text-lg font-headline font-bold text-primary">
              Sign In
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Enter your credentials to continue
            </p>
          </div>

          {error && (
            <div className="bg-error-container rounded-lg px-4 py-3">
              <p className="text-sm text-on-error-container">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-headline font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-on-surface-variant/50">
          Contact your administrator for account access
        </p>
      </div>
    </div>
  );
}
