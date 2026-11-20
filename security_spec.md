# Firestore Security Specification (PrismaQuiz)

## 1. Data Invariants
1. **Default-Deny Baseline**: Every unspecified path is strictly denied (`read, write: if false`).
2. **Owner-Only Mutations & List Queries**: Only authenticated, email-verified Google users (`request.auth != null && request.auth.token.email_verified == true`) can create, list, update, or delete their own `/quizzes/{quizId}` documents where `authorId == request.auth.uid`.
3. **Link-Based Public Read (`get` only)**: Unauthenticated observers with an exact `quizId` link can `get` `/quizzes/{quizId}` to view/play/export that quiz, while `list` remains strictly locked to `resource.data.authorId == request.auth.uid` so quizzes cannot be enumerated or scraped.
4. **Immutable Ownership & Creation Timestamps**: `authorId` and `createdAt` cannot be changed after creation; `createdAt` and `updatedAt` must equal `request.time`.
5. **Strict Volumetric & Schema Validation**: All document IDs match `^[a-zA-Z0-9_-]{1,128}$`, strings have `.size()` caps, `questions` is bounded `1..50` with index-0 map/type checks, and `timeLimitMinutes` is `0..180`.
6. **PII Isolation**: No user email addresses are stored in `/quizzes/{quizId}` or `/users/{userId}`, and `/users/{userId}` is strictly owner-only.

## 2. "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Create**: Anonymous caller tries to `setDoc` on `/quizzes/quiz_1` -> Denied (`isSignedIn()` false).
2. **Unverified Email Spoof**: Signed-in caller with `email_verified: false` tries to create a quiz -> Denied (`email_verified == true` required).
3. **Identity Spoofing on Create**: User A sets `authorId: "user_B"` -> Denied (`data.authorId == request.auth.uid`).
4. **Ghost / Shadow Field Injection**: Creator adds extra field `isFeatured: true` -> Denied (`keys().hasOnly(...)`).
5. **ID Poisoning**: Caller attempts write to `/quizzes/bad$id..with..spaces` -> Denied (`isValidId(quizId)`).
6. **Client Timestamp Forgery**: Caller passes `createdAt: Timestamp(2020-01-01)` -> Denied (`createdAt == request.time`).
7. **Unbounded Questions Array / Empty Array**: Caller passes `questions: []` or 51 questions -> Denied (`size() >= 1 && size() <= 50`).
8. **Type Poisoning on Questions Element**: Caller passes `questions: ["not-a-map"]` -> Denied (`questions[0] is map`).
9. **Denial of Wallet Payload**: Caller passes 500KB `coverImage` or 10KB `title` -> Denied (`.size()` limits).
10. **Cross-Owner Update / Delete**: User B attempts to `update` or `delete` User A's quiz -> Denied (`existing().authorId == request.auth.uid`).
11. **Ownership Hijack on Update**: User A attempts to mutate `authorId` or `createdAt` -> Denied (`affectedKeys().hasOnly(...)` + immutability check).
12. **Collection Enumeration (`list`) by Non-Owner or Guest**: Unauthenticated user or User B runs `getDocs(collection(db, 'quizzes'))` without matching `where('authorId', '==', uid)` -> Denied (`resource.data.authorId == request.auth.uid`).
