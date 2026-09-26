package kr.rilog.support;

import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.Table;
import java.util.List;

import org.hibernate.boot.model.naming.Identifier;
import org.hibernate.boot.model.naming.PhysicalNamingStrategy;
import org.hibernate.engine.jdbc.env.spi.JdbcEnvironment;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ConnectionCallback;

import kr.rilog.support.strategy.CleanStrategy;

public class DatabaseCleaner {

    private final JdbcTemplate jdbcTemplate;
    private final EntityManagerFactory entityManagerFactory;
    private final PhysicalNamingStrategy physicalNamingStrategy;
    private final CleanStrategy cleanStrategy;

    private List<String> tableNames;

    public DatabaseCleaner(
            JdbcTemplate jdbcTemplate,
            EntityManagerFactory entityManagerFactory,
            PhysicalNamingStrategy physicalNamingStrategy,
            CleanStrategy cleanStrategy
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.entityManagerFactory = entityManagerFactory;
        this.physicalNamingStrategy = physicalNamingStrategy;
        this.cleanStrategy = cleanStrategy;
    }

    public void clean() {
        if (tableNames == null) {
            tableNames = collectTableNames();
        }

        jdbcTemplate.execute((ConnectionCallback<Void>) connection -> {
            String databaseProductName = connection.getMetaData().getDatabaseProductName();
            if (!cleanStrategy.supports(databaseProductName)) {
                throw new IllegalStateException(
                        "현재 데이터베이스를 지원하지 않는 정리 전략입니다: " + databaseProductName);
            }

            cleanStrategy.clean(connection, tableNames);
            return null;
        });
    }

    private List<String> collectTableNames() {
        JdbcEnvironment jdbcEnvironment = entityManagerFactory
                .unwrap(SessionFactoryImplementor.class)
                .getJdbcServices()
                .getJdbcEnvironment();

        List<String> names = entityManagerFactory.getMetamodel()
                .getEntities()
                .stream()
                .map(entity -> toPhysicalTableName(entity.getJavaType(), jdbcEnvironment))
                .distinct()
                .sorted()
                .toList();

        if (names.isEmpty()) {
            throw new IllegalStateException("정리할 JPA 테이블을 찾지 못했습니다.");
        }
        return names;
    }

    private String toPhysicalTableName(Class<?> entityType, JdbcEnvironment jdbcEnvironment) {
        Table table = entityType.getAnnotation(Table.class);

        if (table == null || table.name().isBlank()) {
            throw new IllegalStateException(
                    "서비스 통합 테스트 대상 엔티티는 명시적인 @Table 이름이 필요합니다: "
                            + entityType.getName());
        }

        return physicalNamingStrategy
                .toPhysicalTableName(Identifier.toIdentifier(table.name()), jdbcEnvironment)
                .getText();
    }

}
