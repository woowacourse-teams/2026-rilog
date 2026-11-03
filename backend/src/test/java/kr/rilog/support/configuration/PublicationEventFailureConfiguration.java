package kr.rilog.support.configuration;

import kr.rilog.support.testdouble.PublicationEventFailure;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

@TestConfiguration(proxyBeanMethods = false)
public class PublicationEventFailureConfiguration {

    @Bean
    public PublicationEventFailure publicationEventFailure() {
        return new PublicationEventFailure();
    }

}
