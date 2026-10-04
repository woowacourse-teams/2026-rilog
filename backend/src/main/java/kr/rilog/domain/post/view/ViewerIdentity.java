package kr.rilog.domain.post.view;

import java.util.UUID;
import java.util.Objects;

public sealed interface ViewerIdentity permits ViewerIdentity.Member, ViewerIdentity.Anonymous {

    static ViewerIdentity member(long id) {
        return new Member(id);
    }

    static ViewerIdentity anonymous(UUID id) {
        return new Anonymous(id);
    }

    record Member(long id) implements ViewerIdentity {
        public Member {
            if (id <= 0) {
                throw new IllegalArgumentException("회원 ID는 양수여야 합니다.");
            }
        }
    }

    record Anonymous(UUID id) implements ViewerIdentity {
        public Anonymous {
            Objects.requireNonNull(id, "익명 방문자 UUID가 필요합니다.");
        }
    }
}
