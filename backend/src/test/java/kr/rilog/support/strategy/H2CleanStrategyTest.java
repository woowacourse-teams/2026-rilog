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

class H2CleanStrategyTest {

    private final H2CleanStrategy strategy = new H2CleanStrategy();

    private Connection connection;
    private Statement statement;

    @BeforeEach
    void setUp() throws SQLException {
        connection = mock(Connection.class);
        statement = mock(Statement.class);
        when(connection.createStatement()).thenReturn(statement);
    }

    @Test
    void supportsH2() {
        assertThat(strategy.supports("H2")).isTrue();
        assertThat(strategy.supports("MySQL")).isFalse();
    }

    @Test
    void truncatesTablesAndRestartsIdentityWithReferentialIntegrityDisabled() throws SQLException {
        strategy.clean(connection, List.of("users", "blog"));

        InOrder inOrder = inOrder(statement);
        inOrder.verify(statement).execute("SET REFERENTIAL_INTEGRITY FALSE");
        inOrder.verify(statement).execute("TRUNCATE TABLE \"users\" RESTART IDENTITY");
        inOrder.verify(statement).execute("TRUNCATE TABLE \"blog\" RESTART IDENTITY");
        inOrder.verify(statement).execute("SET REFERENTIAL_INTEGRITY TRUE");
    }

    @Test
    void restoresReferentialIntegrityWhenTruncationFails() throws SQLException {
        doThrow(new SQLException("truncate failed"))
                .when(statement)
                .execute("TRUNCATE TABLE \"users\" RESTART IDENTITY");

        assertThatThrownBy(() -> strategy.clean(connection, List.of("users")))
                .isInstanceOf(SQLException.class)
                .hasMessage("truncate failed");

        InOrder inOrder = inOrder(statement);
        inOrder.verify(statement).execute("SET REFERENTIAL_INTEGRITY FALSE");
        inOrder.verify(statement).execute("TRUNCATE TABLE \"users\" RESTART IDENTITY");
        inOrder.verify(statement).execute("SET REFERENTIAL_INTEGRITY TRUE");
    }

}
