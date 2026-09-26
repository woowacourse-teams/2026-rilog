package kr.rilog.support.strategy;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

public class MySqlCleanStrategy implements CleanStrategy {

    @Override
    public boolean supports(String databaseProductName) {
        return "MySQL".equalsIgnoreCase(databaseProductName);
    }

    @Override
    public void clean(Connection connection, List<String> tableNames) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("SET FOREIGN_KEY_CHECKS = 0");
            try {
                for (String tableName : tableNames) {
                    statement.execute("TRUNCATE TABLE `%s`".formatted(tableName));
                }
            } finally {
                statement.execute("SET FOREIGN_KEY_CHECKS = 1");
            }
        }
    }

}
