export function canDeleteForumPost(input: {
  requesterId: string
  requesterRole: string
  authorId: string
}) {
  return ['teacher', 'admin'].includes(input.requesterRole) || input.requesterId === input.authorId
}
