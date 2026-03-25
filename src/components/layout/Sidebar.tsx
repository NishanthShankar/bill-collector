import { NavLink } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";

const navItems = [
  { to: "/", icon: "dashboard", label: "Dashboard" },
  { to: "/bills", icon: "receipt_long", label: "Bill List" },
  { to: "/add", icon: "add_circle", label: "Add Bill" },
  { to: "/organizations", icon: "corporate_fare", label: "Organizations" },
  { to: "/gmail", icon: "mail", label: "Gmail Sync" },
];

export function Sidebar() {
  const { signOut } = useAuthActions();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 border-r border-outline-variant/15 bg-slate-50 flex flex-col p-4 gap-2 z-50">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-black text-blue-950 uppercase font-headline">
          {import.meta.env.VITE_APP_NAME ?? "Financial Ledger"}
        </h1>
        <p className="text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase">
          {import.meta.env.VITE_APP_SUBTITLE ?? "Institutional Vault"}
        </p>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              isActive
                ? "flex items-center gap-3 px-4 py-3 bg-white text-blue-950 shadow-sm rounded-lg font-headline text-sm font-semibold tracking-wide transition-all active:scale-95"
                : "flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-blue-950 hover:translate-x-1 transition-all font-headline text-sm font-semibold tracking-wide"
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 flex flex-col gap-1 border-t border-outline-variant/15">
        <button
          onClick={() => void signOut()}
          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-blue-950 hover:translate-x-1 transition-all font-headline text-sm font-semibold tracking-wide w-full text-left"
        >
          <span className="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
