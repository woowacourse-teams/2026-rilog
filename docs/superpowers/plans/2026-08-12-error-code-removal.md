# Error Code Removal Implementation Plan

**Status:** Implemented and verified on 2026-08-12 (`./gradlew clean test`, 54 tests)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공통 오류 응답과 enum에서 문자열 오류 코드를 완전히 제거한다.

**Architecture:** `ErrorInformation`은 HTTP 상태와 메시지만 제공한다. `ErrorDetail`도 같은 공개 계약만 직렬화하며, 서버 로그의 내부 분류에는 enum 이름을 사용한다.

**Tech Stack:** Java 21, Spring Boot 4.1, JUnit 5, MockMvc

## Global Constraints

- 기존 HTTP 상태와 오류 메시지를 유지한다.
- 인증 동작을 변경하지 않는다.
- 새 오류 코드나 대체 공개 식별자를 추가하지 않는다.

---

### Task 1: 오류 응답 계약 테스트 변경

**Files:**
- Modify: `backend/src/test/java/kr/rilog/global/exception/AuthExceptionTest.java`
- Modify: `backend/src/test/java/kr/rilog/global/auth/AuthMvcTest.java`
- Modify: `backend/src/test/java/kr/rilog/auth/presentation/AuthControllerMvcTest.java`

**Interfaces:**
- Consumes: `ErrorDetail` JSON
- Produces: `errorCode`가 없고 상태·메시지만 유지되는 테스트 계약

- [x] **Step 1: `errorCode` getter와 JSON 검증을 제거하고 응답 필드 부재를 검증한다.**
- [x] **Step 2: 관련 테스트를 실행해 현재 구현에서 실패하는지 확인한다.**

### Task 2: 오류 코드 모델과 응답 제거

**Files:**
- Modify: `backend/src/main/java/kr/rilog/global/exception/ErrorInformation.java`
- Modify: `backend/src/main/java/kr/rilog/global/exception/GlobalExceptionInformation.java`
- Modify: `backend/src/main/java/kr/rilog/global/exception/AuthErrorInformation.java`
- Modify: `backend/src/main/java/kr/rilog/global/exception/dto/ErrorDetail.java`
- Modify: `backend/src/main/java/kr/rilog/global/advice/GlobalExceptionHandler.java`

**Interfaces:**
- Consumes: `HttpStatus`, message
- Produces: `ErrorDetail(status, error, message, invalidParams)`

- [x] **Step 1: 인터페이스 getter와 enum 코드 필드를 제거한다.**
- [x] **Step 2: `ErrorDetail`의 공개 `errorCode` 필드를 제거한다.**
- [x] **Step 3: 로그 분류를 enum 이름으로 전환한다.**

### Task 3: 패키지 호환성과 전체 검증

**Files:**
- Modify: 오래된 `kr.rilog.domain.User`, `kr.rilog.domain.OnboardingStatus` import 사용 파일

**Interfaces:**
- Consumes: `kr.rilog.domain.user.entity.User`, `OnboardingStatus`
- Produces: 컴파일 가능한 현재 패키지 참조

- [x] **Step 1: 오래된 import를 현재 패키지로 변경한다.**
- [x] **Step 2: `rg`로 오류 코드와 오래된 import 잔존 여부를 검사한다.**
- [x] **Step 3: `./gradlew clean test`를 실행한다.**
