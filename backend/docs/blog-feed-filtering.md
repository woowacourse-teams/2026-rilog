| Header | `Authorization` | X | `Bearer {accessToken}` | Private 글 포함 여부를 판단할 요청자 식별 |

`category`, `chapterId`, `targetCologSlug`가 모두 없으면 일반 조회로 처리한다.

## 4. 모든 조회에 공통으로 적용되는 조건

블로그 유형이나 필터와 관계없이 다음 조건을 먼저 만족해야 한다.

1. 게시글 상태가 `PUBLISHED`여야 한다.
2. 게시글이 삭제되지 않아야 한다. 즉, `deletedAt IS NULL`이어야 한다.
3. 공개범위는 다음 중 하나를 만족해야 한다.
    - 게시글이 `PUBLIC`이다.
    - 게시글 작성자 ID와 요청자 ID가 같다.
4. 결과는 `publishedAt DESC`, `postId DESC` 순서로 정렬한다.
5. 정렬된 결과에 `page`, `size` 기반 Slice 페이지네이션을 적용한다.

Private 글의 포함 여부는 블로그의 OWNER 또는 Colog 관리 권한이 아니라 **게시글 작성자 ID와 요청자 ID가 같은지**로 판단한다.

## 5. 일반 조회

### 5.1 Colog 조회

조회 조건은 다음과 같다.

```text
post.colog.id = 조회 Colog ID
AND post.status = PUBLISHED
AND post.deletedAt IS NULL
AND (post.visibility = PUBLIC OR post.user.id = 요청자 ID)
```

따라서 결과는 다음과 같다.

| 요청자 | 포함되는 글 | 제외되는 글 |
| --- | --- | --- |
| 비로그인 | 해당 Colog의 Public 글 | 모든 Private 글 |
| 로그인 | 해당 Colog의 Public 글 + 요청자 본인이 해당 Colog에 발행한 Private 글 | 다른 사용자의 Private 글 |

요청자가 Colog OWNER 또는 ADMIN이어도 다른 작성자의 Private 글은 볼 수 없다.

### 5.2 Rilog 조회

조회 조건은 다음과 같다.

```text
post.rilog.id = 조회 Rilog ID
AND post.status = PUBLISHED
AND post.deletedAt IS NULL
AND (post.visibility = PUBLIC OR post.user.id = 요청자 ID)
```

게시글의 `rilog` 관계는 Colog에 발행한 뒤에도 작성자의 Rilog를 가리키므로 다음 글을 함께 조회한다.

- Rilog 소유자가 자신의 Rilog에 발행한 글
- Rilog 소유자가 Colog에 발행한 글

따라서 결과는 다음과 같다.

| 요청자 | 포함되는 글 | 제외되는 글 |
| --- | --- | --- |
| 비로그인 | Rilog 소유자가 Rilog 또는 Colog에 발행한 Public 글 | 모든 Private 글 |
| Rilog 소유자 본인 | 본인이 Rilog 또는 Colog에 발행한 Public 글과 Private 글 | 삭제된 글과 Draft |
| 다른 로그인 사용자 | Rilog 소유자가 Rilog 또는 Colog에 발행한 Public 글 | Rilog 소유자의 Private 글 |

## 6. 카테고리 필터

`category`가 있으면 일반 조회 조건에 다음 조건을 추가한다.

```text
post.category = category
```

- Rilog와 Colog 모두 사용할 수 있다.
- 허용 값은 `TECH`, `DAILY`이다.
- `chapterId`와 함께 사용할 수 있다.
- Rilog의 `targetCologSlug`와 함께 사용할 수 있다.
- 카테고리 필터를 사용해도 Public·Private 공개범위 규칙은 바뀌지 않는다.

## 7. 챕터 필터

`chapterId`가 있으면 일반 조회 조건에 다음 조건을 추가한다.

```text
post.chapter.id = chapterId
AND post.chapter.blog.id = 조회 블로그 ID
```

두 번째 조건은 다른 블로그의 챕터 ID로 게시글을 우회 조회하지 못하도록 조회 블로그 소속을 제한한다.

### 7.1 Colog의 챕터 필터

- 해당 Colog에 발행된 글 중 지정 챕터에 속한 글만 반환한다.
- Public 글과 요청자 본인의 Private 글을 포함한다.
- 다른 사용자의 Private 글은 반환하지 않는다.

### 7.2 Rilog의 챕터 필터

- 해당 Rilog에 속한 챕터의 글만 반환한다.
- Rilog에 속한 챕터는 Rilog 발행 글에 연결되므로, 결과적으로 해당 Rilog에 직접 발행한 글을 조회한다.
- Colog에 발행한 글의 챕터는 해당 Colog 소속이므로 Rilog 챕터 필터 결과에 포함되지 않는다.

### 7.3 존재하지 않거나 다른 블로그에 속한 챕터

현재 구현은 챕터를 별도로 조회해 예외를 발생시키지 않는다. 다음 경우에는 조건에 맞는 게시글이 없어 빈 목록을 반환한다.

- 존재하지 않는 `chapterId`
- 삭제된 뒤 게시글과 연결이 해제된 챕터
- 조회 블로그가 아닌 다른 블로그에 속한 챕터

## 8. Rilog의 대상 Colog 필터

`targetCologSlug`는 특정 Rilog 소유자가 특정 Colog에 발행한 글만 조회할 때 사용한다.

