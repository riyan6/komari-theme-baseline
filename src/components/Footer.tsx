import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNoiseProbe } from '@/hooks/useNoiseProbe'
import { usePublicInfo } from '@/contexts/PublicInfoContext'
import { utc } from '@/lib/noise-format'

const Footer: React.FC = () => {
  const { t } = useTranslation()
  const { stale, updatedAt, nodes } = useNoiseProbe()
  const { publicInfo } = usePublicInfo()
  const customFooterHtml = publicInfo?.theme_settings?.customFooterHtml

  const allOnline = nodes.length > 0 && nodes.every((n) => n.online)

  return (
    <footer className="w-full border-t border-[#E5E5E5] bg-white py-6 dark:border-[#262626] dark:bg-[#0A0A0A] font-sans type-meta text-[#6B6B6B] dark:text-[#8C8C8C]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 sm:px-8 xl:px-12">
        {customFooterHtml ? (
          <div
            dangerouslySetInnerHTML={{ __html: customFooterHtml }}
            className="custom-footer-content"
          />
        ) : (
          <div className="flex items-center gap-2">
            <span>Powered by Komari Monitor.</span>
            <span>·</span>
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span
                className={
                  stale || !allOnline
                    ? 'status-square-offline'
                    : 'status-square-online'
                }
              />
              <span>{stale ? t('status.connection_lost') : t('status.all_operational')}</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-4 uppercase tracking-wider">
          <span>
            {t('status.synced_at')} <time className="text-black dark:text-[#F2F2F2] tabular-nums font-semibold">{utc(updatedAt)}</time> UTC
          </span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
