import { describe, expect, it } from 'vitest'
import {
  assertExamBookingCanBeCancelled,
  assertExamCanBeBooked,
  type BookingRuleInput,
} from '../services/exam-booking-rules'

const now = new Date('2026-06-01T10:00:00.000Z')

function baseInput(overrides: Partial<BookingRuleInput> = {}): BookingRuleInput {
  return {
    now,
    exam: {
      id:                   'exam-1',
      courseId:             'course-1',
      date:                 '2026-06-10T09:00:00.000Z',
      registrationDeadline: '2026-06-08T23:00:00.000Z',
      maxStudents:          30,
    },
    activeBookingsCount: 3,
    existingBooking: null,
    studentActiveBookings: [],
    ...overrides,
  }
}

describe('exam booking rules', () => {
  it('allows a valid booking', () => {
    expect(() => assertExamCanBeBooked(baseInput())).not.toThrow()
  })

  it('rejects booking after registration deadline', () => {
    expect(() => assertExamCanBeBooked(baseInput({
      exam: {
        ...baseInput().exam,
        registrationDeadline: '2026-05-31T23:00:00.000Z',
      },
    }))).toThrow('date limite')
  })

  it('rejects booking when capacity is full', () => {
    expect(() => assertExamCanBeBooked(baseInput({
      activeBookingsCount: 30,
    }))).toThrow('place disponible')
  })

  it('rejects duplicate active booking', () => {
    expect(() => assertExamCanBeBooked(baseInput({
      existingBooking: { id: 'booking-1', status: 'booked' },
    }))).toThrow('deja une prenotation')
  })

  it('allows reactivating a cancelled booking when the session is otherwise valid', () => {
    expect(() => assertExamCanBeBooked(baseInput({
      existingBooking: { id: 'booking-1', status: 'cancelled' },
    }))).not.toThrow()
  })

  it('rejects bookings that conflict with another active exam', () => {
    expect(() => assertExamCanBeBooked(baseInput({
      studentActiveBookings: [{
        id:            'booking-2',
        examSessionId: 'exam-2',
        courseId:      'course-2',
        date:          '2026-06-10T10:00:00.000Z',
        status:        'booked',
      }],
    }))).toThrow('Conflit horaire')
  })

  it('allows cancellation before the registration deadline', () => {
    expect(() => assertExamBookingCanBeCancelled('2026-06-08T23:00:00.000Z', now)).not.toThrow()
  })

  it('rejects cancellation after the registration deadline', () => {
    expect(() => assertExamBookingCanBeCancelled('2026-05-31T23:00:00.000Z', now)).toThrow('annuler')
  })
})
