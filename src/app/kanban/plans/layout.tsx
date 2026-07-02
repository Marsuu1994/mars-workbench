import { getTranslations } from "next-intl/server";

export default async function PlansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("Board.Header");

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-content/10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">
            <span className="text-success">{t("titlePrefix")}</span>
            {t("titleSuffix")}
          </h1>
          <span className="bg-error/15 text-error text-xs font-medium px-3 py-1 rounded-full font-semibold">
            {t("planningMode")}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-xl">{children}</div>
      </div>
    </div>
  );
}
