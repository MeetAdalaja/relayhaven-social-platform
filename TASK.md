# RelayHaven Social - Unified Product Development Task

> **Product:** RelayHaven Social  
> **Repository:** `relayhaven-social-platform`  
> **Tagline:** Connect, share and engage in a safer social space.  
> **Goal:** Transform the existing TypeScript social-platform monorepo into a secure, scalable and portfolio-ready full-stack product.

---

## 1. Product Objective

RelayHaven Social is a full-stack social networking platform where users can publish posts, follow people, interact with content, discover conversations and participate in a safer moderated community.

This development task combines two streams of work into one complete product roadmap:

1. **User-facing product capabilities** such as reposts, mention autocomplete, infinite scrolling, keyboard accessibility, drafts and content warnings.
2. **Platform engineering improvements** such as secure authentication, efficient API queries, observability, test isolation, CI/CD and maintainable developer workflows.

This is a real product implementation. New user-facing functionality must be backed by real database persistence and API behaviour where appropriate. Do not implement temporary mock or stub behaviour for features that belong in the backend.

---

## 2. Product Identity and Terminology

Apply the following identity consistently throughout the application, packages, API contracts, database setup, tests and documentation.

| Concept | Required Naming |
|---|---|
| Product name | **RelayHaven Social** |
| Short header/logo name | **RelayHaven** |
| Admin console | **RelayHaven Admin** |
| API display name | **RelayHaven API** |
| Repository name | `relayhaven-social-platform` |
| Internal package namespace | `@relayhaven/*` |
| Protobuf namespace | `relayhaven.*` |
| Local database filename | `relayhaven.db` |
| User session cookie | `relayhaven-session` |
| Admin session cookie | `relayhaven-admin-session` |
| Published content unit | **Post / Posts** |
| Sharing another user's post | **Repost / Reposts** |

### Branding Requirements

- Replace all old visible product branding with RelayHaven Social branding.
- Replace starter-specific post-sharing terminology with **repost** terminology.
- Rename internal package, API-client and Protobuf namespaces where practical.
- Remove or replace starter-specific seed content and test identities.
- Do not hide insecure defaults by merely renaming them; fix the underlying implementation.

---

## 3. Current Baseline Capabilities

The starter monorepo already provides the foundation for:

- User registration and login
- Consumer web client
- Admin web client
- gRPC API
- SQLite/LibSQL persistence through Drizzle
- Posts, comments and likes
- User profiles
- Follows and followers
- Bookmarks
- Notifications
- Search
- Administration and moderation workflows
- Unit and end-to-end test infrastructure
- pnpm/Turborepo workspace setup

The work below should extend and harden that foundation while preserving working existing behaviour.

---

## 4. Engineering Principles

All implementation work must follow these rules:

- Preserve existing working functionality unless deliberately improving it.
- Prefer real persisted domain behaviour over UI-only simulations.
- Keep API contracts stable where possible; evolve them deliberately when adding product capability.
- Implement reusable patterns rather than repeating feature-specific logic across screens or services.
- Add tests for security boundaries, important user flows, regressions and failure paths.
- Do not introduce hard-coded production secrets, unsafe authentication shortcuts or silent failure handling.
- Use small, reviewable commits grouped by product or platform capability.
- Update documentation whenever setup, architecture, contracts or product behaviour changes.

---

# Part A - Foundation and Existing Correctness

## Task 1: Rebrand the Product as RelayHaven Social

Rename the application consistently across visible UI, technical namespaces, local runtime identifiers and documentation.

### Implementation Requirements

- Update browser titles, header text, authentication screens, empty states, admin console branding and API startup output.
- Rename repository/package metadata to RelayHaven naming.
- Rename `@.../*` workspace imports to `@relayhaven/*`.
- Rename Protobuf namespaces to `relayhaven.*` and regenerate generated client/server types.
- Rename local database and cookie identifiers.
- Update seed users and demo content to reflect the RelayHaven Social product identity.
- Update README and developer documentation.

