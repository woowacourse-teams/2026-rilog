package kr.rilog.domain.post.trending;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.ZoneId;

@ConfigurationProperties(prefix = "post.trending")
public record TrendingProperties(@DefaultValue("7") double halfLifeDays, ZoneId postTimeZone) {

    public TrendingProperties {
        if (!Double.isFinite(halfLifeDays) || halfLifeDays <= 0) {
            throw new IllegalArgumentException("트렌딩 감쇠 기준 일수는 양수여야 합니다.");
        }
        // STANDARD 게시글의 LocalDateTime.now() 저장 기준과 맞춘다.
        if (postTimeZone == null) postTimeZone = ZoneId.systemDefault();
    }
}
