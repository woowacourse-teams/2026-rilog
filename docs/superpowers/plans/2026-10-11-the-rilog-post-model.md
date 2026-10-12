# Issue #717: THE Rilog Post model

Scope: backend only. Reuse Post, existing REST publish/update contracts and asset/view-count/trending side effects. API projection, Sheets, AI, scheduling and frontend are later issues.

1. Add domain tests for STANDARD defaults, THE Rilog ownership/chapter/length/source rules, and metadata preservation on update.
2. Add PostType, optional description and shared-primary-key PostSource; add a trusted internal THE Rilog publishing command that reuses publication side effects.
3. Add V5 migration and MySQL migration tests; scope the existing V4 test to V4.
4. Verify persistence and service behavior with H2 integration tests, run backend checks, then review the diff.

Decisions: only the owner of the RILOG blog `the_rilog` publishes THE Rilog posts. Existing chapters `headlines` and `spotlights` must be configured beforehand; publishing does not create accounts or chapters. Missing chapter fails explicitly. All post types use ordinary edit rules, including clearing an omitted chapter; fixed THE Rilog chapter validation applies at creation. Source name is required for spotlights; image may be absent. Links belong in BlockNote content. Text limits count Unicode code points including spaces; description is nullable for STANDARD/headlines. Eight topics and edition quotas are later publication workflow policy, not enforced by this model issue.

## Verification

- `testH2`: 1,053 tests, zero failures/errors/skips.
- `testMySql`: 1,055 tests, zero failures/errors/skips, including V4/V5 Flyway migration and Hibernate schema validation.
- `bootJar`: successful.
- `git diff --check`: clean.
- Fresh read-only code review: no findings.
- Gradle validation used an external temporary build directory to avoid concurrent writes to the checkout's generated build results. No build configuration was changed.
- Frontend, REST request/response DTOs, AI, Sheets and scheduled publishing remain outside this issue.

## 2026-10-12 naming refactor

Rename the implementation to use THE Rilog names consistently in classes, methods, constants, errors and tests. Keep domain behavior, DB schema, migration contents and frontend unchanged. Existing domain/integration/migration tests cover the behavior and serve as regression checks; do not add tests that merely assert names. Update imports, Java filenames and implementation documentation, search for leftover old names, then run the full H2 suite/build and relevant MySQL tests.

Naming refactor verified: full H2 suite (1,053 tests), relevant MySQL tests (53 tests), and bootJar passed. Old implementation names no longer appear in backend sources or this issue documentation. Frontend and migration SQL were not changed.

## 2026-10-12 chapter lookup extraction

Extract the fixed THE Rilog chapter lookup and its CHAPTER_NOT_FOUND handling into a private PostService helper. Keep the query, type-to-chapter mapping and publication behavior unchanged. Existing THE Rilog integration tests cover both valid types and a missing chapter; rerun those and the existing PostService integration tests after extraction.

## 2026-10-12 validation readability refactor

Split the combined THE Rilog validation guard into private blog, chapter and post-detail validators. Preserve validation order and exception codes. Before extraction, add regression coverage for missing/deleted chapter and incomplete blog/detail inputs; existing tests cover ownership, chapter mapping and title limits. Then run domain and publication integration tests. Do not change DTOs, schema or frontend.

Validation extraction verified: added guard regression tests passed before extraction; domain and publication integration tests passed afterward (54 tests). Query/schema/frontend and exception codes remain unchanged.

## 2026-10-12 enum mapping consistency

Use the existing User enum mapping style for PostType: @Enumerated(STRING), @Column, and imported Lombok @Default. Remove the VARCHAR JDBC override. The final pre-deployment migration is V5 only, creating native ENUM directly. Verify V4-to-V5 backfill/defaults and all enum types, full H2 tests/build and MySQL schema validation. Do not access or mutate operational databases.

## Final migration consolidation and update reuse

User explicitly chose a single V5 before deployment. Change V5 to create native ENUM directly and delete the unused V6. Consolidate the migration test into V4-to-V5 coverage for native ENUM, STANDARD backfill/defaults, all valid types, source FK/uniqueness and repeated migration behavior. Keep the existing PostService.update -> Post.update path, including metadata preservation; no separate THE Rilog update API or method. First confirm the updated migration test fails against the old V5, then verify the consolidated SQL with H2/build and MySQL tests. Update the ADR to describe the final implementation.

Final consolidation verified: native ENUM assertion failed against the old VARCHAR V5; after consolidation, full H2 (1055 tests), full MySQL (1057 tests), bootJar and git diff --check passed. Build resources include V1–V5 only. Existing update tests verify metadata preservation; the later ordinary-update decision supersedes the initial update restrictions.

## Ordinary update policy

User chose to treat published THE Rilog posts like ordinary posts when editing. Remove the PostType-specific update branch. Keep author/member checks, normal target-blog validation, BlockNote conversion and common assignments. THE Rilog title/chapter rules remain creation-only. Omitted chapter clears it as for ordinary posts; permitted Colog transfers and chapter changes follow the existing service policy. Type, description and source remain unchanged. Update tests first to demonstrate this policy and keep creation validation and unauthorized-edit coverage, then remove the branch and run regression checks. Update the ADR accordingly.

Ordinary-update policy verified: updated behavior tests failed against the old branch, then passed after its removal. Full H2 (1,059 tests), relevant MySQL (58 tests), bootJar and git diff --check passed. Creation-only restrictions and author/member access checks remain covered. Frontend and migrations were unchanged.

## Separate news data validation from heading presentation

User approved removing the PostContent H2 title scanner. Test headline creation with H1/H2/H3 content without coupling title rules to the BlockNote level, then delete validateHeadlineTitles and its Post call. Keep generic PostContent validation/serialization and Spotlight title/description validation unchanged. The future AI pipeline must validate structured topic title/summary/originalUrl before rendering and derive homepage headlines from the same topic data with stable block IDs. Article titles remain limited to 40 code points by that future pipeline, not by parsing H2 blocks in Post. Do not add unused AI DTOs, frontend changes or new migrations in this issue.

Heading decoupling verified: H2 creation test failed under the old scanner, then H1/H2/H3 cases passed after its removal. Full H2 (1,062 tests), relevant MySQL (61 tests), bootJar and git diff --check passed. PostContent general validation/serialization/assets and Spotlight limits remain intact. News topic-title validation is documented for the future AI pipeline, not implemented here.

## Chapter selection ownership

Move the type-to-chapter-name switch out of PostType and into PostService.getTheRilogChapter. PostType retains classification only. Post creation validates an existing, active chapter belongs to its blog, without duplicating the service's chapter-name policy. Add tests first for a service-selected valid chapter and all three published types choosing the correct stored chapter. Retain missing/deleted/foreign chapter and owner validation. No update/REST/schema/frontend changes.

Chapter selection refactor verified: domain acceptance test failed before changing ownership, then full H2 (1,066 tests), relevant MySQL (65 tests), bootJar and git diff --check passed. Main-source chapter-name mapping exists only in PostService. Missing/deleted/foreign chapter checks and update behavior remain covered.
