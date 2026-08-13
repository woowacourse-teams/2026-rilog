package kr.rilog.domain.auth.repository;

import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshSessionRepositoryTest {

    @Test
    @DisplayName("Refresh Token Rotation 조회는 비관적 쓰기 락을 사용한다")
    void findByTokenHashForUpdateUsesPessimisticWriteLock() throws NoSuchMethodException {
        // given
        Method method = RefreshSessionRepository.class.getMethod("findByTokenHashForUpdate", String.class);

        // when
        Lock lock = method.getAnnotation(Lock.class);

        // then
        assertThat(lock.value()).isEqualTo(LockModeType.PESSIMISTIC_WRITE);
    }
}
