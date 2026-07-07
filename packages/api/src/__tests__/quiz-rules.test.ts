import { describe, expect, it } from 'vitest'
import { stripCorrectAnswers } from '../services/quiz-rules'

describe('quiz student payload', () => {
  it('removes correctness flags from options', () => {
    const quiz = stripCorrectAnswers({
      id: 'quiz-1',
      quiz_questions: [
        {
          id: 'question-1',
          quiz_options: [
            { id: 'option-1', text: 'A', is_correct: true },
            { id: 'option-2', text: 'B', is_correct: false },
          ],
        },
      ],
    })

    expect(quiz.quiz_questions[0]?.quiz_options[0]).toEqual({ id: 'option-1', text: 'A' })
    expect(quiz.quiz_questions[0]?.quiz_options[1]).toEqual({ id: 'option-2', text: 'B' })
  })
})
