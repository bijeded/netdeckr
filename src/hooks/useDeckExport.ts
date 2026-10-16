import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buildArenaDeck, buildMtgoDeck, exportTarget, type MtgoExportCard } from '../lib/deckExport'
import type { FormatCode } from '../lib/formats'

export interface ExportNotice {
  tone: 'ok' | 'error'
  message: string
}

/**
 * Clipboard export of a deck for its format's client (MTG Arena for Standard/
 * Pioneer, MTGO otherwise), with the localized confirmation or error to show.
 * `name` labels the deck in Arena's `About` block.
 */
export function useDeckExport(main: MtgoExportCard[], side: MtgoExportCard[], format: FormatCode, name: string) {
  const { t } = useTranslation()
  const [notice, setNotice] = useState<ExportNotice | null>(null)
  const target = exportTarget(format)

  async function exportDeck() {
    const text = target === 'arena' ? buildArenaDeck(main, side, name) : buildMtgoDeck(main, side)
    try {
      await navigator.clipboard.writeText(text)
      setNotice({ tone: 'ok', message: t('modal.export.copied') })
    } catch {
      setNotice({ tone: 'error', message: t('modal.export.error') })
    }
  }

  return { target, exportDeck, notice }
}
