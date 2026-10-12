# Issue #717: THE Rilog Post model

Scope: backend only. Reuse Post, existing REST publish/update contracts and asset/view-count/trending side effects. API projection, Sheets, AI, scheduling and frontend are later issues.

1. Add domain tests for STANDARD defaults, THE Rilog ownership/chapter/length/source rules, and metadata preservation on update.
2. Add PostType, optional description and embedded PostSource; add a trusted internal THE Rilog publishing command that reuses publication side effects.
3. Add V6 migration and MySQL migration tests; scope the existing V4 test to V4. Earlier V5 decisions and verification below describe prior revisions and are superseded by the final V6 numbering decision.
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

## Embedded source value object

Replace the PostSource entity with an entity/vo @Embeddable, following Blog.profile. Post owns @Embedded source; remove the source ID, Post back-reference, BaseEntity and association lifecycle. Keep source accessors and creation validation unchanged. Source columns live in post and are nullable for STANDARD/headlines; a Spotlight still requires a source name and permits a missing image. First adapt migration/persistence tests to verify same-row storage, absent source round-trips, an optional image and update preservation. Confirm failure against the old schema, then update the pre-deployment V5 and mapping. Update the ADR and run full H2/build plus related MySQL and Flyway tests. No frontend or REST contract changes.

Embedded source verified: six persistence cases failed against the old separate-table mapping, then full H2 (1,068 tests), related MySQL including V4-to-V5 migration (68 tests), bootJar and git diff --check passed. V5 adds each source column with a separate ALTER statement for H2/MySQL compatibility. Tests cover old-row/default nulls, all-null embedded source hydration, optional Spotlight image, source preservation after ordinary edits, nullable column lengths and repeated migration. No frontend or REST changes.

## V6 numbering and project test conventions

User requests V6 numbering and a full rewrite of this issue's tests using backend/.agents/skills/write-rilog-backend-test-code/SKILL.md and its convention/assertions/domain/service-integration-test02 guides. Move THE Rilog SQL to V6 without creating a placeholder V5 or duplicating SQL. Current upstream ends at V4. Migration tests resolve the latest available version below V6, apply it first, and then verify V6 alone; this also incorporates a real V5 once it is added. Rewrite the new domain, service and migration tests, and review the added PostServiceIntegrationTest scenario plus the scoped V4 migration target. Give each independent state promise a Korean sentence DisplayName, use real fixtures/repositories, compare source VO by value, verify business exceptions with enum messages, and preserve meaningful boundary/failure/ownership/update/persistence coverage. Separate Post, view-count and read-path promises; respect the user's current publication logic: ordinary posts retain trending registration, and THE Rilog posts omit it. No production behavior, frontend or unversioned skill-file changes. Validate the convention rewrite, run full H2/build and related MySQL including V4/V6 migrations, then perform a separate read-only review.


V6 and test-convention rewrite verified: full H2 (1,127 tests), related MySQL including V4/V6 Flyway migrations (138 tests), bootJar and git diff --check passed. Build resources contain V1–V4 and V6 with no stale or duplicate V5. All rewritten tests have Korean sentence DisplayNames ending in a period. Source/content VOs and Result records use value comparisons; business exceptions include enum messages. The duplicate THE Rilog scenario in PostServiceIntegrationTest was moved into named, independent tests in TheRilogPostIntegrationTest. A separate read-only review found no actionable issues. An initial Gradle test-report EOF error cleared on the diagnostic rerun; the fresh suites completed with zero failures/errors/skips. Frontend and unversioned skill files were not changed.

## Develop integration and migration test conflict

Merge origin/develop at 869b1cb9 into this feature branch. Upstream d18bc43b deliberately commented out PostViewMigrationTest as unused; preserve that upstream state while retaining the V4 target inside its commented migration configuration. This is the only conflicted file. Keep upstream notification V5 unchanged and THE Rilog extension at V6. Update the current ADR to reflect the actual V5/V6 order. Full H2 (1,177 tests), related MySQL including the V5-to-V6 migration (137 tests), bootJar and git diff --check passed after integration. The MySQL count excludes upstream's commented-out PostViewMigrationTest. Frontend and workflow files match origin/develop exactly; no custom frontend edits or frontend checks were made in this backend conflict-resolution task. Unversioned skill and unrelated document files remain outside the merge commit.
