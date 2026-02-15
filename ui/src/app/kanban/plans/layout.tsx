export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-xl">
        {children}
      </div>
    </div>
  );
}
