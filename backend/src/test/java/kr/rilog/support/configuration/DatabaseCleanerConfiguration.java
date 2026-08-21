package kr.rilog.support.configuration;

import jakarta.persistence.EntityManagerFactory;
import kr.rilog.support.DatabaseCleaner;
import org.hibernate.boot.model.naming.PhysicalNamingStrategy;
import org.hibernate.boot.model.naming.PhysicalNamingStrategySnakeCaseImpl;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

@TestConfiguration(proxyBeanMethods = false)
public class DatabaseCleanerConfiguration {

    @Bean
    public DatabaseCleaner databaseCleaner(
            EntityManagerFactory entityManagerFactory,
            JdbcTemplate jdbcTemplate,
            ObjectProvider<PhysicalNamingStrategy> physicalNamingStrategy
    ) {
        return new DatabaseCleaner(
                jdbcTemplate,
                entityManagerFactory,
                physicalNamingStrategy.getIfAvailable(PhysicalNamingStrategySnakeCaseImpl::new));
    }

}
