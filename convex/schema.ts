import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
    status: v.union(
      v.literal("paid"),
      v.literal("pending"),
      v.literal("overdue")
    ),
    notes: v.optional(v.string()),
  }).index("by_status", ["status"])
    .index("by_category", ["categoryId"])
    .index("by_dueDate", ["dueDate"]),
});
