# 도메인 커스텀 예외 사용 가이드

이 문서는 도메인에서 발생한 비즈니스 예외를 일관된 API 오류 응답으로 변환하는 방법을 설명한다.

새 도메인에는 다음 두 타입을 기본으로 만든다.

- `<Domain>ErrorInformation`: 도메인에서 발생할 수 있는 오류를 정의하는 enum
- `<Domain>Exception`: 해당 도메인의 오류 정보를 전달하는 상위 예외

예를 들어 게시글 도메인은 `PostErrorInformation`과 `PostException`을 사용한다. 오류마다 예외 클래스를 새로 만들 필요는 없다.

## 전체 흐름

```text
PostService
  └─ throw new PostException(PostErrorInformation.POST_NOT_FOUND)
       └─ RilogBusinessException에 ErrorInformation 저장
            └─ GlobalExceptionHandler가 예외 처리
                 └─ ErrorDetail 형식의 HTTP 응답 반환
```

각 타입의 책임은 다음과 같다.

| 타입 | 책임 |
| --- | --- |
| `ErrorInformation` | 모든 오류 정보가 제공해야 하는 HTTP 상태, 오류 코드와 메시지 계약 |
| `PostErrorInformation` | 게시글 도메인의 오류 목록과 각 오류의 응답 정보 정의 |
| `RilogBusinessException` | 모든 비즈니스 예외가 전역 핸들러에 전달할 오류 정보 보관 |
| `PostException` | 게시글 도메인에서 발생한 비즈니스 예외임을 표현 |
| `GlobalExceptionHandler` | 비즈니스 예외를 공통 `ErrorDetail` 응답으로 변환 |

## 1. 도메인 오류 정보 정의

`ErrorInformation`을 구현하는 enum을 도메인마다 하나씩 만든다.

```java
package kr.rilog.domain.post.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum PostErrorInformation implements ErrorInformation {

    POST_NOT_FOUND(HttpStatus.NOT_FOUND, "POST_001", "게시글을 찾을 수 없습니다."),
    POST_ACCESS_DENIED(HttpStatus.FORBIDDEN, "POST_002", "게시글에 접근할 권한이 없습니다."),
    ;

    private final HttpStatus httpStatus;
    private final String errorCode;
    private final String message;
}
```

오류를 추가할 때는 다음 기준을 지킨다.

- 오류 코드는 다른 오류와 중복되지 않게 작성한다.
- 코드의 접두사로 소유 도메인을 식별할 수 있게 한다. 예: `POST_001`
- HTTP 상태는 클라이언트가 오류의 성격을 판단할 수 있게 선택한다.
- 메시지는 내부 구현이나 민감한 정보를 노출하지 않고 사용자가 이해할 수 있게 작성한다.
- 공통 요청 형식 오류는 `GlobalExceptionInformation`, 도메인 규칙 위반은 도메인별 enum에 둔다.

## 2. 도메인 상위 예외 정의

`RilogBusinessException`을 상속하는 예외를 도메인마다 하나씩 만든다.

```java
package kr.rilog.domain.post.exception;

import kr.rilog.global.exception.RilogBusinessException;

public class PostException extends RilogBusinessException {

    public PostException(PostErrorInformation errorInformation) {
        super(errorInformation);
    }
}
```

생성자 매개변수를 `ErrorInformation`이 아닌 `PostErrorInformation`으로 제한하면 다른 도메인의 오류 정보가 실수로 전달되는 것을 막을 수 있다.

## 3. 비즈니스 로직에서 사용

도메인 규칙을 만족하지 못하면 그 상황에 맞는 오류 정보를 도메인 예외에 담아 던진다.

```java
package kr.rilog.domain.post.service;

import kr.rilog.domain.post.exception.PostException;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;

public Post findPost(Long postId) {
    return postRepository.findById(postId)
            .orElseThrow(() -> new PostException(POST_NOT_FOUND));
}
```

`PostException`은 `RilogBusinessException`의 하위 타입이므로 별도의 전역 핸들러를 추가하지 않아도 된다. 기존 `GlobalExceptionHandler`가 내부의 `PostErrorInformation`을 읽어 HTTP 응답으로 변환한다.

예상 응답은 다음과 같다.

```json
{
  "status": 404,
  "error": "NOT_FOUND",
  "errorCode": "POST_001",
  "message": "게시글을 찾을 수 없습니다.",
  "invalidParams": null
}
```

## 새 도메인 추가 체크리스트

게시글이 아닌 다른 도메인도 같은 방식으로 추가한다.

```text
domain/<domain>/exception/
├─ <Domain>ErrorInformation.java
└─ <Domain>Exception.java
```

- [ ] `<Domain>ErrorInformation`이 `ErrorInformation`을 구현하는가?
- [ ] HTTP 상태, 고유 오류 코드와 외부 공개 메시지를 정의했는가?
- [ ] `<Domain>Exception`이 `RilogBusinessException`을 상속하는가?
- [ ] 도메인 예외 생성자가 해당 도메인의 오류 enum만 받는가?
- [ ] 비즈니스 로직에서 적절한 enum 항목을 담아 예외를 던지는가?
- [ ] 예외와 오류 응답을 검증하는 테스트를 추가했는가?
- [ ] 오류 코드나 응답 구조 변경이 프론트엔드에 미치는 영향을 공유했는가?

## 사용 시 주의사항

- 예상 가능한 비즈니스 규칙 위반에는 `IllegalArgumentException`이나 일반 `RuntimeException` 대신 도메인 예외를 사용한다.
- 오류별로 `PostNotFoundException`, `PostAccessDeniedException`과 같은 클래스를 반복해서 만들지 않는다. 오류의 종류는 `PostErrorInformation`이 담당한다.
- 데이터베이스나 외부 시스템의 원본 예외 메시지를 API 응답에 그대로 노출하지 않는다.
- 오류 코드, HTTP 상태 또는 응답 필드를 바꾸는 작업은 프론트엔드에도 영향을 주는 API 계약 변경으로 취급한다.
- 예상하지 못한 예외는 도메인 예외로 감싸 숨기지 않고 전역 핸들러의 알 수 없는 예외 처리와 오류 로그에 맡긴다.
