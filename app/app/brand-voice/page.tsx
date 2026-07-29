import Link from "next/link";
export default function BrandVoicePage() {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-muted-foreground">Voice library</p>
      <h1 className="text-3xl font-semibold tracking-tight">Brand voice</h1>
      <p className="max-w-xl text-muted-foreground">
        Each brand has its own versioned voice. Choose a brand to review or refine its
        voice guide.
      </p>
      <Link
        href="/app/brands"
        className="inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
      >
        View brands
      </Link>
    </div>
  );
}
