package kr.rilog.support.strategy;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

public class H2CleanStrategy implements CleanStrategy {

    @Override
    public boolean supports(String databaseProductName) {
        return "H2".equalsIgnoreCase(databaseProductName);
    }

    @Override
    public void clean(Connection connection, List<String> tableNames) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("SET REFERENTIAL_INTEGRITY FALSE");
            try {
                for (String tableName : tableNames) {
                    statement.execute("TRUNCATE TABLE \"%s\" RESTART IDENTITY".formatted(tableName));
                }
            } finally {
                statement.execute("SET REFERENTIAL_INTEGRITY TRUE");
            }
        }
    }

}