### Acceptance Criteria

- No old visible branding remains in user-facing pages or administrative pages.
- Application builds successfully after package and Protobuf namespace changes.
- Local login, navigation and API requests still work after cookie/database configuration updates.
- A repository-wide search shows no unintended starter branding remaining.

---

## Task 2: Fix Existing User-Visible Correctness Problems

Before introducing new features, correct known baseline issues in post cards, comments, bookmark status and profile loading.

### Implementation Requirements

- Initialise post-like UI state from returned API state rather than defaulting to false.
- Initialise comment-like UI state from returned API state.
- Include bookmark state in the standard post representation instead of triggering one separate bookmark-status request per rendered post.
- Remove duplicated follower/following RPC calls where profile data already contains the counts.
- Correct mention parsing so email-like content does not render as a user mention.

### Acceptance Criteria

- Previously liked posts and comments display their true state on first render.
- Previously bookmarked posts display their true state without per-card bookmark requests.
- Profile pages make no redundant follower/following requests.
- Text such as `name@example.com` does not create a mention link or mention notification.
- Regression tests cover the corrected behaviours.

---

# Part B - Security and Platform Trust

## Task 3: Secure Password Storage with Backward-Compatible Migration

The existing credential storage strategy must be replaced with modern password hashing while preserving login capability for existing seeded users.

### Implementation Requirements

- Document the existing password-storage vulnerability and exploitation impact.
- Replace fast deterministic password hashing with a password-specific slow hashing algorithm, preferably **Argon2id**.
- Store all newly registered passwords using the new scheme.
- Support login for legacy stored hashes.
- On successful login using a legacy hash, automatically replace it with an Argon2id hash.
- Ensure plaintext passwords are never logged or persisted.

### Acceptance Criteria

- New registrations never store legacy password hashes.
- Existing seeded users can log in after the migration is introduced.
- A successful legacy login upgrades the user's stored password hash.
- Incorrect passwords fail under both legacy and upgraded hash formats.
- Tests prove migration-on-login and modern storage behaviour.

---

## Task 4: Correct the Client-to-API Authentication Trust Boundary

The API must not trust identity or privileged role claims created by frontend applications.

### Target Trust Flow

```text
Browser
  -> consumer/admin web application
    -> API validates credentials and issues authoritative access/session token
      -> web application stores and forwards the API-issued token
        -> API authorizes protected actions
```

### Implementation Requirements

- Remove API-token signing capability from consumer and admin client applications.
- Ensure only the API issues authoritative authentication tokens.
- Remove hard-coded fallback JWT/session secrets.
- Require secrets through environment configuration and document them in `.env.example`.
- Protect privileged admin/moderation operations by verifying current authorization state.
- Define behaviour for banned or deactivated users with existing sessions.
- Consider a session or token-revocation model for future expansion.

### Acceptance Criteria

- The client cannot mint a token that grants itself admin/moderator privileges.
- Missing required secrets fail safely during application startup.
- Privileged API actions reject non-authorized identities with appropriate error status.
- Role changes or bans are correctly enforced for protected actions.
- Security tests cover privilege forgery attempts and protected route behaviour.

---

# Part C - Data Access and API Response Architecture

## Task 5: Create a Unified Post View Model

Every page displaying a post should receive a consistent, complete post representation.

### Required Post View Data

The shared post representation should support:

```ts
type PostView = {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  updatedAt?: Date;

  likeCount: number;
  commentCount: number;
  repostCount: number;

  isLiked: boolean;
  isBookmarked: boolean;
  isReposted: boolean;

  contentWarning?: string;

  repostContext?: {
    reposter: {
      id: string;
      username: string;
      displayName: string;
    };
    repostedAt: Date;
  };
};
```

The exact generated/Protobuf structure may differ, but the displayed product behaviour must be supported consistently.

### Implementation Requirements