```text
post.rilog.id = 조회 Rilog ID
AND post.colog.id = 대상 Colog ID
```

처리 순서는 다음과 같다.

1. `{slug}`로 조회한 블로그가 Rilog인지 확인한다.
2. `targetCologSlug`가 삭제되지 않은 Colog를 가리키는지 확인한다.
3. Rilog 작성 글 중 해당 Colog에 발행한 글만 조회한다.
4. 공통 Public·Private 공개범위 조건을 적용한다.
5. `category`가 있으면 카테고리 조건을 추가한다.

허용되는 추가 필터는 `category`뿐이다. `chapterId`와는 함께 사용할 수 없다.

현재 구현은 게시글의 Rilog·Colog 관계를 기준으로 조회하며, 작성자의 **현재 Colog 멤버십 상태는 조회 조건에 포함하지 않는다**. 따라서 작성자가 Colog를 탈퇴했더라도 게시글이 삭제되지 않고 해당 Colog와 연결되어 있다면 결과에 포함될 수 있다.

## 9. 필터 조합표

| 조회 블로그 | `category` | `chapterId` | `targetCologSlug` | 결과 |
| --- | --- | --- | --- | --- |
| Rilog | X | X | X | 일반 Rilog 조회 |
| Rilog | O | X | X | 카테고리 필터 |
| Rilog | X | O | X | Rilog 챕터 필터 |
| Rilog | O | O | X | 카테고리 + Rilog 챕터 필터 |
| Rilog | X | X | O | 특정 Colog 발행 글 필터 |
| Rilog | O | X | O | 특정 Colog 발행 글 + 카테고리 필터 |
| Rilog | X 또는 O | O | O | 허용하지 않음 |
| Colog | X | X | X | 일반 Colog 조회 |
| Colog | O | X | X | 카테고리 필터 |
| Colog | X | O | X | Colog 챕터 필터 |
| Colog | O | O | X | 카테고리 + Colog 챕터 필터 |
| Colog | X 또는 O | X 또는 O | O | 허용하지 않음 |

## 10. 예외 정책

| 상황 | HTTP 상태 | 오류 코드 | 설명 |
| --- | --- | --- | --- |
| 유효한 형식의 조회 블로그 slug가 존재하지 않거나 삭제됨 | `404 Not Found` | `BLOG_NOT_FOUND` | 조회 블로그를 찾을 수 없음 |
| `targetCologSlug`가 존재하지 않거나 삭제됨 | `404 Not Found` | `BLOG_NOT_FOUND` | 대상 Colog를 찾을 수 없음 |
| `targetCologSlug`가 Rilog를 가리킴 | `404 Not Found` | `BLOG_NOT_FOUND` | 대상은 Colog여야 함 |
| Colog 조회에 `targetCologSlug` 사용 | `400 Bad Request` | `INVALID_BLOG_FEED_FILTER` | 대상 Colog 필터는 Rilog에서만 허용 |
| `chapterId`와 `targetCologSlug` 동시 사용 | `400 Bad Request` | `INVALID_BLOG_FEED_FILTER` | 대상 Colog 필터에는 챕터를 추가할 수 없음 |

## 11. 요청 예시

### 11.1 비로그인 일반 조회

```http
GET /v1/blogs/rilog-user/posts?page=0&size=12
```

Public 글만 반환한다.

### 11.2 본인 Rilog 조회

```http
GET /v1/blogs/rilog-user/posts?page=0&size=12
Authorization: Bearer {accessToken}
```

토큰 사용자가 `rilog-user`의 작성자라면 Rilog와 Colog에 발행한 본인의 Public·Private 글을 반환한다.

### 11.3 카테고리 조회

```http
GET /v1/blogs/rilog-user/posts?page=0&size=12&category=TECH
```

### 11.4 챕터 조회

```http
GET /v1/blogs/rilog-user/posts?page=0&size=12&chapterId=10
```

### 11.5 특정 Colog 발행 글 조회

```http
GET /v1/blogs/rilog-user/posts?page=0&size=12&targetCologSlug=rilog-team
```

### 11.6 특정 Colog 발행 글에 카테고리 추가

```http
GET /v1/blogs/rilog-user/posts?page=0&size=12&targetCologSlug=rilog-team&category=DAILY
```

### 11.7 허용하지 않는 조합

```http
GET /v1/blogs/rilog-user/posts?page=0&size=12&targetCologSlug=rilog-team&chapterId=10
```

`400 Bad Request`, `INVALID_BLOG_FEED_FILTER`를 반환한다.

## 12. 구현 및 검증 위치

- HTTP 파라미터와 선택적 인증: `backend/src/main/java/kr/rilog/domain/post/controller/FeedController.java`
- 필터 조합 검증과 대상 Colog 조회: `backend/src/main/java/kr/rilog/domain/post/service/FeedService.java`
- Rilog·Colog 조회 조건: `backend/src/main/java/kr/rilog/domain/post/repository/PostFeedQueryRepository.java`
- 필터 Command: `backend/src/main/java/kr/rilog/domain/post/service/dto/command/BlogFeedSearchCommand.java`
- 통합 테스트: `backend/src/test/java/kr/rilog/domain/post/service/FeedServiceIntegrationTest.java`
- Controller 테스트: `backend/src/test/java/kr/rilog/domain/post/controller/FeedControllerTest.java`
