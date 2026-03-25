import { mutation } from "./_generated/server";

export const seed = mutation({
  handler: async (ctx) => {
    // Seed appConfig if not already present
    const existingConfig = await ctx.db.query("appConfig").collect();
    if (existingConfig.length === 0) {
      await ctx.db.insert("appConfig", {
        key: "billIcons",
        value: [
          "cloud", "home_work", "shopping_cart", "bolt", "terminal",
          "wifi", "phone_android", "local_gas_station", "water_drop",
          "restaurant", "directions_car", "medical_services", "school",
          "fitness_center", "subscriptions", "credit_card",
        ],
      });

      await ctx.db.insert("appConfig", {
        key: "categoryIcons",
        value: [
          "person", "corporate_fare", "domain", "home", "work",
          "apartment", "store", "savings", "account_balance",
        ],
      });

      await ctx.db.insert("appConfig", {
        key: "categoryColors",
        value: [
          { value: "primary", label: "Blue" },
          { value: "secondary", label: "Teal" },
          { value: "tertiary", label: "Purple" },
        ],
      });
    }

    // Seed sample categories and bills if not already present
    const existingCategories = await ctx.db.query("categories").collect();
    if (existingCategories.length > 0) return "Already seeded";

    const personal = await ctx.db.insert("categories", {
      name: "Personal",
      color: "primary",
      icon: "person",
    });

    const company1 = await ctx.db.insert("categories", {
      name: "Company 1",
      color: "secondary",
      icon: "corporate_fare",
    });

    const company2 = await ctx.db.insert("categories", {
      name: "Company 2",
      color: "tertiary",
      icon: "domain",
    });

    await ctx.db.insert("bills", {
      merchant: "AWS Cloud Infrastructure",
      icon: "cloud",
      categoryId: company1,
      dueDate: "2024-10-24",
      amount: 1240.0,
      status: "paid",
    });

    await ctx.db.insert("bills", {
      merchant: "Metropolitan Office Rent",
      icon: "home_work",
      categoryId: company2,
      dueDate: "2024-10-28",
      amount: 2360.0,
      status: "pending",
    });

    await ctx.db.insert("bills", {
      merchant: "Whole Foods Market",
      icon: "shopping_cart",
      categoryId: personal,
      dueDate: "2024-10-15",
      amount: 215.4,
      status: "overdue",
    });

    await ctx.db.insert("bills", {
      merchant: "Consolidated Edison",
      icon: "bolt",
      categoryId: personal,
      dueDate: "2024-10-26",
      amount: 182.0,
      status: "pending",
    });

    await ctx.db.insert("bills", {
      merchant: "GitHub Enterprise",
      icon: "terminal",
      categoryId: company1,
      dueDate: "2024-10-25",
      amount: 450.0,
      status: "paid",
    });

    return "Seeded successfully";
  },
});