- Add or extend Protobuf response contracts for full post-card state.
- Use the same view model across Home, Explore, Bookmarks, Search, Profiles and Post Detail.
- Add repost and content-warning fields in a backward-compatible way using new Protobuf field numbers.
- Avoid screen-specific duplicate post enrichment logic.

### Acceptance Criteria

- A post is rendered consistently across all feed and detail screens.
- Like, bookmark and repost state do not require extra per-card frontend requests.
- New post metadata is returned from real API responses.
- Existing screens continue to function after contract updates.

---

## Task 6: Eliminate N+1 Query Patterns

Feed and profile operations must scale without issuing repeated queries for every post.

### Required Measurement Targets

Profile and document SQL query counts for:

- Loading the Home feed with 10 posts.
- Loading a user profile page with 10 displayed posts.
- Loading the Bookmarks page with 10 bookmarked posts.

### Implementation Requirements

- Identify and document the repeated-query anti-pattern.
- Build a reusable query or repository utility for enriched post retrieval.
- Load counts and viewer state using joined/aggregated/subquery-based data retrieval rather than per-post service calls.
- Apply the new pattern to the worst offenders, including feeds, bookmarks, search and user profiles.
- Keep API response behaviour equivalent except for deliberately added fields.

### Acceptance Criteria

- Before/after SQL query counts are documented.
- Home feed and bookmarks no longer issue query counts that grow linearly by three or more queries per post.
- A regression test or instrumentation strategy protects against reintroducing the N+1 pattern.
- Product screens render correct like/comment/bookmark/repost information after refactoring.

---

# Part D - Product Features

## Task 7: Implement Real Reposts

Users must be able to share another user's post to their own profile and feed identity.

### Database Requirements

Create persisted repost records with at least:

```text
reposts
- id
- userId
- postId
- createdAt
- unique(userId, postId)
```

Apply foreign-key/cascade behaviour appropriate for deleted users or deleted posts.

### API Requirements

Implement real API behaviour for:

- Creating a repost.
- Removing/undoing a repost.
- Returning repost count.
- Returning the current viewer's repost state.
- Returning repost context when a profile/feed item represents another user's shared post.

### UI Requirements

- Every eligible post displays a repost control with count.
- A user can repost and undo a repost.
- Reposted content appears in the reposter's profile feed with clear original-author attribution.
- A user cannot repost their own post.
- Repost state appears consistently across feed and detail views.

### Acceptance Criteria

- Reposts persist across reloads and sign-ins.
- Duplicate reposts are prevented.
- Undo removes the repost and updates displayed counts.
- Own-post repost attempts are blocked server-side and represented appropriately in the UI.
- Tests cover create, undo, count display, profile appearance, duplicate protection and own-post restriction.

---

## Task 8: Add Mentions Autocomplete and Reliable Mention Notifications

Users should receive helpful username suggestions while composing posts, without incorrect triggering in normal text.

### UI Requirements

- Typing `@` at the start of text or after an eligible boundary displays matching user suggestions.
- Suggestions reuse real user-search capability.
- The dropdown appears close to the active typing/caret area.
- Support multiple mentions in one post.
- Support keyboard navigation:
  - Arrow Up/Down to move through suggestions.
  - Enter or Tab to insert a selected user.
  - Escape to dismiss.
- Do not trigger for text inside an email-like pattern, such as `name@example.com`.

### API/Domain Requirements

- Parse valid mentions when a post is created or updated.
- Deduplicate repeated mentions.
- Verify mentioned users exist.
- Create notifications for valid mentioned users.
- Do not notify a user for mentioning themselves.
- Do not create false mention notifications from email addresses.

### Acceptance Criteria

- Suggestions appear and insert usernames accurately.
- Multiple mention insertion works in the same post.
- Email-like text does not activate suggestions or send notifications.
- Mention notifications are persisted and displayed correctly.
- Unit and E2E tests cover dropdown, keyboard usage, insertion and edge cases.

---

## Task 9: Add Infinite Scrolling and Navigation Restoration

Home and Explore feeds should progressively load content as users scroll.

