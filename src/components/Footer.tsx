import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNoiseProbe } from '@/hooks/useNoiseProbe'
import { usePublicInfo } from '@/contexts/PublicInfoContext'
import { utc } from '@/lib/noise-format'

const Footer: React.FC = () => {
  const { t } = useTranslation()
  const { updatedAt } = useNoiseProbe()
  const { publicInfo } = usePublicInfo()
  const customFooterHtml = publicInfo?.theme_settings?.customFooterHtml

  return (
    <footer className="w-full border-t border-[#E5E5E5] bg-white py-6 font-sans text-[11px] font-medium uppercase tracking-[0.06em] text-[#6B6B6B] dark:border-[#262626] dark:bg-[#0A0A0A] dark:text-[#8C8C8C]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 sm:px-8 xl:px-12">
        {customFooterHtml ? (
          <div
            dangerouslySetInnerHTML={{ __html: customFooterHtml }}
            className="custom-footer-content"
          />
        ) : (
          <span>Powered by Komari Monitor</span>
        )}

        <div className="flex items-center gap-4">
          <span>
            {t('status.synced_at')}{' '}
            <time className="font-semibold tabular-nums text-black dark:text-[#F2F2F2]">
              {utc(updatedAt)}
            </time>{' '}
            UTC
          </span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
