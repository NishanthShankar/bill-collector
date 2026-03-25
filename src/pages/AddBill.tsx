import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function AddBill() {
  const categories = useQuery(api.categories.list);
  const bills = useQuery(api.bills.list);
  const billIcons = useQuery(api.appConfig.get, { key: "billIcons" }) as string[] | null;
  const createBill = useMutation(api.bills.create);
  const updateBill = useMutation(api.bills.update);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [merchant, setMerchant] = useState("");
  const [icon, setIcon] = useState("credit_card");
  const [categoryId, setCategoryId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"pending" | "paid" | "overdue">("pending");
  const [notes, setNotes] = useState("");

  const iconOptions: string[] = billIcons ?? [];

  useEffect(() => {
    if (editId && bills) {
      const bill = bills.find((b) => b._id === editId);
      if (bill) {
        setMerchant(bill.merchant);
        setIcon(bill.icon);
        setCategoryId(bill.categoryId);
        setDueDate(bill.dueDate);
        setAmount(bill.amount.toString());
        setStatus(bill.status);
        setNotes(bill.notes ?? "");
      }
    }
  }, [editId, bills]);

  useEffect(() => {
    if (!categoryId && categories && categories.length > 0) {
      setCategoryId(categories[0]._id);
    }
  }, [categories, categoryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return;

    if (editId) {
      await updateBill({
        id: editId as Id<"bills">,
        merchant,
        icon,
        categoryId: categoryId as Id<"categories">,
        dueDate,
        amount: parseFloat(amount),
        status,
        notes: notes || undefined,
      });
    } else {
      await createBill({
        merchant,
        icon,
        categoryId: categoryId as Id<"categories">,
        dueDate,
        amount: parseFloat(amount),
        status,
        notes: notes || undefined,
      });
    }
    navigate("/bills");
  }

  return (
    <div className="p-10 max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-headline font-bold text-primary">
        {editId ? "Edit Bill" : "Add New Bill"}
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest rounded-xl shadow-sm p-8 space-y-6"
      >
        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
            Merchant Name
          </label>
          <input
            type="text"
            required
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="e.g. AWS Cloud Infrastructure"
          />
        </div>

        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
            Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {iconOptions.map((ico) => (
              <button
                key={ico}
                type="button"
                onClick={() => setIcon(ico)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  icon === ico
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {ico}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
            >
              {categories?.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "pending" | "paid" | "overdue")
              }
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Due Date
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Amount ($)
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary resize-none"
            rows={3}
            placeholder="Any additional notes..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 bg-primary text-white py-3 rounded-lg font-headline font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {editId ? "Update Bill" : "Add Bill"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-lg bg-surface-container-low text-on-surface-variant font-headline font-semibold text-sm hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
