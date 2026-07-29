export const clerkAuthAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "shadow-none border-0 bg-transparent p-0 gap-4",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border-border bg-background hover:bg-muted text-foreground",
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary/90 normal-case text-sm",
    footerAction: "hidden",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",
    formFieldInput:
      "rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring",
    formFieldLabel: "text-foreground",
    identityPreview: "border-border",
    formResendCodeLink: "text-primary",
    footer: "hidden",
  },
} as const;
