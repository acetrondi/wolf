import { GalleryVerticalEndIcon } from "lucide-react";
import Link from "next/link";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-4" />
            </div>
            Wolf
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-balance text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            {footer}
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-muted to-background" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <blockquote className="max-w-md space-y-2 text-center">
            <p className="text-lg font-medium text-foreground">
              Brand-voice-aware content, planned and approved before it ships.
            </p>
            <footer className="text-sm text-muted-foreground">Wolf content OS</footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
