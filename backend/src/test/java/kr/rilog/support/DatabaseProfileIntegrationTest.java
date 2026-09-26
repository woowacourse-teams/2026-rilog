package kr.rilog.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import kr.rilog.support.strategy.CleanStrategy;
import kr.rilog.support.strategy.H2CleanStrategy;
import kr.rilog.support.strategy.MySqlCleanStrategy;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

class DatabaseProfileIntegrationTest extends ServiceSupport {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private CleanStrategy cleanStrategy;

    @Autowired
    private Environment environment;

    @Test
    void connectsToTheDatabaseAndSelectsTheCleanerForTheActiveProfile() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            String databaseProductName = connection.getMetaData().getDatabaseProductName();

            if (environment.acceptsProfiles(Profiles.of("mysql-test"))) {
                assertThat(databaseProductName).isEqualTo("MySQL");
                assertThat(cleanStrategy).isInstanceOf(MySqlCleanStrategy.class);
                return;
            }

            assertThat(environment.acceptsProfiles(Profiles.of("test"))).isTrue();
            assertThat(databaseProductName).isEqualTo("H2");
            assertThat(cleanStrategy).isInstanceOf(H2CleanStrategy.class);
        }
    }

}
