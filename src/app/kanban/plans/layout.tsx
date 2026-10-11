import {PlanChrome} from '@/components/domain/plan/PlanChrome';
import {getCurrentUserId} from '@/lib/auth/getCurrentUserId';
import {getActivePlan} from '@/lib/db/plans';
import {getThisWeekHref} from '@/utils/planUtils';

export default async function PlansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The This week tab points where the sidebar's Plan item does
  const userId = await getCurrentUserId();
  const activePlan = await getActivePlan(userId);

  return (
    <PlanChrome thisWeekHref={getThisWeekHref(activePlan?.id ?? null)}>
      {children}
    </PlanChrome>
  );
}
