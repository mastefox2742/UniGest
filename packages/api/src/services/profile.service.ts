import { createClient } from '@supabase/supabase-js'
import type { UserRole } from '@unigest/shared'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface Profile {
  id: string
  role: UserRole
  firstName: string
  lastName: string
  avatarUrl: string | null
  isActive: boolean
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name, avatar_url, is_active')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    id:        data.id as string,
    role:      data.role as UserRole,
    firstName: data.first_name as string,
    lastName:  data.last_name as string,
    avatarUrl: data.avatar_url as string | null,
    isActive:  data.is_active as boolean,
  }
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'firstName' | 'lastName' | 'avatarUrl'>>,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...(updates.firstName !== undefined && { first_name: updates.firstName }),
      ...(updates.lastName  !== undefined && { last_name:  updates.lastName }),
      ...(updates.avatarUrl !== undefined && { avatar_url: updates.avatarUrl }),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error || !data) return null
  return getProfile(userId)
}
