/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "core-stays-pure",
      severity: "error",
      comment: "packages/core must not import adapters or vendor SDKs.",
      from: { path: "^packages/core" },
      to: {
        path: "^(packages/adapters|node_modules/(@clerk|@supabase|resend|posthog|@trigger\\.dev|googleapis|@aws-sdk))",
      },
    },
    {
      name: "no-vendor-outside-adapters",
      severity: "error",
      comment:
        "Vendor SDKs only belong under packages/adapters (or the Next app shell for Clerk UI).",
      from: {
        path: "^packages",
        pathNot: "^packages/adapters",
      },
      to: {
        path: "node_modules/(@supabase|resend|posthog-node|@trigger\\.dev|googleapis|@aws-sdk)",
      },
    },
    {
      name: "no-supabase-js",
      severity: "error",
      from: {},
      to: { path: "node_modules/@supabase/supabase-js" },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsConfig: {
      fileName: "tsconfig.json",
    },
  },
};
