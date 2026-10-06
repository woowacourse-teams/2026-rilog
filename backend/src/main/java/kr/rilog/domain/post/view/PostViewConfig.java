package kr.rilog.domain.post.view;

import kr.rilog.domain.post.repository.PostViewCountRepository;
import kr.rilog.global.exception.RilogInfrastructureException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_VIEW_COUNT_MISSING;

@Configuration
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
                                POST_VIEW_COUNT_MISSING, "게시글 조회수 누계가 없습니다. postId=" + postId, null)),
                timeSource,
                clock
        );
    }
}
