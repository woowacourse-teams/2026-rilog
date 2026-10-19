package kr.rilog.domain.post.view;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

@ConfigurationProperties(prefix = "post.view.flush")
public record PostViewFlushProperties(@DefaultValue("true") boolean enabled,
                                      @DefaultValue("10m") Duration interval) {

    public PostViewFlushProperties {
        if (interval == null || interval.compareTo(Duration.ofMillis(1)) < 0) {
            throw new IllegalArgumentException("조회수 배치 저장 주기는 1밀리초 이상이어야 합니다.");
        }
    }
}
