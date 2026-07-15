import { supabase } from '@/lib/supabase'

export type ThemeChoice = 'light' | 'dark' | 'system'

function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === 'light' || v === 'dark' || v === 'system'
}

/**
 * Persist the appearance/theme choice to the user's account so it survives
 * app relaunches and syncs across devices (the on-device store is only a
 * fast pre-paint cache). Writes the shared `user_preferences.theme` column
 * — the same field the desktop settings page reads. Best-effort.
 */
export async function saveThemeToAccount(userId: string, theme: ThemeChoice): Promise<void> {
  if (!userId) return
  try {
    await supabase
      .from('user_preferences')
      .upsert({ user_id: userId, theme }, { onConflict: 'user_id' })
  } catch (e) {
    console.error('[theme-account] save failed', e)
  }
}

/** Read the account's saved theme (null if none/unreadable). */
export async function fetchThemeFromAccount(userId: string): Promise<ThemeChoice | null> {
  if (!userId) return null
  try {
    const { data } = await supabase
      .from('user_preferences')
      .select('theme')
      .eq('user_id', userId)
      .maybeSingle()
    return isThemeChoice(data?.theme) ? data.theme : null
  } catch {
    return null
  }
}
