package kr.rilog.domain.upload.listener;

import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.event.TagAssetsEvent;
import kr.rilog.domain.upload.service.S3TagAssetsLifecycle;
import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static java.util.concurrent.TimeUnit.MILLISECONDS;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class TagAssetsListenerIntegrationTest extends ServiceSupport {

    private static final long BEFORE_COMPLETION_OBSERVATION_MILLIS = 500;
    private static final long AFTER_COMMIT_TIMEOUT_SECONDS = 3;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockitoBean
    private S3TagAssetsLifecycle lifecycle;

    @Test
    @DisplayName("자산 연결 이벤트는 트랜잭션이 커밋된 후 S3 라이프사이클을 실행한다.")
    void executeAttachAfterCommit() {
        TagAssets assets = TagAssets.of("https://s3.example.com/added.png");
        CountDownLatch executed = new CountDownLatch(1);
        doAnswer(invocation -> {
            executed.countDown();
            return null;
        }).when(lifecycle).attach(assets);

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            eventPublisher.publishEvent(new TagAssetsEvent.Attach(assets));

            assertThat(await(executed, BEFORE_COMPLETION_OBSERVATION_MILLIS, MILLISECONDS)).isFalse();
            verifyNoInteractions(lifecycle);
        });

        assertThat(await(executed, AFTER_COMMIT_TIMEOUT_SECONDS, SECONDS)).isTrue();
        verify(lifecycle).attach(assets);
    }

    @Test
    @DisplayName("자산 연결 이벤트는 트랜잭션이 롤백되면 S3 라이프사이클을 실행하지 않는다.")
    void doNotExecuteAttachAfterRollback() {
        TagAssets assets = TagAssets.of("https://s3.example.com/added.png");
        CountDownLatch executed = new CountDownLatch(1);
        doAnswer(invocation -> {
            executed.countDown();
            return null;
        }).when(lifecycle).attach(assets);

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            eventPublisher.publishEvent(new TagAssetsEvent.Attach(assets));
            status.setRollbackOnly();
        });

        assertThat(await(executed, BEFORE_COMPLETION_OBSERVATION_MILLIS, MILLISECONDS)).isFalse();
        verifyNoInteractions(lifecycle);
    }

    @Test
    @DisplayName("자산 동기화 이벤트는 트랜잭션이 커밋된 후 S3 라이프사이클을 실행한다.")
    void executeSynchronizeAfterCommit() {
        TagAssets previous = TagAssets.of("https://s3.example.com/previous.png");
        TagAssets current = TagAssets.of("https://s3.example.com/current.png");
        CountDownLatch executed = new CountDownLatch(1);
        doAnswer(invocation -> {
            executed.countDown();
            return null;
        }).when(lifecycle).synchronize(previous, current);

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            eventPublisher.publishEvent(new TagAssetsEvent.Synchronize(previous, current));

            assertThat(await(executed, BEFORE_COMPLETION_OBSERVATION_MILLIS, MILLISECONDS)).isFalse();
            verifyNoInteractions(lifecycle);
        });

        assertThat(await(executed, AFTER_COMMIT_TIMEOUT_SECONDS, SECONDS)).isTrue();
        verify(lifecycle).synchronize(previous, current);
    }

    @Test
    @DisplayName("자산 동기화 이벤트는 트랜잭션이 롤백되면 S3 라이프사이클을 실행하지 않는다.")
    void doNotExecuteSynchronizeAfterRollback() {
        TagAssets previous = TagAssets.of("https://s3.example.com/previous.png");
        TagAssets current = TagAssets.of("https://s3.example.com/current.png");
        CountDownLatch executed = new CountDownLatch(1);
        doAnswer(invocation -> {
            executed.countDown();
            return null;
        }).when(lifecycle).synchronize(previous, current);

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            eventPublisher.publishEvent(new TagAssetsEvent.Synchronize(previous, current));
            status.setRollbackOnly();
        });

        assertThat(await(executed, BEFORE_COMPLETION_OBSERVATION_MILLIS, MILLISECONDS)).isFalse();
        verifyNoInteractions(lifecycle);
    }

    @Test
    @DisplayName("자산 분리 이벤트는 트랜잭션이 커밋된 후 S3 라이프사이클을 실행한다.")
    void executeDetachAfterCommit() {
        TagAssets assets = TagAssets.of("https://s3.example.com/removed.png");
        CountDownLatch executed = new CountDownLatch(1);
        doAnswer(invocation -> {
            executed.countDown();
            return null;
        }).when(lifecycle).detach(assets);

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            eventPublisher.publishEvent(new TagAssetsEvent.Detach(assets));

            assertThat(await(executed, BEFORE_COMPLETION_OBSERVATION_MILLIS, MILLISECONDS)).isFalse();
            verifyNoInteractions(lifecycle);
        });

        assertThat(await(executed, AFTER_COMMIT_TIMEOUT_SECONDS, SECONDS)).isTrue();
        verify(lifecycle).detach(assets);
    }

    @Test
    @DisplayName("자산 분리 이벤트는 트랜잭션이 롤백되면 S3 라이프사이클을 실행하지 않는다.")
    void doNotExecuteDetachAfterRollback() {
        TagAssets assets = TagAssets.of("https://s3.example.com/removed.png");
        CountDownLatch executed = new CountDownLatch(1);
        doAnswer(invocation -> {
            executed.countDown();
            return null;
        }).when(lifecycle).detach(assets);

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            eventPublisher.publishEvent(new TagAssetsEvent.Detach(assets));
            status.setRollbackOnly();
        });

        assertThat(await(executed, BEFORE_COMPLETION_OBSERVATION_MILLIS, MILLISECONDS)).isFalse();
        verifyNoInteractions(lifecycle);
    }

    private boolean await(CountDownLatch latch, long timeout, TimeUnit unit) {
        try {
            return latch.await(timeout, unit);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssertionError("이벤트 리스너 실행을 기다리는 중 인터럽트가 발생했습니다.", exception);
        }
    }

}
