export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <a href="/" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark">
        ← All subjects
      </a>
      <h1 className="text-2xl font-extrabold text-text sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
    </div>
  );
}
