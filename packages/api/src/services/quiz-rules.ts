export function stripCorrectAnswers<T extends {
  quiz_questions?: Array<{
    quiz_options?: Array<Record<string, unknown>>
  }>
}>(quiz: T): T {
  return {
    ...quiz,
    quiz_questions: (quiz.quiz_questions ?? []).map(question => ({
      ...question,
      quiz_options: (question.quiz_options ?? []).map(option => {
        const { is_correct: _isCorrect, ...safeOption } = option
        return safeOption
      }),
    })),
  }
}
