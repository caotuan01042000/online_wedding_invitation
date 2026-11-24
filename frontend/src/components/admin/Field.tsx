export default function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="fd">
      {label}
      {children}
      {error && <span className="fe">{error}</span>}
    </label>
  );
}