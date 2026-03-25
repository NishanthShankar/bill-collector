import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function Layout() {
  const navigate = useNavigate();

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <Header />
        <Outlet />
      </main>
      <button
        onClick={() => navigate("/add")}
        className="fixed bottom-8 right-8 bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all z-50"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>
    </div>
  );
}
