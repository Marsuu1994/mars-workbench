export default function PlansLoading() {
  return (
    <div className="animate-pulse flex flex-col gap-6">
      {/* Title + description skeleton */}
      <div className="flex flex-col gap-3">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-72" />
      </div>

      {/* Description input skeleton */}
      <div className="flex flex-col gap-2">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-10 w-full rounded-lg" />
      </div>

      {/* Template list skeleton */}
      <div className="flex flex-col gap-2">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-16 w-full rounded-lg" />
        <div className="skeleton h-16 w-full rounded-lg" />
        <div className="skeleton h-16 w-full rounded-lg" />
        <div className="skeleton h-16 w-full rounded-lg" />
      </div>

      {/* Submit button skeleton */}
      <div className="skeleton h-10 w-32 rounded-lg" />
    </div>
  );
}
