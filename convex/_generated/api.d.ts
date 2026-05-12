/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as agent from "../agent.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as email from "../email.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as items from "../items.js";
import type * as lib_auth from "../lib/auth.js";
import type * as organizations from "../organizations.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  agent: typeof agent;
  auth: typeof auth;
  chat: typeof chat;
  email: typeof email;
  emailTemplates: typeof emailTemplates;
  http: typeof http;
  invitations: typeof invitations;
  items: typeof items;
  "lib/auth": typeof lib_auth;
  organizations: typeof organizations;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
