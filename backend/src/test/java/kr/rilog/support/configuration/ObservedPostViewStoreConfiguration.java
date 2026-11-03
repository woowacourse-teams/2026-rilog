package kr.rilog.support.configuration;

import kr.rilog.domain.post.view.PostViewCounterRegistry;
import kr.rilog.support.testdouble.ObservedPostViewStore;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration(proxyBeanMethods = false)
public class ObservedPostViewStoreConfiguration {

    @Bean
    @Primary
    public ObservedPostViewStore observedPostViewStore(PostViewCounterRegistry registry) {
        return new ObservedPostViewStore(registry);
    }

}
