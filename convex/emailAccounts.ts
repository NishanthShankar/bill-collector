import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("emailAccounts").collect();
    // Never expose app passwords to the client
    return accounts.map(({ appPassword: _, ...rest }) => rest);
  },
});

export const get = query({
  args: { id: v.id("emailAccounts") },
  handler: async (ctx, { id }) => {
    const account = await ctx.db.get(id);
    if (!account) return null;
    const { appPassword: _, ...rest } = account;
    return rest;
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    appPassword: v.string(),
    label: v.optional(v.string()),
    defaultCategoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    // Check for duplicate email
    const existing = await ctx.db
      .query("emailAccounts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) {
      throw new Error(`Email account ${args.email} already exists`);
    }
    return await ctx.db.insert("emailAccounts", {
      ...args,
      status: "active",
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("emailAccounts"),
    email: v.optional(v.string()),
    appPassword: v.optional(v.string()),
    label: v.optional(v.string()),
    defaultCategoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, { id, ...rest }) => {
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) patch[key] = value;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id, patch);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("emailAccounts") },
  handler: async (ctx, { id }) => {
    // Delete sync logs for this account
    const logs = await ctx.db
      .query("emailSyncLog")
      .withIndex("by_emailAccountId", (q) => q.eq("emailAccountId", id))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    await ctx.db.delete(id);
  },
});

export const getSyncLogs = query({
  args: { emailAccountId: v.id("emailAccounts") },
  handler: async (ctx, { emailAccountId }) => {
    return await ctx.db
      .query("emailSyncLog")
      .withIndex("by_emailAccountId", (q) =>
        q.eq("emailAccountId", emailAccountId)
      )
      .order("desc")
      .take(10);
  },
});

// Internal mutations called by the gmail action
export const updateSyncStatus = internalMutation({
  args: {
    id: v.id("emailAccounts"),
    status: v.union(
      v.literal("active"),
      v.literal("error"),
      v.literal("syncing")
    ),
    errorMessage: v.optional(v.string()),
    lastSyncAt: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const cleanPatch: Record<string, unknown> = { status: patch.status };
    if (patch.errorMessage !== undefined)
      cleanPatch.errorMessage = patch.errorMessage;
    if (patch.lastSyncAt !== undefined)
      cleanPatch.lastSyncAt = patch.lastSyncAt;
    await ctx.db.patch(id, cleanPatch);
  },
});

export const createSyncLog = internalMutation({
  args: {
    emailAccountId: v.id("emailAccounts"),
    syncedAt: v.number(),
    emailsFound: v.number(),
    billsCreated: v.number(),
    errors: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("emailSyncLog", args);
  },
});

// Internal: get account with password for the action
export const getWithPassword = internalMutation({
  args: { id: v.id("emailAccounts") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Generate an upload URL for storing attachments
export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Check if a bill with this emailMessageId already exists
export const checkEmailExists = internalMutation({
  args: { emailMessageId: v.string() },
  handler: async (ctx, { emailMessageId }) => {
    const existing = await ctx.db
      .query("bills")
      .withIndex("by_emailMessageId", (q) =>
        q.eq("emailMessageId", emailMessageId)
      )
      .unique();
    return existing !== null;
  },
});

// Create a bill from an email
export const createBillFromEmail = internalMutation({
  args: {
    merchant: v.string(),
    amount: v.number(),
    currency: v.optional(v.string()),
    dueDate: v.string(),
    notes: v.optional(v.string()),
    emailMessageId: v.string(),
    emailAccountId: v.id("emailAccounts"),
    imageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Try to find a matching biller mapping for auto-categorization
    const normalized = args.merchant.toLowerCase().trim();
    let categoryId: string | null = null;
    let icon = "mail";

    // Check biller mappings — exact match
    const exact = await ctx.db
      .query("billerMappings")
      .withIndex("by_normalizedName", (q) =>
        q.eq("normalizedName", normalized)
      )
      .unique();

    if (exact) {
      categoryId = exact.categoryId;
      icon = exact.icon;
    } else {
      // Substring match
      const allMappings = await ctx.db.query("billerMappings").collect();
      for (const mapping of allMappings) {
        for (const pattern of mapping.matchPatterns) {
          const p = pattern.toLowerCase();
          if (normalized.includes(p) || p.includes(normalized)) {
            categoryId = mapping.categoryId;
            icon = mapping.icon;
            break;
          }
        }
        if (categoryId) break;
      }
    }

    // Fallback: use the email account's default org
    if (!categoryId) {
      const emailAccount = await ctx.db.get(args.emailAccountId);
      if (emailAccount?.defaultCategoryId) {
        categoryId = emailAccount.defaultCategoryId;
      }
    }

    // Final fallback: use the first category
    if (!categoryId) {
      const firstCategory = await ctx.db.query("categories").first();
      if (!firstCategory) {
        throw new Error("No organizations exist. Create one first.");
      }
      categoryId = firstCategory._id;
    }

    return await ctx.db.insert("bills", {
      merchant: args.merchant,
      icon,
      categoryId: categoryId as any,
      dueDate: args.dueDate,
      amount: args.amount,
      currency: args.currency,
      status: (args.dueDate >= new Date().toISOString().split("T")[0] ? "pending" : "paid") as "pending" | "paid",
      notes: args.notes,
      imageId: args.imageId as any,
      emailMessageId: args.emailMessageId,
      emailAccountId: args.emailAccountId,
    });
  },
});