### Implementation Requirements

- Load the initial feed page using a reusable feed-loading abstraction.
- Use an intersection observer or equivalent trigger to request subsequent feed pages automatically.
- Support Home and Explore feeds at minimum.
- Show loading, empty and end-of-feed states.
- Preserve loaded feed data and scroll position when a user opens a post and returns.
- Avoid duplicate results or repeated requests while a page is loading.
- Begin with existing pagination if necessary; document cursor pagination as the preferred scalability improvement if not implemented immediately.

### Acceptance Criteria

- Home and Explore automatically load additional posts as the user approaches the bottom.
- No manual “load more” interaction is required.
- Returning from a post detail screen restores the prior feed position.
- Empty and loading states are usable and visually consistent.
- E2E tests cover initial load, load-more-on-scroll and scroll restoration.

---

## Task 10: Implement Keyboard-Driven Feed Navigation and Accessibility

Users should be able to navigate and interact with feeds without a mouse.

### Required Shortcuts

| Shortcut | Behaviour |
|---|---|
| `j` | Focus next post |
| `k` | Focus previous post |
| `l` | Like or unlike focused post |
| `b` | Bookmark or remove bookmark from focused post |
| `r` | Repost or undo repost for focused post |
| `Enter` or `o` | Open focused post |
| `c` | Open/focus reply action |
| `?` | Open keyboard shortcut help overlay |
| `Escape` | Close overlay or remove current interaction focus |

### Implementation Requirements

- Create a reusable feed-navigation hook or component layer shared by all feed screens.
- Do not implement separate route-specific shortcut logic.
- Visually distinguish the currently focused post using the existing design system.
- Do not trigger shortcuts while users type in inputs, textareas, selectors or content-editable elements.
- Support meaningful labels, focus management and screen-reader-compatible controls.

### Acceptance Criteria

- Keyboard navigation works on all feed views that render the shared feed/post component.
- Action shortcuts trigger the same domain behaviour as pointer controls.
- Shortcuts are safely suppressed while typing or composing.
- A discoverable help overlay documents available shortcuts.
- E2E tests cover focus movement, actions and input suppression.

---

## Task 11: Add Draft Preservation and Content Warnings

Improve composition safety and usability with one active draft and optional content warnings.

### Draft Requirements

- Preserve one unfinished post draft at a time.
- Save draft content across navigation within the user session.
- Restore a saved draft on any screen showing the composer.
- Clear the draft after a successful post publication.
- Clear the draft when the user deliberately removes all draft content.
- Client/session storage is acceptable for the first version; database-backed multi-device drafts are optional future work.

### Content Warning Requirements

- Users can toggle an optional content-warning field while composing a post.
- Keep the warning field hidden unless the option is enabled.
- Persist content-warning text with the post through the database and API.
- Posts with warnings display warning text while hiding original content initially.
- Users must explicitly select a reveal/show action before seeing hidden post content.
- Content warnings must render correctly across feed, detail, search, bookmarks and profile views.

### Acceptance Criteria

- Draft content survives page navigation and is restored accurately.
- Successfully creating a post clears its draft.
- A warning-enabled post persists the warning after refresh.
- Hidden content is not shown before the user explicitly reveals it.
- Tests cover draft restoration, draft clearing, warning creation and reveal behaviour.

---

# Part E - Reliability and Operations

## Task 12: Standardize Error Handling

The API must represent failures predictably and avoid disguising server failures as normal empty data.

### Implementation Requirements

- Audit every gRPC handler and catalogue existing error patterns.
- Create an application error taxonomy, including at least:
  - Authentication error
  - Authorization error
  - Validation error
  - Not found error
  - Conflict/duplicate action error
  - Internal server error
- Map application errors consistently to appropriate gRPC status codes.
- Preserve client-compatible successful response contracts.
- Remove catch-all behaviours that silently return empty lists, zero counts or false state for internal failures.
- Provide user-safe error messages while retaining diagnostic logging.

