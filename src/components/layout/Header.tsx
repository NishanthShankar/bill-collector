export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md flex justify-between items-center w-full px-8 py-4 shadow-sm border-b border-slate-200/50">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold tracking-tight text-blue-950 font-headline">
          {import.meta.env.VITE_APP_HEADER_TITLE ?? "Ledger Precision"}
        </span>
        <div className="relative hidden lg:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
            search
          </span>
          <input
            className="pl-10 pr-4 py-1.5 bg-surface-container-low border-none rounded-full text-sm w-64 focus:ring-1 focus:ring-primary"
            placeholder="Search transactions..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <span className="material-symbols-outlined text-blue-900">
            notifications
          </span>
        </button>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors">
          <span className="material-symbols-outlined text-blue-900">
            settings
          </span>
        </button>
        <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center ml-2 border border-outline-variant/20">
          <span className="material-symbols-outlined text-on-primary text-sm">
            person
          </span>
        </div>
      </div>
    </header>
  );
}
