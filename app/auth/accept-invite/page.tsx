import { auth } from "@clerk/nextjs/server";
import { withSystem } from "@wolf/db";
import { redirect } from "next/navigation";

import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { AuthShell } from "@/components/auth/auth-shell";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/auth/sign-in");
  }

  const { token } = await searchParams;
  if (!token) {
    redirect("/app");
  }

  const invite = await withSystem("accept invite page", async (tx) => {
    const rows = await tx<{ email: string; orgName: string }[]>`
      select i.email::text, o.name as "orgName"
      from org_invite i
      join org o on o.id = i.org_id
      where i.token = ${token}
        and i.accepted_at is null
        and i.expires_at > now()
      limit 1
    `;
    return rows[0] ?? null;
  });

  if (!invite) {
    return (
      <AuthShell
        title="Invite unavailable"
        subtitle="This invite is invalid or has expired."
      >
        <p className="text-center text-sm text-muted-foreground">
          Ask your workspace admin to send a new invite.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Join workspace"
      subtitle={`Accept your invite to ${invite.orgName}`}
    >
      <AcceptInviteForm token={token} email={invite.email} />
    </AuthShell>
  );
}
