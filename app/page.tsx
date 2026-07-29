import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <header className="absolute top-0 flex w-full items-center justify-end gap-3 p-6">
        {userId ? (
          <>
            <Link
              href="/app"
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              Open app
            </Link>
            <UserButton />
          </>
        ) : (
          <Link
            href="/auth/sign-in"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            Sign in
          </Link>
        )}
      </header>
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Wolf — content OS for brand teams
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Plan ideas, generate per-platform variants, and approve before export. Sign in
            to open your workspace.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="/auth/sign-up"
          >
            Get started
          </Link>
          <Link
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="/auth/sign-in"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
