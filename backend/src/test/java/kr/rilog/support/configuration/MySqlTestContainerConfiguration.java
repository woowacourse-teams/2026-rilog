package kr.rilog.support.configuration;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;
import org.testcontainers.mysql.MySQLContainer;

@Profile("mysql-test")
@TestConfiguration(proxyBeanMethods = false)
public class MySqlTestContainerConfiguration {

    private static final String MYSQL_IMAGE = "mysql:8.4.6";

    @Bean
    @ServiceConnection
    public MySQLContainer mysqlContainer() {
        return new MySQLContainer(MYSQL_IMAGE)
                .withDatabaseName("rilog");
    }

}