### Expected gRPC Mapping

| Failure Type | gRPC Status |
|---|---|
| Authentication required | `UNAUTHENTICATED` |
| Not permitted | `PERMISSION_DENIED` |
| Invalid input | `INVALID_ARGUMENT` |
| Missing post/user/resource | `NOT_FOUND` |
| Duplicate/conflicting action | `ALREADY_EXISTS` or `FAILED_PRECONDITION` |
| Unexpected service/database failure | `INTERNAL` |

### Acceptance Criteria

- Similar failures are returned consistently across services.
- Internal service failures no longer appear as successful empty product data.
- Frontend error states are understandable and non-destructive.
- Tests cover authentication, authorization, validation, not-found, conflict and internal-error paths.

---

## Task 13: Add Request Tracing and Structured Logging

Production troubleshooting should be possible without guessing which request caused an issue.

### Implementation Requirements

- Generate a unique trace ID for every gRPC request.
- Propagate trace context through handlers and service-layer calls.
- Include trace ID in all request-related logs.
- Return trace ID to the client through supported metadata or a backward-compatible response strategy.
- Log structured request outcome details, such as:
  - trace ID
  - RPC method
  - authenticated user identifier when available
  - duration
  - success/failure outcome
  - application error category where applicable
- Never log passwords, tokens or other secret values.

### Acceptance Criteria

- Every API request can be correlated from incoming request to completion/error log.
- Failed API calls contain sufficient safe context to debug the issue.
- Client-side failure reporting can surface a trace/reference ID where appropriate.
- Tests or integration validation prove trace IDs are returned and logged.

---

## Task 14: Repair Test Isolation and Close Coverage Gaps

Tests should verify product behaviour reliably rather than tolerate interference from other tests.

### Implementation Requirements

- Audit unit and E2E coverage across API services and client features.
- Identify untested services and meaningful untested failure paths.
- Stop E2E suites from depending on shared mutable records created or modified by parallel tests.
- Use isolated databases per worker, reset hooks or test-specific users/data.
- Remove workarounds that hide real runtime failures where feasible; diagnose the underlying problem.
- Add direct tests for newly implemented domain behaviour and security guarantees.

### Minimum Test Coverage Areas

- Modern password hashing and legacy migration
- API-issued authentication and privilege enforcement
- Unified post-view data
- Query-count/performance regression protection
- Repost creation/undo/restrictions
- Mention parsing and notifications
- Content warnings and drafts
- Infinite scrolling and scroll restoration
- Keyboard actions and accessibility behaviour
- Error mapping and trace propagation
- Admin/moderation authorization

### Acceptance Criteria

- Tests pass consistently when repeatedly executed.
- Parallel E2E execution does not create state-based false positives or false negatives.
- New product features include unit/integration/E2E validation appropriate to their layer.
- Known coverage gaps and remaining risks are documented.

---

## Task 15: Build Pipeline and Developer Experience

RelayHaven Social must be easy to run locally and continuously validated in source control.

### Implementation Requirements

- Add or improve CI to validate pull requests with:
  - Dependency installation
  - Generated-code/protobuf validation where applicable
  - Formatting/lint checks
  - Type checking
  - Unit tests
  - Build
  - E2E tests against a controlled fresh database
- Configure Turborepo tasks and caching correctly so affected packages and dependents are validated efficiently.
- Audit package build output, especially API production build behaviour.
- Add practical staged-change validation through a pre-commit hook.
- Create a concise `.env.example`.
- Keep setup commands accurate in the README.

### Required Local Workflow

The documented local workflow should support commands equivalent to:

