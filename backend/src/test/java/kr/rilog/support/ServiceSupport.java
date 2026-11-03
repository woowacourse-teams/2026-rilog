package kr.rilog.support;

import com.github.benmanes.caffeine.cache.Cache;
import kr.rilog.domain.post.service.PostCountCache;
import kr.rilog.domain.post.view.PostViewCounterRegistry;
import kr.rilog.domain.upload.service.S3TagAssetsLifecycle;
import kr.rilog.support.configuration.DatabaseCleanerConfiguration;
import kr.rilog.support.configuration.MySqlTestContainerConfiguration;
import kr.rilog.support.configuration.TagAssetsLifecycleTestConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.util.Map;
import java.util.Objects;

@Import({
        DatabaseCleanerConfiguration.class,
        MySqlTestContainerConfiguration.class,
        TagAssetsLifecycleTestConfiguration.class
})
@ActiveProfiles(resolver = TestDatabaseProfileResolver.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
public abstract class ServiceSupport {

    @Autowired
    private DatabaseCleaner dataCleaner;

    @Autowired
    private PostViewCounterRegistry postViewCounterRegistry;

    @Autowired
    private PostCountCache postCountCache;

    @MockitoBean
    protected S3Presigner s3Presigner;

    @MockitoBean
    protected S3TagAssetsLifecycle lifecycle;

    @BeforeEach
    void cleanState() {
        dataCleaner.clean();
        // DB의 ID가 재사용되므로 메모리 Counter도 같은 테스트 경계에서 초기화한다.
        Map<?, ?> counters = (Map<?, ?>) Objects.requireNonNull(
                ReflectionTestUtils.getField(postViewCounterRegistry, "counters"),
                "조회수 테스트의 Counter 저장소를 찾을 수 없습니다."
        );
        counters.clear();
        Cache<?, ?> counts = (Cache<?, ?>) Objects.requireNonNull(
                ReflectionTestUtils.getField(postCountCache, "cache"),
                "전체 글 수 테스트의 캐시를 찾을 수 없습니다."
        );
        counts.invalidateAll();
    }

}
