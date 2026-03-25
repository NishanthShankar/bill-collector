"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

// Regex patterns for extracting bill data from email body
const AMOUNT_PATTERNS = [
  /(?:total|amount\s*due|balance\s*due|pay\s*(?:this\s*)?amount|total\s*due|grand\s*total)\s*[:.]?\s*(?:₹|Rs\.?|INR|£|€|\$)?\s?(\d{1,3}(?:,\d{2,3})*(?:\.\d{2})?)/i,
  /(?:₹|Rs\.?)\s?(\d{1,3}(?:,\d{2,3})*(?:\.\d{2})?)/,
  /\$\s?(\d{1,3}(?:,\d{3})*\.\d{2})/,
  /£\s?(\d{1,3}(?:,\d{3})*\.\d{2})/,
];

const DATE_PATTERNS = [
  /(?:due\s*date|payment\s*due|pay\s*by|due\s*on|due)\s*[:.]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
  /(?:due\s*date|payment\s*due|pay\s*by|due\s*on|due)\s*[:.]?\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s*\d{4})/i,
  /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
];

const MONTHS: Record<string, string> = {
  jan: "01", january: "01", feb: "02", february: "02",
  mar: "03", march: "03", apr: "04", april: "04",
  may: "05", jun: "06", june: "06", jul: "07", july: "07",
  aug: "08", august: "08", sep: "09", sept: "09", september: "09",
  oct: "10", october: "10", nov: "11", november: "11",
  dec: "12", december: "12",
};

function detectCurrency(text: string): string {
  // Check for currency symbols/keywords near amounts
  if (/₹|Rs\.?|INR|rupee/i.test(text)) return "INR";
  if (/£|GBP|pound sterling/i.test(text)) return "GBP";
  if (/€|EUR|euro/i.test(text)) return "EUR";
  if (/\$|USD|dollar/i.test(text)) return "USD";
  return "INR"; // Default to INR
}

function parseAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = (match[1] || match[0].replace(/[^0-9.,]/g, "")).replace(
        /,/g,
        ""
      );
      const val = parseFloat(cleaned);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  // Fallback: find all dollar amounts and take the largest
  const allAmounts = [...text.matchAll(/\$\s?(\d{1,3}(?:,\d{3})*\.\d{2})/g)];
  if (allAmounts.length > 0) {
    let largest = 0;
    for (const m of allAmounts) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (val > largest) largest = val;
    }
    if (largest > 0) return largest;
  }
  return null;
}

function parseDueDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1];
      // Try MM/DD/YYYY or MM-DD-YYYY
      const slashDate = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (slashDate) {
        const [, m, d, y] = slashDate;
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      // Try Month DD, YYYY
      const monthDate = dateStr.match(
        /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2}),?\s*(\d{4})/i
      );
      if (monthDate) {
        const [, mo, d, y] = monthDate;
        const m = MONTHS[mo.toLowerCase()];
        if (m) return `${y}-${m}-${d.padStart(2, "0")}`;
      }
    }
  }
  return null;
}

