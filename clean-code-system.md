# Clean Code System Plan

## 1. Overview

The goal of this project is to implement clean code principles across the entire Fitness Project ecosystem (Frontend, Backend, Mobile). This includes refactoring bloated files (e.g., `ProgressView.tsx`), enforcing Single Responsibility Principle (SRP), reducing code duplication (DRY), and improving maintainability across all domains.

## 2. Project Type

**FULL ECOSYSTEM** (WEB, MOBILE, BACKEND)

## 3. Success Criteria

- **Maintainability:** Functions are small (max 20 lines) and do one thing.
- **Readability:** Variables and functions reveal their intent clearly. No unnecessary comments.
- **Testability:** Core logic is extracted from UI/framework dependencies, making it easier to unit test.
- **Quality Gates:** All linters, type checks, and security scans pass without errors.
- **No Regressions:** Existing features work exactly as before.

## 4. Tech Stack

- **Frontend:** React, Next.js, TypeScript, Tailwind CSS
- **Backend:** Go (assumed from `userservice` / `.go` extensions) & Node.js
- **Mobile:** Flutter (Dart) for webviews
- **Database:** SQL / Prisma
- **Tooling:** ESLint, Prettier, TypeScript Compiler, Go fmt/vet

## 5. File Structure

The refactoring will target the following core domains:

```
/Clientdashboard (Web Frontend)
/FitnessManagementDashboard-trainer (Web Frontend)
/backend (Go/Node.js Backend Services)
/fitness_client_webview (Mobile)
/fitness_mobile_webview (Mobile)
```

## 6. Task Breakdown

### Task 1: Web Frontend Refactoring (Client & Trainer Dashboards)

- **Agent:** `frontend-specialist`
- **Skills:** `clean-code`, `frontend-design`
- **INPUT:** Bloated TSX components (e.g., `ProgressView.tsx`, `Dashboard.tsx`).
- **OUTPUT:** Smaller, modularized React components. Extracted custom hooks for business logic. Avoid deep nesting and magical numbers.
- **VERIFY:** Run `npm run lint`, `npx tsc --noEmit`. UX Audit script passes.

### Task 2: Backend Services Refactoring

- **Agent:** `backend-specialist`
- **Skills:** `clean-code`, `api-patterns`
- **INPUT:** Go / Node.js backend controllers, handlers, and services.
- **OUTPUT:** Handlers separated from business logic (SRP). Clear error handling. Max 3 arguments per function. Consistent REST/GraphQL response formats.
- **VERIFY:** Run backend unit tests (`go test ./...` or `npm test`). API Validator script passes.

### Task 3: Mobile Apps / Webviews Refactoring

- **Agent:** `mobile-developer`
- **Skills:** `clean-code`, `mobile-design`
- **INPUT:** Flutter / Dart widgets and controllers.
- **OUTPUT:** Clean widget trees, separated state management, flat hierarchies. Elimination of dead code.
- **VERIFY:** Run flutter analyze, mobile accessibility checks pass. Mobile Audit script passes.

### Task 4: Database Layer Clean-up

- **Agent:** `database-architect`
- **Skills:** `clean-code`, `database-design`
- **INPUT:** SQL queries, DB connection handlers, ORM models.
- **OUTPUT:** Standardized repository patterns. Optimized queries and indexes.
- **VERIFY:** `schema_validator.py` script passes.

## 7. Phase X: Verification

- [ ] **Lint and Types:** `npm run lint && npx tsc --noEmit` on all frontend projects.
- [ ] **Backend Tests:** All backend tests pass.
- [ ] **Security:** `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .` passes with no critical issues.
- [ ] **UX/UI Check:** No standard template layouts or forbidden colors (purple/violet).
- [ ] **Build:** All apps build successfully for production.
