package kr.rilog.support.configuration;

import kr.rilog.support.testdouble.MutableClock;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration(proxyBeanMethods = false)
public class MutableClockConfiguration {

    @Bean
    @Primary
    public MutableClock mutableClock() {
        return new MutableClock();
    }

}
