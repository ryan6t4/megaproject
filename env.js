/**
 * Environment Configuration Loader & Validator
 *
 * This file handles loading environment variables from .env files
 * based on the current APP_STAGE (development, test, production),
 * validates them using Zod, and provides runtime-safe access.
 */

import { env as loadEnv } from "custom-env";
import { z } from "zod";

// ---------------------------
// 1. Set default APP_STAGE
// ---------------------------
process.env.APP_STAGE = process.env.APP_STAGE || "dev";

const isProduction = process.env.APP_STAGE === "production";
const isDevelopment = process.env.APP_STAGE === "dev";
const isTesting = process.env.APP_STAGE === "test";

// ---------------------------
// 2. Load .env file based on stage
// ---------------------------
if (isDevelopment) {
  loadEnv(); // loads .env for development
} else if (isTesting) {
  loadEnv("test"); // loads .env.test for testing
}
// In production, assume environment variables are already set

// ---------------------------
// 3. Define Zod schema for environment validation
// ---------------------------
const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    APP_STAGE: z.enum(["dev", "test", "production"]).default("dev"),

    PORT: z.coerce.number().positive().default(3000),

    DATABASE_URL: z.string(),

    // ❌ Wrong attempt in original:
    // console.log('DATABASE_URL'),
    // ⬆️ Not allowed inside schema. Zod schemas must only contain Zod validators.
    // ✅ Correct way: log AFTER validation (see below in step 6).

    JWT_SECRET: z
      .string()
      .min(12, "must be at least 12 characters long")
      .optional(),

    JWT_EXPIRES_IN: z.string().default("7d").optional(),

    BCRYPT_ROUNDS: z.coerce.number().min(10).max(20).default(12),
  })
  .superRefine((data, ctx) => {
    // ⚠️ Wrong usage in your code:
    // you used "env.DATABASE_URL" here, but "env" is not defined yet
    // ✅ Correct is "data.DATABASE_URL" because "data" = parsed object

    if (
      !(
        data.DATABASE_URL.startsWith("mongodb://") ||
        data.DATABASE_URL.startsWith("postgresql://")
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_URL must be a valid MongoDB or PostgreSQL URL",
        path: ["DATABASE_URL"], // ✅ path points to the field where the error occurred
        // 🔍 Why square brackets? Because Zod expects an array of keys:
        // - ["DATABASE_URL"] → root-level field
        // - ["db", "url"] → nested object like env.db.url
        // JS uses [] because `path` can be deep (multi-level objects).
      });
    }

    // Example: extra condition → If using PostgreSQL, enforce JWT presence
    if (data.DATABASE_URL.startsWith("postgresql://")) {
      if (!data.JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "JWT_SECRET must be defined when using PostgreSQL",
          path: ["JWT_SECRET"],
        });
      }
      if (!data.JWT_EXPIRES_IN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "JWT_EXPIRES_IN must be defined when using PostgreSQL",
          path: ["JWT_EXPIRES_IN"],
        });
      }
    }
  });

// ---------------------------
// 4. TypeScript-only parts (commented out)
// ---------------------------

// export type Env = z.infer<typeof envSchema>;
// ❌ JS cannot use "type" or "infer". Only valid in TypeScript.

// let env: Env
// ❌ Type annotations are invalid in JS.
// ✅ Just use: let env

let env; // ✅ Plain JS variable to hold validated config

// ---------------------------
// 5. Parse & validate environment variables
// ---------------------------
try {
  env = envSchema.parse(process.env); // Validate at runtime

  // ---------------------------
  // 6. Safe logging after validation
  // ---------------------------
  console.log("✅ All environment variables validated successfully!");

  // ✅ Correct place to log DATABASE_URL (after schema.parse)
  console.log("DATABASE_URL:", env.DATABASE_URL);

  // Other useful logs
  console.log("PORT:", env.PORT);
  console.log("APP_STAGE:", env.APP_STAGE);
  console.log("NODE_ENV:", env.NODE_ENV);
} catch (e) {
  // ---------------------------
  // 7. Handle validation errors
  // ---------------------------
  if (e instanceof z.ZodError) {
    console.log("❌ Invalid environment variables!");

    // ✅ Flattened errors are more readable
    console.error(JSON.stringify(e.flatten().fieldErrors, null, 2));

    // Loop through each issue and print nicely
    e.errors.forEach((err) => {
      const path = err.path.join(".");
      // 🔍 Why join(".")? Example:
      //   ["DATABASE_URL"] → "DATABASE_URL"
      //   ["db","url"] → "db.url"
      console.log(`${path}: ${err.message}`);
    });

    process.exit(1); // Stop app if env invalid
  } else {
    throw e; // unexpected error
  }
}

// ---------------------------
// 8. Export helpers
// ---------------------------
export const isProd = () => env.APP_STAGE === "production";
export const isTest = () => env.APP_STAGE === "test";
export const isDev = () => env.APP_STAGE === "dev";
export { env }; // export whole env for use in app

/*
  ✅ What you did right:
  - Used zod for schema validation
  - Split by APP_STAGE and loaded env files properly
  - Handled optional JWT_SECRET & JWT_EXPIRES_IN

  ❌ What was wrong:
  - console.log inside schema (illegal)
  - Used "env" inside superRefine before defining it
  - Forgot to prefix postgresql:// (typo)

  🔄 Alternative way (commented, for learning):
  // Instead of superRefine, you can use Zod's regex check:
  // DATABASE_URL: z.string().regex(/^(mongodb|postgresql):\/\//, {
  //   message: "Must start with mongodb:// or postgresql://",
  // }),
  // ⬆️ Simpler if you only care about prefix, not JWT conditions.
*/
