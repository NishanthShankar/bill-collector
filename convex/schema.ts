import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  appConfig: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  categories: defineTable({
    name: v.string(),
    color: v.string(),
    icon: v.string(),
  }),

  bills: defineTable({
    merchant: v.string(),
    icon: v.string(),
    categoryId: v.id("categories"),
    dueDate: v.string(),
    amount: v.number(),
    currency: v.optional(v.string()),
    status: v.union(
      v.literal("paid"),
      v.literal("pending"),
      v.literal("overdue")
    ),
    notes: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    emailMessageId: v.optional(v.string()),
    emailAccountId: v.optional(v.id("emailAccounts")),
  }).index("by_status", ["status"])
    .index("by_category", ["categoryId"])
    .index("by_dueDate", ["dueDate"])
    .index("by_emailMessageId", ["emailMessageId"]),

  billerMappings: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    categoryId: v.id("categories"),
    icon: v.string(),
    matchPatterns: v.array(v.string()),
  }).index("by_normalizedName", ["normalizedName"]),

  emailAccounts: defineTable({
    email: v.string(),
    appPassword: v.string(),
    label: v.optional(v.string()),
    lastSyncAt: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("error"),
      v.literal("syncing")
    ),
    errorMessage: v.optional(v.string()),
    defaultCategoryId: v.optional(v.id("categories")),
  }).index("by_email", ["email"]),

  emailSyncLog: defineTable({
    emailAccountId: v.id("emailAccounts"),
    syncedAt: v.number(),
    emailsFound: v.number(),
    billsCreated: v.number(),
    errors: v.optional(v.string()),
  }).index("by_emailAccountId", ["emailAccountId"]),
});
