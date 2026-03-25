import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("billerMappings").collect();
  },
});

export const findByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const normalized = name.toLowerCase().trim();
    if (!normalized) return null;

    // Exact match on normalizedName
    const exact = await ctx.db
      .query("billerMappings")
      .withIndex("by_normalizedName", (q) => q.eq("normalizedName", normalized))
      .unique();
    if (exact) return exact;

    // Fallback: substring match against matchPatterns
    const all = await ctx.db.query("billerMappings").collect();
    for (const biller of all) {
      for (const pattern of biller.matchPatterns) {
        const p = pattern.toLowerCase();
        if (normalized.includes(p) || p.includes(normalized)) {
          return biller;
        }
      }
    }

    return null;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    categoryId: v.id("categories"),
    icon: v.string(),
    matchPatterns: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("billerMappings", {
      ...args,
      normalizedName: args.name.toLowerCase().trim(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("billerMappings"),
    name: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    icon: v.optional(v.string()),
    matchPatterns: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, name, ...rest }) => {
    const patch: Record<string, unknown> = { ...rest };
    if (name !== undefined) {
      patch.name = name;
      patch.normalizedName = name.toLowerCase().trim();
    }
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("billerMappings") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
