# BaseEntity 사용 가이드

`BaseEntity`는 도메인 Entity에서 공통으로 사용하는 생성·수정·삭제 일시를 관리한다.

## Entity에 적용하기

도메인 Entity가 `BaseEntity`를 상속하도록 작성한다.

```java
@Getter
@Entity
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseEntity {

    // ...

}
```

상속 구조에서 Lombok Builder를 사용하려면 하위 Entity에도 `@SuperBuilder`를 적용해야 한다.

## 제공 필드와 기능

| 필드 또는 메서드 | 설명 |
| --- | --- |
| `createdAt` | Entity가 처음 저장될 때 생성 일시를 자동으로 기록한다. |
| `updatedAt` | Entity가 생성되거나 수정될 때 수정 일시를 자동으로 갱신한다. |
| `deletedAt` | Soft Delete가 수행된 일시를 기록한다. 삭제되지 않은 상태에서는 `null`이다. |

생성·수정 일시는 JPA Auditing을 통해 관리되므로 도메인 Entity에서 직접 설정하지 않는다.
`delete()`는 데이터베이스에서 Entity를 직접 제거하지 않는다. 조회 시 삭제된 Entity를 제외해야 한다면 Repository 쿼리에서 `deletedAt`이 `null`인지 확인한다.
