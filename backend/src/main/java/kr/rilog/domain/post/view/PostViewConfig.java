package kr.rilog.domain.post.view;

import kr.rilog.domain.post.repository.PostViewCountRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class PostViewConfig {

    @Bean
    public ElapsedTimeSource postViewElapsedTimeSource() {
        return System::nanoTime;
    }

    @Bean
    public PostViewCounterRegistry postViewCounterRegistry(PostViewCountRepository repository,
                                                         PostViewProperties properties,
                                                         ElapsedTimeSource timeSource,
                                                         Clock clock) {
        return new PostViewCounterRegistry(
                postId -> repository.findViewCountByPostId(postId)
                        .orElseThrow(() -> new IllegalStateException("게시글 조회수 누계가 없습니다. postId=" + postId)),
                properties,
                timeSource,
                clock
        );
    }
}
