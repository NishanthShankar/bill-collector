import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const bills = await ctx.db.query("bills").collect();
    const categories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(categories.map((c) => [c._id, c]));
    return bills.map((bill) => ({
      ...bill,
      category: categoryMap.get(bill.categoryId) ?? null,
    }));
  },
});

export const dashboardStats = query({
  handler: async (ctx) => {
    const bills = await ctx.db.query("bills").collect();
    const categories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(categories.map((c) => [c._id, c]));

    const totalDue = bills
      .filter((b) => b.status !== "paid")
      .reduce((sum, b) => sum + b.amount, 0);

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split("T")[0];
    const nextWeekStr = nextWeek.toISOString().split("T")[0];

    const upcomingBills = bills.filter(
      (b) =>
        b.status === "pending" &&
        b.dueDate >= todayStr &&
        b.dueDate <= nextWeekStr
    );
    const upcomingTotal = upcomingBills.reduce((sum, b) => sum + b.amount, 0);

    const overdueBills = bills.filter((b) => b.status === "overdue");
    const overdueTotal = overdueBills.reduce((sum, b) => sum + b.amount, 0);

    const categoryBreakdown = categories.map((cat) => {
      const catBills = bills.filter((b) => b.categoryId === cat._id);
      const total = catBills.reduce((sum, b) => sum + b.amount, 0);
      return { ...cat, total, billCount: catBills.length };
    });

    const grandTotal = bills.reduce((sum, b) => sum + b.amount, 0);

    const recentBills = bills
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5)
      .map((bill) => ({
        ...bill,
        category: categoryMap.get(bill.categoryId) ?? null,
      }));

    return {
      totalDue,
      upcomingTotal,
      upcomingCount: upcomingBills.length,
      overdueTotal,
      overdueCount: overdueBills.length,
      categoryBreakdown,
      grandTotal,
      recentBills,
    };
  },
});

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bills", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("bills"),
    merchant: v.optional(v.string()),
    icon: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    dueDate: v.optional(v.string()),
    amount: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("paid"),
        v.literal("pending"),
        v.literal("overdue")
      )
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("bills") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
