package kr.rilog.domain.post.view;

import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;
import java.util.Map;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_MISSING;

@Configuration
@EnableScheduling
@EnableConfigurationProperties({PostViewRegistrationProperties.class, PostViewFlushProperties.class})
public class PostViewConfig {

    @Bean
    public ElapsedTimeSource postViewElapsedTimeSource() {
        return System::nanoTime;
    }

    @Bean
    public PostViewCounterRegistry postViewCounterRegistry(PostViewCountRepository repository,
                                                         ElapsedTimeSource timeSource,
                                                         Clock clock) {
        return new PostViewCounterRegistry(
                postId -> repository.findViewCountByPostId(postId)
                        .orElseThrow(() -> new RilogInfrastructureException(
                                POST_VIEW_COUNT_MISSING, POST_VIEW_COUNT_MISSING.getMessage(), null,
                                Map.of("postId", postId))),
                timeSource,
                clock,
                CaffeineViewerRecordStore::new
        );
    }
}
