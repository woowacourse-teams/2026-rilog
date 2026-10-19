package kr.rilog.support;

import kr.rilog.domain.post.view.PostViewCounterRegistry;
import kr.rilog.support.configuration.DatabaseCleanerConfiguration;
import kr.rilog.support.configuration.MySqlTestContainerConfiguration;
import kr.rilog.support.configuration.TagAssetsLifecycleTestConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;

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

    @BeforeEach
    void cleanState() {
        dataCleaner.clean();
        // DB의 ID가 재사용되므로 메모리 Counter도 같은 테스트 경계에서 초기화한다.
        Map<?, ?> counters = (Map<?, ?>) Objects.requireNonNull(
                ReflectionTestUtils.getField(postViewCounterRegistry, "counters"),
                "조회수 테스트의 Counter 저장소를 찾을 수 없습니다."
        );
        counters.clear();
    }

}
