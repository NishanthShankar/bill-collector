import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategoryStyle, getStatusStyle } from "@/lib/styles";
import { formatCurrency, formatDate } from "@/lib/format";

export function BillList() {
  const bills = useQuery(api.bills.list);
  const updateBill = useMutation(api.bills.update);
  const removeBill = useMutation(api.bills.remove);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");

  const filteredBills = bills?.filter(
    (b) => filter === "all" || b.status === filter
  );

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-headline font-bold text-primary">
          Bill Ledger
        </h2>
        <div className="flex gap-2">
          {(["all", "pending", "overdue", "paid"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === s
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
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
                <th className="px-8 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredBills?.map((bill) => {
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
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1">
                        {bill.status !== "paid" && (
                          <button
                            onClick={() =>
                              updateBill({ id: bill._id, status: "paid" })
                            }
                            className="p-1.5 hover:bg-secondary-container rounded-lg transition-colors"
                            title="Mark as paid"
                          >
                            <span className="material-symbols-outlined text-secondary text-sm">
                              check_circle
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/add?edit=${bill._id}`)}
                          className="p-1.5 hover:bg-surface-container-high rounded-lg transition-colors"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-on-surface-variant text-sm">
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this bill?")) {
                              removeBill({ id: bill._id as Id<"bills"> });
                            }
                          }}
                          className="p-1.5 hover:bg-error-container rounded-lg transition-colors"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-error text-sm">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredBills?.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-8 py-12 text-center text-on-surface-variant"
                  >
                    No bills found.
                  </td>
                </tr>
              )}
              {!filteredBills && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-8 py-12 text-center text-on-surface-variant"
                  >
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
