package kr.rilog.support.configuration;

import jakarta.persistence.EntityManagerFactory;
import kr.rilog.support.DatabaseCleaner;
import kr.rilog.support.strategy.CleanStrategy;
import kr.rilog.support.strategy.H2CleanStrategy;
import kr.rilog.support.strategy.MySqlCleanStrategy;
import org.hibernate.boot.model.naming.PhysicalNamingStrategy;
import org.hibernate.boot.model.naming.PhysicalNamingStrategySnakeCaseImpl;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;

@TestConfiguration(proxyBeanMethods = false)
public class DatabaseCleanerConfiguration {

    @Bean
    public DatabaseCleaner databaseCleaner(
            EntityManagerFactory entityManagerFactory,
            JdbcTemplate jdbcTemplate,
            ObjectProvider<PhysicalNamingStrategy> physicalNamingStrategy,
            CleanStrategy cleanStrategy
    ) {
        return new DatabaseCleaner(
                jdbcTemplate,
                entityManagerFactory,
                physicalNamingStrategy.getIfAvailable(PhysicalNamingStrategySnakeCaseImpl::new),
                cleanStrategy);
    }

    @Bean
    @Profile("test")
    public CleanStrategy h2CleanStrategy() {
        return new H2CleanStrategy();
    }

    @Bean
    @Profile("mysql-test")
    public CleanStrategy mySqlCleanStrategy() {
        return new MySqlCleanStrategy();
    }

}
