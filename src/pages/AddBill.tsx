import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BillScanner, type ScanResult } from "@/components/BillScanner";
import { SUPPORTED_CURRENCIES } from "@/lib/format";

export function AddBill() {
  const categories = useQuery(api.categories.list);
  const bills = useQuery(api.bills.list);
  const billIcons = useQuery(api.appConfig.get, { key: "billIcons" }) as string[] | null;
  const createBill = useMutation(api.bills.create);
  const updateBill = useMutation(api.bills.update);
  const createBillerMapping = useMutation(api.billerMappings.create);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [scanMode, setScanMode] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [icon, setIcon] = useState("credit_card");
  const [categoryId, setCategoryId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [status, setStatus] = useState<"pending" | "paid" | "overdue">("pending");
  const [notes, setNotes] = useState("");
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string | null>(null);
  const [showOcrText, setShowOcrText] = useState(false);
  const [rememberBiller, setRememberBiller] = useState(false);

  const iconOptions: string[] = billIcons ?? [];

  // Look up biller mapping when merchant changes after scan
  const billerMatch = useQuery(
    api.billerMappings.findByName,
    merchant ? { name: merchant } : "skip"
  );

  // Apply biller match to form when found
  useEffect(() => {
    if (billerMatch && rawOcrText) {
      setIcon(billerMatch.icon);
      setCategoryId(billerMatch.categoryId);
    }
  }, [billerMatch, rawOcrText]);

  useEffect(() => {
    if (editId && bills) {
      const bill = bills.find((b) => b._id === editId);
      if (bill) {
        setMerchant(bill.merchant);
        setIcon(bill.icon);
        setCategoryId(bill.categoryId);
        setDueDate(bill.dueDate);
        setAmount(bill.amount.toString());
        setCurrency(bill.currency ?? "INR");
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

  function handleScanComplete(result: ScanResult) {
    setScanMode(false);
    setImageStorageId(result.imageStorageId);
    setRawOcrText(result.rawText);

    if (result.merchant) setMerchant(result.merchant);
    if (result.amount !== null) setAmount(result.amount.toString());
    if (result.date) setDueDate(result.date);
    if (result.description) setNotes(result.description);
  }

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
        currency,
        status,
        notes: notes || undefined,
        imageId: imageStorageId ?? undefined,
      });
    } else {
      await createBill({
        merchant,
        icon,
        categoryId: categoryId as Id<"categories">,
        dueDate,
        amount: parseFloat(amount),
        currency,
        status,
        notes: notes || undefined,
        imageId: imageStorageId ?? undefined,
      });
    }

    // Create biller mapping if requested
    if (rememberBiller && merchant && categoryId && !billerMatch) {
      await createBillerMapping({
        name: merchant,
        categoryId: categoryId as Id<"categories">,
        icon,
        matchPatterns: [merchant.toLowerCase()],
      });
    }

    navigate("/bills");
  }

  return (
    <div className="p-10 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-headline font-bold text-primary">
          {editId ? "Edit Bill" : "Add New Bill"}
        </h2>
        {!editId && !scanMode && (
          <button
            onClick={() => setScanMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-fixed text-on-primary-fixed-variant rounded-lg font-headline font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">
              document_scanner
            </span>
            Scan a Bill
          </button>
        )}
      </div>

      {scanMode ? (
        <BillScanner
          onScanComplete={handleScanComplete}
          onCancel={() => setScanMode(false)}
        />
      ) : (
        <>
          {/* OCR text reference (collapsible) */}
          {rawOcrText && (
            <div className="bg-surface-container-low rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowOcrText(!showOcrText)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    description
                  </span>
                  OCR Text Reference
                </span>
                <span className="material-symbols-outlined text-sm">
                  {showOcrText ? "expand_less" : "expand_more"}
                </span>
              </button>
              {showOcrText && (
                <pre className="px-4 pb-4 text-xs text-on-surface-variant whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                  {rawOcrText}
                </pre>
              )}
            </div>
          )}

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
              {billerMatch && rawOcrText && (
                <p className="text-xs text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">
                    check_circle
                  </span>
                  Matched to known biller: {billerMatch.name}
                </p>
              )}
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
                  Organization
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
                  Amount
                </label>
                <div className="flex gap-2">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-24 px-3 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
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

            {/* Remember biller checkbox — only show for new scanned bills without existing match */}
            {rawOcrText && !editId && !billerMatch && merchant && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberBiller}
                  onChange={(e) => setRememberBiller(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <span className="text-sm text-on-surface-variant">
                  Remember this biller for future scans
                </span>
              </label>
            )}

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
        </>
      )}
    </div>
  );
}
