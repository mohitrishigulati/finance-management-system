export default function Loading() {
  return (
    <main className="p-4 flex flex-col gap-6">
      <div className="h-4 w-32 bg-slate-100 rounded" />
      <div className="h-10 w-40 bg-slate-100 rounded mx-auto" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-12 bg-slate-100 rounded" />
        <div className="h-12 bg-slate-100 rounded" />
        <div className="h-12 bg-slate-100 rounded" />
      </div>
      <div className="h-16 bg-slate-100 rounded" />
    </main>
  );
}
