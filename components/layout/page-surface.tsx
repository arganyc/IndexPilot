export function PageSurface({ title }: { title: string }) {
  return (
    <section
      aria-label={`${title} content`}
      className="min-h-[calc(100vh-8rem)] rounded-xl border border-dashed border-border bg-card"
    >
      <h2 className="sr-only">{title}</h2>
    </section>
  );
}