function extractMerchantFromEmail(
  from: string,
  subject: string
): string | null {
  // Try to extract merchant from "From" name
  const nameMatch = from.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    if (
      name.length > 2 &&
      !/^(noreply|no-reply|billing|support|info|admin)/i.test(name)
    ) {
      return name;
    }
  }
  // Fallback: extract domain from email
  const domainMatch = from.match(/@([^.>]+)\./);
  if (domainMatch) {
    const domain = domainMatch[1];
    if (domain.length > 2) {
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
  }
  // Last resort: use first meaningful words from subject
  const cleaned = subject
    .replace(/^(re:|fw:|fwd:|your\s+|new\s+|important:?\s*)/gi, "")
    .trim();
  if (cleaned.length > 3) {
    return cleaned.slice(0, 50);
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const syncAccount = action({
  args: { emailAccountId: v.id("emailAccounts") },
  handler: async (ctx, { emailAccountId }) => {
    // Get account with credentials
    const account = await ctx.runMutation(
      internal.emailAccounts.getWithPassword,
      { id: emailAccountId }
    );
    if (!account) throw new Error("Email account not found");

    // Mark as syncing
    await ctx.runMutation(internal.emailAccounts.updateSyncStatus, {
      id: emailAccountId,
      status: "syncing",
    });

    let emailsFound = 0;
    let billsCreated = 0;
    const errors: string[] = [];

    try {
      const client = new ImapFlow({
        host: "imap.gmail.com",
        port: 993,
        secure: true,
        auth: {
          user: account.email,
          pass: account.appPassword,
        },
        logger: false,
      });

      await client.connect();

      const lock = await client.getMailboxLock("INBOX");
      try {
        // Search for bill-related emails from the last 30 days
        const since = new Date();
        since.setDate(since.getDate() - 30);

        let messages: number[];
        try {
          messages = await client.search({
            since,
            or: [
              { subject: "invoice" },
              { subject: "receipt" },
              { subject: "statement" },
              { subject: "billing" },
              { subject: "payment due" },
              { subject: "amount due" },
              { subject: "your bill" },
            ],
          }) as number[];
        } catch {
          // Fallback: search all recent emails
          messages = await client.search({ since }) as number[];
        }

        emailsFound = messages.length;

        // Process up to 50 messages per sync
        const toProcess = messages.slice(-50);

        for (const uid of toProcess) {
          try {
            const fetched = await client.fetchOne(String(uid), {
              envelope: true,
              source: true,
            });

            if (!fetched) continue;
            const message = fetched as unknown as { envelope?: { messageId?: string; from?: Array<{ address?: string }>; subject?: string; date?: string }; source?: Buffer };
            if (!message.envelope || !message.source) continue;

            const messageId =
              message.envelope.messageId || `${account.email}-${uid}`;

            // Check if already processed
            const exists: boolean = await ctx.runMutation(
              internal.emailAccounts.checkEmailExists,
              { emailMessageId: messageId }
            );
            if (exists) continue;

            // Parse email
            const parsed = await simpleParser(message.source);
            const fromAddr =
              parsed.from?.text || message.envelope.from?.[0]?.address || "";
            const subject = parsed.subject || message.envelope.subject || "";
            const textBody = parsed.text || "";
            const htmlBody = parsed.html || "";
            const plainText = textBody || stripHtml(htmlBody);

            // Extract bill data
            const amount = parseAmount(plainText);
            const dueDate = parseDueDate(plainText);
            const merchant = extractMerchantFromEmail(fromAddr, subject);
            const currency = detectCurrency(plainText);

            // Extract PDF/image attachment and upload to Convex storage
            let imageId: string | undefined;
            if (parsed.attachments && parsed.attachments.length > 0) {
              // Find the first PDF or image attachment
              const billAttachment = parsed.attachments.find((att) => {
                const ct = (att.contentType || "").toLowerCase();
                return (
                  ct === "application/pdf" ||
                  ct.startsWith("image/")
                );
              });

              if (billAttachment && billAttachment.content) {
                try {
                  // Get an upload URL from Convex
                  const uploadUrl: string = await ctx.runMutation(
                    internal.emailAccounts.generateUploadUrl
                  );

                  // Upload the attachment
                  const uploadResp = await fetch(uploadUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type":
                        billAttachment.contentType || "application/octet-stream",
                    },
                    body: new Uint8Array(billAttachment.content),
                  });

                  if (uploadResp.ok) {
                    const { storageId } = (await uploadResp.json()) as {
                      storageId: string;
                    };
                    imageId = storageId;
                  }
                } catch (uploadErr) {
                  errors.push(
                    `Attachment upload for UID ${uid}: ${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`
                  );
                }
              }
            }

            // Only create a bill if we found at least an amount or due date
            if (amount !== null || dueDate !== null) {
              const billDate =
                dueDate ||
                new Date(message.envelope.date || Date.now())
                  .toISOString()
                  .split("T")[0];

              await ctx.runMutation(internal.emailAccounts.createBillFromEmail, {
                merchant: merchant || "Unknown Sender",
                amount: amount || 0,
                currency,
                dueDate: billDate,
                notes: `From: ${fromAddr}\nSubject: ${subject}`,
                emailMessageId: messageId,
                emailAccountId,
                imageId,
              });
              billsCreated++;
            }
          } catch (err) {
            errors.push(
              `UID ${uid}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();

      // Mark as active with last sync time
      await ctx.runMutation(internal.emailAccounts.updateSyncStatus, {
        id: emailAccountId,
        status: "active",
        lastSyncAt: Date.now(),
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push(errorMsg);

      await ctx.runMutation(internal.emailAccounts.updateSyncStatus, {
        id: emailAccountId,
        status: "error",
        errorMessage: errorMsg,
      });
    }

    // Log the sync
    await ctx.runMutation(internal.emailAccounts.createSyncLog, {
      emailAccountId,
      syncedAt: Date.now(),
      emailsFound,
      billsCreated,
      errors: errors.length > 0 ? errors.join("\n") : undefined,
    });

    return { emailsFound, billsCreated, errors };
  },
});
