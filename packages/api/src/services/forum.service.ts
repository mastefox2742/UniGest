import { createClient } from '@supabase/supabase-js'
import { canDeleteForumPost } from './forum-rules'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Trouve ou crée le forum associé à un cours e-learning.
 * Chaque elearning_course a exactement un forum.
 */
async function getOrCreateForum(ecId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('forums')
    .select('id')
    .eq('elearning_course_id', ecId)
    .maybeSingle()

  if (existing) return existing.id

  // Récupérer le nom du cours pour le titre du forum
  const { data: ec } = await supabase
    .from('elearning_courses')
    .select('courses!course_id(name)')
    .eq('id', ecId)
    .single()

  const courseRaw  = ec?.courses as Array<{ name: string }> | { name: string } | null
  const courseName = (Array.isArray(courseRaw) ? courseRaw[0] : courseRaw)?.name ?? 'Cours'

  const { data: forum, error } = await supabase
    .from('forums')
    .insert({
      elearning_course_id: ecId,
      title:               `Forum — ${courseName}`,
    })
    .select('id')
    .single()

  if (error || !forum) throw new Error('Impossible de créer le forum')
  return forum.id
}

// ─── Forum ────────────────────────────────────────────────────────────────────

/**
 * Récupérer tous les posts d'un cours e-learning (threads + réponses).
 */
export async function getForumPosts(ecId: string) {
  const forumId = await getOrCreateForum(ecId)

  const { data, error } = await supabase
    .from('forum_posts')
    .select(`
      id, content, is_pinned, created_at, updated_at, parent_id,
      profiles!author_id(first_name, last_name, avatar_url)
    `)
    .eq('forum_id', forumId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Créer un post (ou une réponse si parentId fourni).
 * userId = profiles.id (= auth.users.id)
 */
export async function createForumPost(input: {
  ecId:      string
  userId:    string
  content:   string
  parentId?: string
}) {
  const forumId = await getOrCreateForum(input.ecId)

  const insert: Record<string, unknown> = {
    forum_id:  forumId,
    author_id: input.userId,
    content:   input.content,
  }
  if (input.parentId) insert.parent_id = input.parentId

  const { data, error } = await supabase
    .from('forum_posts')
    .insert(insert)
    .select(`
      id, content, is_pinned, created_at, parent_id,
      profiles!author_id(first_name, last_name, avatar_url)
    `)
    .single()

  if (error || !data) throw new Error('Impossible de créer le post')
  return data
}

/**
 * Épingler / désépingler un post (teachers + admins).
 */
export async function pinForumPost(postId: string, isPinned: boolean) {
  await supabase
    .from('forum_posts')
    .update({ is_pinned: isPinned })
    .eq('id', postId)
}

/**
 * Supprimer un post (auteur ou teacher).
 */
export async function deleteForumPost(postId: string, requester: { id: string; role: string }) {
  const { data: post, error: readError } = await supabase
    .from('forum_posts')
    .select('author_id')
    .eq('id', postId)
    .single()

  if (readError || !post) throw new Error('Post introuvable')
  if (!canDeleteForumPost({
    requesterId: requester.id,
    requesterRole: requester.role,
    authorId: post.author_id,
  })) {
    throw new Error('Suppression non autorisee')
  }

  await supabase.from('forum_posts').delete().eq('id', postId)
}
