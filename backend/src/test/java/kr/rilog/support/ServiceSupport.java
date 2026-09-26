package kr.rilog.support;

import kr.rilog.support.configuration.DatabaseCleanerConfiguration;
import kr.rilog.support.configuration.MySqlTestContainerConfiguration;
import kr.rilog.support.configuration.TagAssetsLifecycleTestConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

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

    @BeforeEach
    void cleanDatabase() {
        dataCleaner.clean();
    }

}
