import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategoryStyle, getStatusStyle } from "@/lib/styles";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type Bill = {
  _id: Id<"bills">;
  merchant: string;
  icon: string;
  categoryId: Id<"categories">;
  dueDate: string;
  amount: number;
  currency?: string;
  status: "paid" | "pending" | "overdue";
  notes?: string;
  imageUrl?: string | null;
  contentType?: string | null;
  emailMessageId?: string;
  emailAccountId?: Id<"emailAccounts">;
  category: { name: string; color: string } | null;
};

type SortField = "dueDate" | "amount";
type SortDir = "asc" | "desc";
type FilterMode =
  | "none"
  | "single_date"
  | "date_range"
  | "month"
  | "financial_year"
  | "calendar_year";

export function BillList() {
  const bills = useQuery(api.bills.list);
  const categories = useQuery(api.categories.list);
  const updateBill = useMutation(api.bills.update);
  const removeBill = useMutation(api.bills.remove);
  const navigate = useNavigate();

  // Status filter
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue">(
    "all"
  );

  // Sort
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("none");
  const [filterDate, setFilterDate] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterFinancialYear, setFilterFinancialYear] = useState("");
  const [filterCalendarYear, setFilterCalendarYear] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Sheet
  const [viewBill, setViewBill] = useState<Bill | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  // --- Filtering ---
  let filteredBills = bills?.filter(
    (b) => filter === "all" || b.status === filter
  );

  // Category filter
  if (filterCategoryId && filteredBills) {
    filteredBills = filteredBills.filter(
      (b) => b.categoryId === filterCategoryId
    );
  }

  // Date filters
  if (filteredBills && filterMode !== "none") {
    filteredBills = filteredBills.filter((b) => {
      switch (filterMode) {
        case "single_date":
          return filterDate ? b.dueDate === filterDate : true;
        case "date_range":
          return (
            (!filterDateFrom || b.dueDate >= filterDateFrom) &&
            (!filterDateTo || b.dueDate <= filterDateTo)
          );
        case "month":
          return filterMonth ? b.dueDate.startsWith(filterMonth) : true;
        case "financial_year": {
          if (!filterFinancialYear) return true;
          const fy = parseInt(filterFinancialYear);
          return b.dueDate >= `${fy}-04-01` && b.dueDate <= `${fy + 1}-03-31`;
        }
        case "calendar_year":
          return filterCalendarYear
            ? b.dueDate.startsWith(filterCalendarYear)
            : true;
        default:
          return true;
      }
    });
  }

  // --- Sorting ---
  const sortedBills = filteredBills?.slice().sort((a, b) => {
    let cmp = 0;
    if (sortField === "dueDate") {
      cmp = a.dueDate.localeCompare(b.dueDate);
    } else {
      cmp = a.amount - b.amount;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const allSelected =
    sortedBills &&
    sortedBills.length > 0 &&
    sortedBills.every((b) => selected.has(b._id));

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!sortedBills) return;
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sortedBills.map((b) => b._id)));
  }

  function getSelectedBills(): Bill[] {
    return (sortedBills ?? []).filter((b) => selected.has(b._id));
  }

  async function handleBulkMarkPaid() {
    for (const bill of getSelectedBills().filter((b) => b.status !== "paid")) {
      await updateBill({ id: bill._id, status: "paid" });
    }
    setSelected(new Set());
  }

  async function handleBulkDelete() {
    const sel = getSelectedBills();
    if (!confirm(`Delete ${sel.length} bill(s)? This cannot be undone.`)) return;
    for (const bill of sel) await removeBill({ id: bill._id });
    setSelected(new Set());
  }

  function downloadBill(bill: Bill) {
    if (!bill.imageUrl) return;
    const a = document.createElement("a");
    a.href = bill.imageUrl;
    a.download = `bill-${bill.merchant.replace(/\s+/g, "-").toLowerCase()}-${bill.dueDate}`;
    a.target = "_blank";
    a.click();
  }

  function handleBulkDownload() {
    const sel = getSelectedBills().filter((b) => b.imageUrl);
    if (sel.length === 0) {
      alert("None of the selected bills have an attached document.");
      return;
    }
    for (const bill of sel) downloadBill(bill);
  }

  function openBillSheet(bill: Bill) {
    setViewBill(bill);
    setEditNotes(bill.notes ?? "");
    setNotesDirty(false);
  }

  async function saveNotes() {
    if (!viewBill) return;
    await updateBill({ id: viewBill._id, notes: editNotes });
    setViewBill({ ...viewBill, notes: editNotes });
    setNotesDirty(false);
  }

  function clearFilters() {
    setFilterMode("none");
    setFilterDate("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterMonth("");
    setFilterFinancialYear("");
    setFilterCalendarYear("");
    setFilterCategoryId("");
  }

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return (
        <span className="material-symbols-outlined text-xs opacity-30">
          unfold_more
        </span>
      );
    return (
      <span className="material-symbols-outlined text-xs">
        {sortDir === "asc" ? "arrow_upward" : "arrow_downward"}
      </span>
    );
  }

  // Parse email info from notes
  function parseEmailInfo(notes?: string) {
    if (!notes) return null;
    const fromMatch = notes.match(/^From:\s*(.+)$/m);
    const subjectMatch = notes.match(/^Subject:\s*(.+)$/m);
    if (!fromMatch && !subjectMatch) return null;
    return {
      from: fromMatch?.[1] ?? "",
      subject: subjectMatch?.[1] ?? "",
    };
  }

  function getGmailLink(emailMessageId?: string) {
    if (!emailMessageId) return null;
    const cleaned = emailMessageId.replace(/[<>]/g, "");
    return `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(cleaned)}`;
  }

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-headline font-bold text-primary">
          Bill Ledger
        </h2>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              showFilters || filterMode !== "none" || filterCategoryId
                ? "bg-primary text-white"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              filter_list
            </span>
            Filters
          </button>
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

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-primary text-sm">
              Advanced Filters
            </h3>
            <button
              onClick={clearFilters}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Clear All
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["none", "None"],
                ["single_date", "Date"],
                ["date_range", "Date Range"],
                ["month", "Month"],
                ["financial_year", "Financial Year"],
                ["calendar_year", "Calendar Year"],
              ] as [FilterMode, string][]
            ).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterMode === mode
                    ? "bg-primary text-white"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            {filterMode === "single_date" && (
              <div className="space-y-1">
                <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Date
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm"
                />
              </div>
            )}
            {filterMode === "date_range" && (
              <>
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    From
                  </label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    To
                  </label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm"
                  />
                </div>
              </>
            )}
            {filterMode === "month" && (
              <div className="space-y-1">
                <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Month
                </label>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm"
                />
              </div>
            )}
            {filterMode === "financial_year" && (
              <div className="space-y-1">
                <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Financial Year (Apr–Mar)
                </label>
                <select
                  value={filterFinancialYear}
                  onChange={(e) => setFilterFinancialYear(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm"
                >
                  <option value="">All</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      FY {y}–{y + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {filterMode === "calendar_year" && (
              <div className="space-y-1">
                <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Calendar Year
                </label>
                <select
                  value={filterCalendarYear}
                  onChange={(e) => setFilterCalendarYear(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm"
                >
                  <option value="">All</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Organization filter — always visible */}
            <div className="space-y-1">
              <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                Organization
              </label>
              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm"
              >
                <option value="">All</option>
                {categories?.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="bg-primary-fixed rounded-xl px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-on-primary-fixed-variant">
            {selected.size} bill{selected.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkMarkPaid}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90"
            >
              <span className="material-symbols-outlined text-sm">
                check_circle
              </span>
              Mark Paid
            </button>
            <button
              onClick={handleBulkDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90"
            >
              <span className="material-symbols-outlined text-sm">
                download
              </span>
              Download
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-error text-white rounded-lg text-sm font-semibold hover:opacity-90"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="p-1.5 hover:bg-surface-container-high rounded-lg"
            >
              <span className="material-symbols-outlined text-on-primary-fixed-variant text-sm">
                close
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Bill Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={!!allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Merchant
                </th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Organization
                </th>
                <th
                  className="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant cursor-pointer select-none hover:text-primary"
                  onClick={() => toggleSort("dueDate")}
                >
                  <span className="flex items-center gap-1">
                    Due Date <SortIcon field="dueDate" />
                  </span>
                </th>
                <th
                  className="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant cursor-pointer select-none hover:text-primary"
                  onClick={() => toggleSort("amount")}
                >
                  <span className="flex items-center gap-1">
                    Amount <SortIcon field="amount" />
                  </span>
                </th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Status
                </th>
                <th className="px-6 py-4 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {sortedBills?.map((bill) => {
                const catStyle = getCategoryStyle(
                  bill.category?.color ?? "primary"
                );
                const status = getStatusStyle(bill.status);
                const isSelected = selected.has(bill._id);
                return (
                  <tr
                    key={bill._id}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary-fixed/20"
                        : "hover:bg-surface-container-low/50"
                    }`}
                    onClick={() => openBillSheet(bill as Bill)}
                  >
                    <td
                      className="px-4 py-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(bill._id)}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-6 py-5">
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
                    <td className="px-6 py-5">
                      <span
                        className={`px-3 py-1 ${catStyle.bg} ${catStyle.text} text-[10px] font-bold rounded-full`}
                      >
                        {bill.category?.name ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">
                      {formatDate(bill.dueDate)}
                    </td>
                    <td className="px-6 py-5 font-bold text-sm text-primary">
                      {formatCurrency(bill.amount, bill.currency)}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`px-3 py-1 ${status.bg} ${status.text} text-[10px] font-bold rounded-full`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td
                      className="px-6 py-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        {bill.imageUrl && (
                          <button
                            onClick={() => downloadBill(bill as Bill)}
                            className="p-1.5 hover:bg-surface-container-high rounded-lg transition-colors"
                            title="Download bill"
                          >
                            <span className="material-symbols-outlined text-on-surface-variant text-sm">
                              download
                            </span>
                          </button>
                        )}
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
                            if (confirm("Delete this bill?"))
                              removeBill({ id: bill._id as Id<"bills"> });
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
              {sortedBills?.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-8 py-12 text-center text-on-surface-variant"
                  >
                    No bills found.
                  </td>
                </tr>
              )}
              {!sortedBills && (
                <tr>
                  <td
                    colSpan={7}
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

      {/* Bill Detail Sheet */}
      <Sheet
        open={viewBill !== null}
        onOpenChange={(open) => {
          if (!open) setViewBill(null);
        }}
      >
        <SheetContent
          side="right"
          className="sm:max-w-2xl w-[640px] overflow-y-auto p-0"
        >
          {viewBill && (
            <>
              <SheetHeader className="bg-primary px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">
                      {viewBill.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-white font-headline font-bold text-lg">
                      {viewBill.merchant}
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusStyle(viewBill.status).bg} ${getStatusStyle(viewBill.status).text}`}
                      >
                        {getStatusStyle(viewBill.status).label}
                      </span>
                      <span className="text-white/60 text-xs">
                        {formatCurrency(viewBill.amount, viewBill.currency)}{" "}
                        &middot; {formatDate(viewBill.dueDate)}
                      </span>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="divide-y divide-surface-container">
                {/* Document Preview */}
                <div className="p-4 bg-surface-container-low">
                  {viewBill.imageUrl ? (
                    viewBill.contentType === "application/pdf" ? (
                      <iframe
                        src={viewBill.imageUrl}
                        className="w-full h-[400px] rounded-lg"
                        title="Bill document"
                      />
                    ) : (
                      <img
                        src={viewBill.imageUrl}
                        alt={`Bill from ${viewBill.merchant}`}
                        className="max-w-full max-h-[400px] rounded-lg shadow-sm mx-auto object-contain"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/50">
                      <span className="material-symbols-outlined text-3xl mb-2">
                        hide_image
                      </span>
                      <p className="text-sm">No bill document attached</p>
                    </div>
                  )}
                  {viewBill.imageUrl && (
                    <button
                      onClick={() => downloadBill(viewBill)}
                      className="mt-3 flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">
                        download
                      </span>
                      Download document
                    </button>
                  )}
                </div>

                {/* Email Info */}
                {viewBill.emailMessageId && (() => {
                  const emailInfo = parseEmailInfo(viewBill.notes);
                  const gmailLink = getGmailLink(viewBill.emailMessageId);
                  if (!emailInfo) return null;
                  return (
                    <div className="px-6 py-4 space-y-2">
                      <h4 className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                        Email Source
                      </h4>
                      <div className="bg-surface-container-low rounded-lg p-4 space-y-1">
                        <p className="text-xs text-on-surface-variant">
                          <span className="font-semibold">From:</span>{" "}
                          {emailInfo.from}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          <span className="font-semibold">Subject:</span>{" "}
                          {emailInfo.subject}
                        </p>
                      </div>
                      {gmailLink && (
                        <a
                          href={gmailLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
                        >
                          <span className="material-symbols-outlined text-sm">
                            open_in_new
                          </span>
                          Open in Gmail
                        </a>
                      )}
                    </div>
                  );
                })()}

                {/* Bill Details */}
                <div className="px-6 py-4 space-y-4">
                  <h4 className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                        Amount
                      </p>
                      <p className="text-2xl font-headline font-extrabold text-primary">
                        {formatCurrency(viewBill.amount, viewBill.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                        Due Date
                      </p>
                      <p className="text-sm font-semibold text-primary">
                        {formatDate(viewBill.dueDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                        Organization
                      </p>
                      <span
                        className={`px-3 py-1 ${getCategoryStyle(viewBill.category?.color ?? "primary").bg} ${getCategoryStyle(viewBill.category?.color ?? "primary").text} text-[10px] font-bold rounded-full`}
                      >
                        {viewBill.category?.name ?? "Unknown"}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                        Status
                      </p>
                      <span
                        className={`px-3 py-1 ${getStatusStyle(viewBill.status).bg} ${getStatusStyle(viewBill.status).text} text-[10px] font-bold rounded-full`}
                      >
                        {getStatusStyle(viewBill.status).label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Editable Notes */}
                <div className="px-6 py-4 space-y-2">
                  <h4 className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    Notes
                  </h4>
                  <textarea
                    value={editNotes}
                    onChange={(e) => {
                      setEditNotes(e.target.value);
                      setNotesDirty(e.target.value !== (viewBill.notes ?? ""));
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary resize-none"
                    rows={4}
                    placeholder="Add notes..."
                  />
                  {notesDirty && (
                    <button
                      onClick={saveNotes}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90"
                    >
                      Save Notes
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 flex gap-2">
                  {viewBill.status !== "paid" && (
                    <button
                      onClick={() => {
                        updateBill({ id: viewBill._id, status: "paid" });
                        setViewBill({ ...viewBill, status: "paid" });
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90"
                    >
                      <span className="material-symbols-outlined text-sm">
                        check_circle
                      </span>
                      Mark as Paid
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setViewBill(null);
                      navigate(`/add?edit=${viewBill._id}`);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-low text-primary rounded-lg text-sm font-semibold hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-sm">
                      edit
                    </span>
                    Edit Bill
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
