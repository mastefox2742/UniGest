import { describe, expect, it } from 'vitest'
import { canDeleteForumPost } from '../services/forum-rules'

describe('forum-rules', () => {
  it('allows staff or the author to delete a post', () => {
    expect(canDeleteForumPost({ requesterId: 'u1', requesterRole: 'student', authorId: 'u1' })).toBe(true)
    expect(canDeleteForumPost({ requesterId: 'u2', requesterRole: 'student', authorId: 'u1' })).toBe(false)
    expect(canDeleteForumPost({ requesterId: 'u2', requesterRole: 'teacher', authorId: 'u1' })).toBe(true)
    expect(canDeleteForumPost({ requesterId: 'u2', requesterRole: 'admin', authorId: 'u1' })).toBe(true)
  })
})
