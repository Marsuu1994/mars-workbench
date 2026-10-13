import {PlanChrome} from '@/components/domain/plan/PlanChrome';

export default function PlansLayout({children}: {children: React.ReactNode}) {
  return <PlanChrome>{children}</PlanChrome>;
}
