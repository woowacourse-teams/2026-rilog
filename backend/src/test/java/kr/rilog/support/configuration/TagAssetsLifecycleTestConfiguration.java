package kr.rilog.support.configuration;

import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.service.TagAssetsLifecycle;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration(proxyBeanMethods = false)
public class TagAssetsLifecycleTestConfiguration {

    @Bean
    @Primary
    public TagAssetsLifecycle tagAssetsLifecycle() {
        return new TagAssetsLifecycle() {
            @Override
            public void attach(TagAssets assets) {
            }

            @Override
            public void synchronize(TagAssets previous, TagAssets current) {
            }

            @Override
            public void detach(TagAssets assets) {
            }
        };
    }

}
