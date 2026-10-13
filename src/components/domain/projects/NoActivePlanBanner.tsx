import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {InformationCircleIcon} from '@heroicons/react/24/outline';
import {Banner} from '@/components/ui/Banner';
import {CREATE_PLAN_HREF} from './constants';

/** No plan this week yet: + This week has nothing to schedule into, and the
    page says why, with the way to fix it. */
export const NoActivePlanBanner = () => {
  const t = useTranslations('Projects.Detail');

  return (
    <Banner
      tone="warning"
      outlined
      icon={<InformationCircleIcon className="size-4 shrink-0" />}
      action={
        <Link
          href={CREATE_PLAN_HREF}
          className="shrink-0 font-semibold underline"
        >
          {t('createPlan')}
        </Link>
      }
    >
      <span className="text-[12.5px]">{t('noPlan')}</span>
    </Banner>
  );
};
