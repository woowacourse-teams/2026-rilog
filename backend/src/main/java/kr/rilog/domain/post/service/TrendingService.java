package kr.rilog.domain.post.service;

import kr.rilog.domain.post.repository.TrendingPostQueryRepository;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import kr.rilog.domain.post.service.dto.command.FullFeedSearchCommand;
import kr.rilog.domain.post.service.dto.result.FullFeedPostResult;
import kr.rilog.domain.post.trending.TrendingProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class TrendingService {

    private final TrendingPostQueryRepository trendingPostQueryRepository;
    private final TrendingProperties properties;
    private final Clock clock;

    public FullFeedPostResult readTrendingPostList(FullFeedSearchCommand command) {
        PageRequest pageable = PageRequest.of(command.page(), command.size());
        LocalDateTime now = LocalDateTime.ofInstant(clock.instant(), properties.postTimeZone());
        Slice<PostFullFeedRow> posts = trendingPostQueryRepository.findTrendingPosts(
                PUBLISHED,
                PUBLIC,
                command.category(),
                command.blogType(),
                now.minusMonths(2),
                now,
                pageable
        );

        return FullFeedPostResult.from(posts);
    }
}
