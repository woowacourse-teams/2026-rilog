# 0010: THE Rilog 게시글 모델

- 상태: 구현
- 이슈: #717

THE Rilog는 별도 게시글 테이블 없이 기존 Post에 저장한다. `postType`은 STANDARD, DAILY_HEADLINES, ENTERPRISE_SPOTLIGHT, PERSONAL_SPOTLIGHT로 구분한다. 기존 글과 초안은 STANDARD이며, V6 migration은 기존 모든 행에 STANDARD 기본값을 적용한다.

편집 글의 실제 작성자는 `the_rilog` RILOG 소유자다. 기업 출처도 Colog 또는 외부 User를 만들지 않는다. 스포트라이트의 description과 출처 프로필 이름·이미지를 Post에 저장한다. PostSource는 Blog.profile처럼 `entity/vo`의 `@Embeddable` 값 객체이며 Post의 `@Embedded source`로 관리한다. 별도 ID·Post 역참조·출처 테이블 없이 post의 source_profile_name·source_profile_image 컬럼을 사용한다. 일반 글과 뉴스는 두 컬럼이 null이다. 스포트라이트 출처 이름의 필수 검증은 생성 메타데이터에서 유지하며 이미지가 없는 경우 null을 허용한다. 원문·홈페이지 링크는 본문에 포함하며 프로필 메타데이터에는 저장하지 않는다. 외부 프로필 이미지는 기존 업로드 자산 생명주기에 등록하지 않는다.

생성 시 `PostService.getTheRilogChapter()`가 뉴스에 `headlines`, 스포트라이트에 `spotlights`를 결정해 이 블로그의 기존 챕터를 조회하고 연결한다. 이 이름 매핑은 서비스 한 곳에서 관리한다. `PostType`은 유형 정의와 분류만 담당하며, Post 생성 검증은 전달된 챕터의 존재·삭제 여부·블로그 소속만 확인한다. 계정·챕터는 사전에 설정하며 발행 중 자동 생성하지 않는다. 카테고리는 기존 TECH, DAILY, RETROSPECT를 사용한다. Post에서 생성 시 검증하는 제목/설명 제한은 공백을 포함한 Unicode 코드 포인트 기준으로 스포트라이트 제목 20자, 설명 100자다. 뉴스 기사 제목의 40자 제한은 후속 AI 결과 처리 단계에서 기사 데이터 자체를 대상으로 검증한다. Post는 본문의 H1/H2 등 헤딩 레벨로 기사 제목을 판별하거나 길이를 검증하지 않는다. 뉴스 포스트 자체의 제목은 기존 512자 제한을 따른다. 뉴스 8개/스포트라이트 5개 및 승인·예약 규칙은 후속 편집 작업 파이프라인의 책임이다.

공개 발행 REST 요청은 계속 STANDARD만 생성한다. 승인된 편집 글은 내부 `PostService.publishTheRilog`에서 생성하고, 일반 발행과 동일한 저장·조회수 초기화·본문/썸네일 자산 연결을 사용한다. 이 메서드를 호출하는 승인·예약 worker는 후속 이슈다.

더 리로그 수정은 기존 `PostService.update` → `Post.update`를 사용하며 별도의 수정 API나 전용 update 메서드를 만들지 않는다. 기존 수정 요청은 편집 유형·설명·출처를 변경하지 않는다. 수정 시 PostType 전용 분기를 두지 않고 일반 글과 동일한 작성자·멤버 권한, 대상 블로그 및 챕터 소속 규칙을 적용한다. 챕터를 생략하면 미분류로 변경하고, 기존 권한이 허용하는 Colog 이동과 챕터 변경도 허용한다. 더 리로그의 스포트라이트 제목·고정 챕터 검증은 생성 시에만 적용한다. 수정 요청의 제목은 기존 최대 512자 제한을 따른다. 기존 상세/수정 REST 응답 계약과 프론트엔드는 이 이슈에서 변경하지 않는다. THE Rilog 메인 조회와 메타데이터 응답 확장은 후속 이슈에서 추가한다.

운영 준비: 편집 계정의 슬러그를 `the_rilog`로 설정한 후 해당 계정의 RILOG에 `headlines`, `spotlights` 챕터를 생성한다. migration은 실제 계정이나 챕터를 생성하지 않는다. 기존 챕터 삭제/이름 변경 기능을 운영자가 사용하면 편집 발행은 지정된 챕터가 복구될 때까지 실패할 수 있다.

검증: 도메인 제한/소유권/수정 보존 테스트, H2 서비스 및 embedded source 저장·재조회 테스트, MySQL V6 migration 테스트와 기존 백엔드 회귀 테스트.

코드 네이밍은 클래스의 `TheRilog`, 메서드의 `theRilog`, 상수·오류 코드의 `THE_RILOG`, 실제 슬러그의 `the_rilog`로 통일한다. 내부 발행 진입점은 `PostService.publishTheRilog`다.

PostType의 DB 타입과 Lombok 기본값 표기는 기존 User 엔티티와 통일한다. Java에서는 `@Enumerated(STRING)`, `@Column`, `@Default`를 사용하며 VARCHAR용 JDBC override는 두지 않는다. 공유·운영 DB 적용 전인 이슈의 마이그레이션은 V6 하나로 정리하고 다른 작업의 V5 번호를 사용하지 않는다. 현재 브랜치의 선행 마이그레이션은 V1–V4이며, V5가 병합되면 V6보다 먼저 적용된다. V6에서 post_type을 native ENUM으로 생성하고 별도의 CHECK나 후속 변환 마이그레이션은 만들지 않는다. 기존 글은 STANDARD가 되며 DB 기본값도 STANDARD를 사용한다. 이후 PostType 값을 추가할 때는 기존 enum 컬럼과 마찬가지로 DB ENUM 값도 migration으로 추가해야 한다.

V6 마이그레이션과 enum 매핑은 H2 및 MySQL 테스트에서 검증한다.

후속 뉴스 생성 파이프라인은 AI의 기사별 `title`, `summary`, `originalUrl`을 구조화해 받는다. 기사 제목의 비어 있음·공백 포함 최대 40자와 요청된 토픽 수를 검증한 후 BlockNote로 변환한다. 헤딩 레벨은 콘텐츠 표현 설정을 따르며 검증 로직에 고정하지 않는다. 메인 화면의 `headlines`도 동일한 기사 데이터와 안정적인 blockId에서 생성하므로 H2 본문 탐색에 의존하지 않는다. 이 이슈에서는 해당 AI 파이프라인을 구현하지 않으며, 뉴스 기사 제목의 40자 검증은 현재 Post 계층에 없다. 기존 BlockNote 배열 형식 검증과 텍스트 직렬화·댓글 앵커·자산 추출 로직은 유지한다.
