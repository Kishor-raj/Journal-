import { describe, it, expect } from 'vitest'
import { isUserProfileComplete } from '../src/modules/auth/auth.service.js'

describe('Profile Completion Verification', () => {
  it('returns true when institution, department, state, and country are filled', () => {
    const completeUser = {
      institution: 'Stanford University',
      department: 'Computer Science',
      state: 'California',
      country: 'United States',
    }
    expect(isUserProfileComplete(completeUser)).toBe(true)
  })

  it('returns true when optional fields (college, course) are missing/null/empty', () => {
    const userWithoutOptionalFields = {
      institution: 'MIT',
      college: null,
      department: 'Physics',
      state: 'Massachusetts',
      country: 'USA',
      course: '',
    }
    expect(isUserProfileComplete(userWithoutOptionalFields)).toBe(true)
  })

  it('returns false when institution is missing', () => {
    const user = {
      institution: '',
      department: 'Physics',
      state: 'Massachusetts',
      country: 'USA',
    }
    expect(isUserProfileComplete(user)).toBe(false)
  })

  it('returns false when department is missing', () => {
    const user = {
      institution: 'MIT',
      department: '   ',
      state: 'Massachusetts',
      country: 'USA',
    }
    expect(isUserProfileComplete(user)).toBe(false)
  })

  it('returns false when state is missing', () => {
    const user = {
      institution: 'MIT',
      department: 'Physics',
      state: null,
      country: 'USA',
    }
    expect(isUserProfileComplete(user)).toBe(false)
  })

  it('returns false when country is missing', () => {
    const user = {
      institution: 'MIT',
      department: 'Physics',
      state: 'Massachusetts',
      country: undefined,
    }
    expect(isUserProfileComplete(user)).toBe(false)
  })

  it('returns false when user object is null or undefined', () => {
    expect(isUserProfileComplete(null)).toBe(false)
    expect(isUserProfileComplete(undefined)).toBe(false)
  })
})