```bash
pnpm install
pnpm proto:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

### Acceptance Criteria

- A fresh developer can configure and start the application using the documentation.
- Pull requests automatically fail on formatting, type, test or build regressions.
- E2E validation starts from controlled data rather than an unknown local state.
- Required environment values are documented and no insecure fallback secrets remain.

---

# Part F - Optional Production Enhancements

These are desirable after the core unified task is complete.

## Optional Enhancement 1: Cursor-Based Feed Pagination

Replace offset pagination with stable cursor pagination based on timestamp and post/repost identity to prevent duplicate or missed feed items as new posts arrive.

## Optional Enhancement 2: Refresh Tokens and Session Revocation

Add revocable server-managed sessions or refresh tokens to support secure logout from devices, role-change enforcement and token rotation.

## Optional Enhancement 3: Rate Limiting and Abuse Controls

Rate-limit login, registration, post actions and moderation-sensitive endpoints. Add abuse-resistant guardrails for repeated interactions.

## Optional Enhancement 4: Deployment and Monitoring

Deploy the consumer application, admin console and API. Add monitoring dashboards, structured log aggregation and documented operational runbooks.

---

# 5. Recommended Implementation Order

Implement the unified project in this sequence:

| Phase | Workstream | Main Outcome |
|---:|---|---|
| 1 | Branding and baseline corrections | Product is RelayHaven Social and existing UX is reliable |
| 2 | Credential storage and authentication trust | Secure identity foundation |
| 3 | Unified post model and query optimization | Efficient, extensible feed architecture |
| 4 | Reposts and content-warning persistence | New core social functionality |
| 5 | Mentions, drafts, infinite scroll and keyboard UX | Rich consumer experience |
| 6 | Error taxonomy and tracing | Diagnosable production behaviour |
| 7 | Test isolation, CI and developer experience | Reliable delivery pipeline |
| 8 | Optional session, pagination and deployment upgrades | Production expansion |

---

# 6. Suggested Atomic Commit Plan

Use clear commits rather than one large implementation commit.

```text
brand: rename application identity to RelayHaven Social
fix: correct initial post state and redundant client data fetching
security: migrate passwords to Argon2 with legacy upgrade on login
security: make API authoritative for authentication tokens
perf: introduce unified post view query model
perf: remove n-plus-one queries from feeds profiles and bookmarks
feat: implement persisted repost interactions
feat: add persisted content warnings and composer drafts
feat: add mentions autocomplete and notification parsing safeguards
feat: add infinite scrolling with feed restoration
feat: add keyboard-driven feed navigation and shortcut help
refactor: standardize grpc errors and response handling
observability: add trace ids and structured api logging
test: isolate e2e data and add security feature regressions
ci: add validation pipeline environment setup and hooks
docs: finalize RelayHaven Social architecture and setup guide
```

---

# 7. Definition of Done

The unified RelayHaven Social project is complete for its first full product release when:

- The application is consistently branded as **RelayHaven Social**.
- Existing baseline functionality continues to work.
- New passwords are securely stored and legacy credentials migrate safely.
- Only the API issues trusted authentication credentials.
- No hard-coded fallback secrets are used.
- Posts render with complete consistent interaction state.
- Feed/profile/bookmark operations avoid N+1 query patterns.
- Reposts are real persisted domain actions.
- Mentions autocomplete and notifications behave correctly.
- Home and Explore support infinite scrolling and navigation restoration.
- Keyboard interaction and accessibility requirements are implemented.
- Drafts and content warnings work across relevant post views.
- Errors are consistently mapped and traceable.
- Unit and E2E tests are stable, isolated and meaningful.
- CI validates the project on every pull request.
- A new developer can run the project from the README without undocumented manual steps.

---

# 8. Delivery Artifacts

The completed repository should include:

```text
README.md
TASK.md
.env.example
audit/
  security-audit.md
  query-performance-before-after.md
  error-handling-audit.md
  testing-and-ci-audit.md
apps/
packages/
.github/workflows/
```

Each audit document should explain what was found, what changed, what was verified and any remaining limitations.

---

# Final Product Statement

**RelayHaven Social** should demonstrate the ability to build and productionize a modern social-media platform: a rich and accessible React user experience, real persisted social interactions, secure API trust boundaries, scalable data access, disciplined testing and deployable engineering workflows.
