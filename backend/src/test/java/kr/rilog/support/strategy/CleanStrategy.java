package kr.rilog.support.strategy;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

public interface CleanStrategy {

    boolean supports(String databaseProductName);

    void clean(Connection connection, List<String> tableNames) throws SQLException;

}
