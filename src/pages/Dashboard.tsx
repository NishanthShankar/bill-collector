import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { getCategoryStyle, getStatusStyle } from "@/lib/styles";
import { formatCurrency, formatDate } from "@/lib/format";

export function Dashboard() {
  const stats = useQuery(api.bills.dashboardStats);
  const navigate = useNavigate();

  if (!stats) {
    return (
      <div className="p-10 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-on-surface-variant">Loading dashboard...</div>
      </div>
    );
  }

  const grandTotal = stats.grandTotal || 1;

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      {/* Hero Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary p-8 rounded-xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-7xl text-white">
              account_balance_wallet
            </span>
          </div>
          <p className="text-on-primary-container font-label text-[10px] uppercase tracking-widest font-bold mb-1">
            Total Due
          </p>
          <h2 className="text-white text-4xl font-headline font-extrabold mb-4 tracking-tight">
            {formatCurrency(stats.totalDue)}
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold">
              {stats.categoryBreakdown.length} categories tracked
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm flex flex-col justify-between border-l-4 border-primary">
          <div>
            <p className="text-on-surface-variant font-label text-[10px] uppercase tracking-widest font-bold mb-1">
              Next 7 Days
            </p>
            <h2 className="text-primary text-4xl font-headline font-extrabold tracking-tight">
              {formatCurrency(stats.upcomingTotal)}
            </h2>
          </div>
          <div className="mt-4 flex items-center gap-2 text-primary font-semibold text-sm">
            <span className="material-symbols-outlined text-sm">event</span>
            {stats.upcomingCount} Bills pending attention
          </div>
        </div>

        <div className="bg-error-container p-8 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-on-error-container font-label text-[10px] uppercase tracking-widest font-bold mb-1">
              Overdue
            </p>
            <h2 className="text-error text-4xl font-headline font-extrabold tracking-tight">
              {formatCurrency(stats.overdueTotal)}
            </h2>
          </div>
          <div className="mt-4 flex items-center gap-2 text-error font-bold text-sm">
            <span className="material-symbols-outlined text-sm">warning</span>
            {stats.overdueCount > 0
              ? "Immediate action required"
              : "All clear!"}
          </div>
        </div>
      </section>

      {/* Category Breakdown */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <h3 className="text-2xl font-headline font-bold text-primary">
            Portfolio Allocation
          </h3>
          <p className="text-on-surface-variant text-sm">
            Live category metrics
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {stats.categoryBreakdown.map((cat) => {
            const style = getCategoryStyle(cat.color);
            const percentage = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;

            return (
              <div
                key={cat._id}
                className={`bg-surface-container-low p-6 rounded-xl border-t-2 ${style.border}`}
              >
                <div className="flex justify-between items-start mb-6">
                  <span className={`p-2 ${style.bg} rounded-lg`}>
                    <span className={`material-symbols-outlined ${style.iconText}`}>
                      {cat.icon}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">
                    {cat.name}
                  </span>
                </div>
                <p className="text-2xl font-headline font-bold text-primary">
                  {formatCurrency(cat.total)}
                </p>
                <div className="mt-4 w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`${style.bar} h-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 flex justify-between items-center bg-white">
          <h3 className="text-xl font-headline font-bold text-primary">
            Recent Transactions
          </h3>
          <button
            onClick={() => navigate("/bills")}
            className="text-primary font-semibold text-sm hover:underline"
          >
            View All Ledger
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Merchant
                </th>
                <th className="px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Category
                </th>
                <th className="px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Due Date
                </th>
                <th className="px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Amount
                </th>
                <th className="px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {stats.recentBills.map((bill) => {
                const catStyle = getCategoryStyle(bill.category?.color ?? "primary");
                const status = getStatusStyle(bill.status);
                return (
                  <tr
                    key={bill._id}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                          <span className="material-symbols-outlined text-slate-500 text-sm">
                            {bill.icon}
                          </span>
                        </div>
                        <span className="font-bold text-sm text-primary">
                          {bill.merchant}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={`px-3 py-1 ${catStyle.bg} ${catStyle.text} text-[10px] font-bold rounded-full`}
                      >
                        {bill.category?.name ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-on-surface-variant">
                      {formatDate(bill.dueDate)}
                    </td>
                    <td className="px-8 py-5 font-bold text-sm text-primary">
                      {formatCurrency(bill.amount)}
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={`px-3 py-1 ${status.bg} ${status.text} text-[10px] font-bold rounded-full`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {stats.recentBills.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-on-surface-variant">
                    No bills yet. Add your first bill to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
