package kr.rilog.support.strategy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

class MySqlCleanStrategyTest {

    private final MySqlCleanStrategy strategy = new MySqlCleanStrategy();

    private Connection connection;
    private Statement statement;

    @BeforeEach
    void setUp() throws SQLException {
        connection = mock(Connection.class);
        statement = mock(Statement.class);
        when(connection.createStatement()).thenReturn(statement);
    }

    @Test
    void supportsMySql() {
        assertThat(strategy.supports("MySQL")).isTrue();
        assertThat(strategy.supports("H2")).isFalse();
    }

    @Test
    void truncatesTablesWithForeignKeyChecksDisabled() throws SQLException {
        strategy.clean(connection, List.of("users", "blog"));

        InOrder inOrder = inOrder(statement);
        inOrder.verify(statement).execute("SET FOREIGN_KEY_CHECKS = 0");
        inOrder.verify(statement).execute("TRUNCATE TABLE `users`");
        inOrder.verify(statement).execute("TRUNCATE TABLE `blog`");
        inOrder.verify(statement).execute("SET FOREIGN_KEY_CHECKS = 1");
    }

    @Test
    void restoresForeignKeyChecksWhenTruncationFails() throws SQLException {
        doThrow(new SQLException("truncate failed"))
                .when(statement)
                .execute("TRUNCATE TABLE `users`");

        assertThatThrownBy(() -> strategy.clean(connection, List.of("users")))
                .isInstanceOf(SQLException.class)
                .hasMessage("truncate failed");

        InOrder inOrder = inOrder(statement);
        inOrder.verify(statement).execute("SET FOREIGN_KEY_CHECKS = 0");
        inOrder.verify(statement).execute("TRUNCATE TABLE `users`");
        inOrder.verify(statement).execute("SET FOREIGN_KEY_CHECKS = 1");
    }

}
