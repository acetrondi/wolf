import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { clerkAuthAppearance } from "@/components/auth/clerk-appearance";

export default function SignInPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Wolf workspace"
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="underline underline-offset-4">
            Sign up
          </Link>
        </p>
      }
    >
      <SignIn
        appearance={clerkAuthAppearance}
        routing="path"
        path="/auth/sign-in"
        signUpUrl="/auth/sign-up"
        forceRedirectUrl="/app"
      />
    </AuthShell>
  );
}
