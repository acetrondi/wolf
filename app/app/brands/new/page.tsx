import { NewBrandForm } from "@/components/brands/new-brand-form";

export default function NewBrandPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New brand</h1>
        <p className="text-muted-foreground">Name the brand, then set up voice.</p>
      </div>
      <NewBrandForm />
    </div>
  );
}
