import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Scrypt } from "lucia";

/**
 * Create a new user. Only callable from the Convex dashboard
 * (Run > users:createUser) or via internal functions.
 *
 * Usage from dashboard:
 *   Function: users:createUser
 *   Args: { email: "user@example.com", password: "securepassword" }
 */
export const createUser = internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    // Check if user with this email already exists
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .unique();
    if (existing) {
      throw new Error(`User with email ${email} already exists`);
    }

    // Hash the password
    const scrypt = new Scrypt();
    const hashedPassword = await scrypt.hash(password);

    // Create the user
    const userId = await ctx.db.insert("users", {
      email,
    });

    // Create the auth account (password credential)
    await ctx.db.insert("authAccounts", {
      provider: "password",
      providerAccountId: email,
      userId,
      secret: hashedPassword,
    });

    return { success: true, email, userId };
  },
});
