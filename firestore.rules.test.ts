/**
 * Security Rules Verification Suite (Dirty Dozen Adversarial Cases)
 * Documents and verifies expected Firestore security rule enforcement for /quizzes and /users.
 */
export const dirtyDozenCases = [
  { name: 'Unauthenticated quiz creation', path: '/quizzes/q_1', expected: 'PERMISSION_DENIED' },
  { name: 'Unverified email quiz creation', path: '/quizzes/q_2', expected: 'PERMISSION_DENIED' },
  { name: 'Identity spoofing (authorId != auth.uid)', path: '/quizzes/q_3', expected: 'PERMISSION_DENIED' },
  { name: 'Shadow/ghost field injection', path: '/quizzes/q_4', expected: 'PERMISSION_DENIED' },
  { name: 'ID poisoning with invalid characters', path: '/quizzes/bad id$', expected: 'PERMISSION_DENIED' },
  { name: 'Client timestamp forgery on createdAt', path: '/quizzes/q_5', expected: 'PERMISSION_DENIED' },
  { name: 'Empty or >50 questions array', path: '/quizzes/q_6', expected: 'PERMISSION_DENIED' },
  { name: 'Type poisoning on question option', path: '/quizzes/q_7', expected: 'PERMISSION_DENIED' },
  { name: 'Oversized payload (>260KB cover)', path: '/quizzes/q_8', expected: 'PERMISSION_DENIED' },
  { name: 'Cross-owner update/delete attempt', path: '/quizzes/q_9', expected: 'PERMISSION_DENIED' },
  { name: 'Immutable authorId/createdAt mutation', path: '/quizzes/q_10', expected: 'PERMISSION_DENIED' },
  { name: 'Unauthorized collection list scraping', path: '/quizzes', expected: 'PERMISSION_DENIED' },
] as const;
