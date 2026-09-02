/** The four views of the bank-QC page. 'all' renders everything (tests, printing). */
export type QcTab = 'overview' | 'review' | 'runs' | 'reference' | 'all'
export const QC_TABS: Exclude<QcTab, 'all'>[] = ['overview', 'review', 'runs', 'reference']
export function tabFromSearch(search: string): Exclude<QcTab, 'all'> {
  const v = new URLSearchParams(search).get('tab')
  return (QC_TABS as string[]).includes(v ?? '') ? (v as Exclude<QcTab, 'all'>) : 'overview'
}
