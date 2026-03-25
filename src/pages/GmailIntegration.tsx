import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { formatDate } from "@/lib/format";

export function GmailIntegration() {
  const accounts = useQuery(api.emailAccounts.list);
  const categories = useQuery(api.categories.list);
  const createAccount = useMutation(api.emailAccounts.create);
  const updateAccount = useMutation(api.emailAccounts.update);
  const removeAccount = useMutation(api.emailAccounts.remove);
  const syncAccount = useAction(api.gmail.syncAccount);

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [label, setLabel] = useState("");
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    emailsFound: number;
    billsCreated: number;
    errors: string[];
  } | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await createAccount({
      email,
      appPassword,
      label: label || undefined,
      defaultCategoryId: defaultCategoryId
        ? (defaultCategoryId as Id<"categories">)
        : undefined,
    });
    setEmail("");
    setAppPassword("");
    setLabel("");
    setDefaultCategoryId("");
    setShowForm(false);
  }

  async function handleSync(accountId: Id<"emailAccounts">) {
    setSyncing(accountId);
    setSyncResult(null);
    try {
      const result = await syncAccount({ emailAccountId: accountId });
      setSyncResult(result);
    } catch (err) {
      setSyncResult({
        emailsFound: 0,
        billsCreated: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      });
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-headline font-bold text-primary">
            Gmail Integration
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Connect Gmail accounts to automatically find and import bills
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-headline font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add Account
        </button>
      </div>

      {/* Setup Instructions */}
      <div className="bg-primary-fixed/30 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">
            info
          </span>
          <h3 className="font-headline font-bold text-primary text-sm">
            How to set up Gmail App Passwords
          </h3>
        </div>
        <ol className="text-sm text-on-surface-variant space-y-1.5 pl-5 list-decimal">
          <li>
            Enable{" "}
            <strong>2-Step Verification</strong> on your Google Account at{" "}
            <a
              href="https://myaccount.google.com/security"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              myaccount.google.com/security
            </a>
          </li>
          <li>
            Go to{" "}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              myaccount.google.com/apppasswords
            </a>
          </li>
          <li>
            Enter a name (e.g., "Bill Collector") and click <strong>Create</strong>
          </li>
          <li>Copy the 16-character password and paste it below</li>
        </ol>
        <p className="text-xs text-on-surface-variant/70">
          App passwords grant read-only IMAP access. Your regular Gmail password
          is never used. Credentials are stored in your Convex database.
        </p>
      </div>

      {/* Add Account Form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-surface-container-lowest rounded-xl shadow-sm p-6 space-y-4"
        >
          <h3 className="font-headline font-bold text-primary">
            Add Gmail Account
          </h3>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
              placeholder='e.g. "Work Gmail" or "Personal"'
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Gmail Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
              placeholder="you@gmail.com"
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              App Password
            </label>
            <input
              type="password"
              required
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary font-mono"
              placeholder="xxxx xxxx xxxx xxxx"
              minLength={16}
            />
            <p className="text-xs text-on-surface-variant/70">
              The 16-character app password from Google (spaces optional)
            </p>
          </div>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Default Organization
            </label>
            <select
              value={defaultCategoryId}
              onChange={(e) => setDefaultCategoryId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
            >
              <option value="">Auto-detect</option>
              {categories?.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-on-surface-variant/70">
              Bills from this email will be assigned to this organization by default
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-headline font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Add Account
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-headline font-semibold text-sm hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Sync Result Banner */}
      {syncResult && (
        <div
          className={`rounded-xl p-4 flex items-start gap-3 ${
            syncResult.errors.length > 0
              ? "bg-error-container"
              : "bg-secondary-container"
          }`}
        >
          <span
            className={`material-symbols-outlined text-lg ${
              syncResult.errors.length > 0
                ? "text-on-error-container"
                : "text-on-secondary-container"
            }`}
          >
            {syncResult.errors.length > 0 ? "warning" : "check_circle"}
          </span>
          <div className="flex-1">
            <p
              className={`text-sm font-semibold ${
                syncResult.errors.length > 0
                  ? "text-on-error-container"
                  : "text-on-secondary-container"
              }`}
            >
              Sync complete: {syncResult.emailsFound} emails scanned,{" "}
              {syncResult.billsCreated} bills created
            </p>
            {syncResult.errors.length > 0 && (
              <p className="text-xs text-on-error-container/80 mt-1">
                {syncResult.errors[0]}
              </p>
            )}
          </div>
          <button
            onClick={() => setSyncResult(null)}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Account List */}
      <div className="space-y-4">
        {accounts?.map((account) => (
          <AccountCard
            key={account._id}
            account={account}
            categories={categories ?? []}
            onSync={() => handleSync(account._id)}
            onRemove={() => {
              if (confirm(`Remove ${account.email}?`)) {
                removeAccount({ id: account._id });
              }
            }}
            onUpdateOrg={(orgId) =>
              updateAccount({
                id: account._id,
                defaultCategoryId: orgId as Id<"categories">,
              })
            }
            isSyncing={syncing === account._id}
          />
        ))}

        {accounts?.length === 0 && !showForm && (
          <div className="bg-surface-container-lowest rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-3 block">
              mail
            </span>
            <p className="text-on-surface-variant">
              No Gmail accounts connected yet.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-primary font-semibold text-sm hover:underline"
            >
              Add your first account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountCard({
  account,
  categories,
  onSync,
  onRemove,
  onUpdateOrg,
  isSyncing,
}: {
  account: {
    _id: Id<"emailAccounts">;
    email: string;
    label?: string;
    lastSyncAt?: number;
    status: "active" | "error" | "syncing";
    errorMessage?: string;
    defaultCategoryId?: Id<"categories">;
  };
  categories: Array<{ _id: Id<"categories">; name: string }>;
  onSync: () => void;
  onRemove: () => void;
  onUpdateOrg: (orgId: string) => void;
  isSyncing: boolean;
}) {
  const syncLogs = useQuery(api.emailAccounts.getSyncLogs, {
    emailAccountId: account._id,
  });
  const [showLogs, setShowLogs] = useState(false);

  const statusConfig = {
    active: {
      bg: "bg-secondary-container",
      text: "text-on-secondary-container",
      label: "Active",
    },
    error: {
      bg: "bg-error-container",
      text: "text-on-error-container",
      label: "Error",
    },
    syncing: {
      bg: "bg-primary-fixed",
      text: "text-on-primary-fixed-variant",
      label: "Syncing...",
    },
  };

  const status = statusConfig[account.status];

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center">
          <span className="material-symbols-outlined text-primary">mail</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-headline font-bold text-primary truncate">
              {account.label || account.email}
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status.bg} ${status.text}`}
            >
              {status.label}
            </span>
          </div>
          <p className="text-sm text-on-surface-variant truncate">
            {account.email}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-on-surface-variant/70">Org:</span>
            <select
              value={account.defaultCategoryId ?? ""}
              onChange={(e) => onUpdateOrg(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="text-xs px-2 py-0.5 rounded bg-surface-container-low border border-outline-variant/30"
            >
              <option value="">Auto-detect</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          {account.lastSyncAt && (
            <p className="text-xs text-on-surface-variant/70 mt-1">
              Last synced: {formatDate(new Date(account.lastSyncAt).toISOString().split("T")[0])}
            </p>
          )}
          {account.status === "error" && account.errorMessage && (
            <p className="text-xs text-error mt-1 truncate">
              {account.errorMessage}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onSync}
            disabled={isSyncing || account.status === "syncing"}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg font-headline font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <span
              className={`material-symbols-outlined text-sm ${
                isSyncing ? "animate-spin" : ""
              }`}
            >
              {isSyncing ? "progress_activity" : "sync"}
            </span>
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
            title="View sync history"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-sm">
              history
            </span>
          </button>
          <button
            onClick={onRemove}
            className="p-2 hover:bg-error-container rounded-lg transition-colors"
            title="Remove account"
          >
            <span className="material-symbols-outlined text-error text-sm">
              delete
            </span>
          </button>
        </div>
      </div>

      {/* Sync Logs */}
      {showLogs && syncLogs && (
        <div className="bg-surface-container-low px-6 py-4 space-y-2">
          <h4 className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
            Sync History
          </h4>
          {syncLogs.length === 0 ? (
            <p className="text-xs text-on-surface-variant">
              No sync history yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {syncLogs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center gap-3 text-xs"
                >
                  <span className="text-on-surface-variant/70 w-28 shrink-0">
                    {new Date(log.syncedAt).toLocaleString()}
                  </span>
                  <span className="text-on-surface-variant">
                    {log.emailsFound} emails scanned
                  </span>
                  <span className="text-secondary font-semibold">
                    {log.billsCreated} bills created
                  </span>
                  {log.errors && (
                    <span className="text-error truncate" title={log.errors}>
                      Errors occurred
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
