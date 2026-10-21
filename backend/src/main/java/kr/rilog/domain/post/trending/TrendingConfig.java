package kr.rilog.domain.post.trending;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@EnableConfigurationProperties(TrendingProperties.class)
public class TrendingConfig {

    @Bean
    public TrendingScorePolicy trendingScorePolicy(TrendingProperties properties) {
        return new LogDecayTrendingScorePolicy(properties.halfLifeDays());
    }
}
