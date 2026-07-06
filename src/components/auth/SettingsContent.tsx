'use client';

import {useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {ArrowRightStartOnRectangleIcon} from '@heroicons/react/24/outline';
import {createClient} from '@/lib/supabase/client';

interface SettingsContentProps {
  user: {name: string; email: string};
}

export const SettingsContent = ({user}: SettingsContentProps) => {
  const router = useRouter();
  const t = useTranslations('Settings');

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto w-full">
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <h1 className="text-lg font-bold">
          <span className="text-primary">{t('title')}</span>
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-5 px-5 py-2">
        {/* Profile Card */}
        <div className="flex items-center gap-3.5 p-4 bg-base-200 border border-base-content/10 rounded-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-info to-secondary text-white text-base font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-base-content truncate">
              {user.name}
            </div>
            <div className="text-xs text-base-content/50 truncate">
              {user.email}
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="mt-auto pb-2">
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full p-3.5 bg-error/10 border border-error/25 rounded-xl text-error text-sm font-semibold cursor-pointer transition-colors hover:bg-error/15 hover:border-error"
          >
            <ArrowRightStartOnRectangleIcon className="size-[18px]" />
            {t('signOut')}
          </button>
          <div className="text-center text-[11px] text-base-content/30 pt-2 pb-1">
            {t('version')}
          </div>
        </div>
      </div>
    </div>
  );
};
