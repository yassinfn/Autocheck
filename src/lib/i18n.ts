import fr from '../../messages/fr.json'
import en from '../../messages/en.json'
import es from '../../messages/es.json'
import it from '../../messages/it.json'
import pt from '../../messages/pt.json'
import de from '../../messages/de.json'

const messages = { fr, en, es, it, pt, de } as const
type Locale = keyof typeof messages

export function getLocaleFromCountry(country: string): string {
  const map: Record<string, string> = {
    'France': 'fr', 'Belgique': 'fr', 'Suisse': 'fr',
    'Canada': 'en', 'USA': 'en', 'United States': 'en', 'UK': 'en', 'United Kingdom': 'en',
    'Espagne': 'es', 'Spain': 'es',
    'Italie': 'it', 'Italy': 'it',
    'Portugal': 'pt',
    'Allemagne': 'de', 'Germany': 'de',
  }
  return map[country] ?? 'fr'
}

export function createT(locale: string) {
  const msgs = messages[(locale as Locale)] ?? messages.fr
  return function t(key: string): string {
    const parts = key.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = msgs
    for (const part of parts) val = val?.[part]
    return typeof val === 'string' ? val : key
  }
}
