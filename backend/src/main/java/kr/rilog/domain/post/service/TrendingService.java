package kr.rilog.domain.post.service;

import kr.rilog.domain.post.repository.HardTrendingQueryRepository;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import kr.rilog.domain.post.service.dto.command.FullFeedSearchCommand;
import kr.rilog.domain.post.service.dto.result.FullFeedPostResult;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.post.entity.enums.PostStatus.PUBLISHED;
import static kr.rilog.domain.post.entity.enums.PostVisibility.PUBLIC;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class TrendingService {

    private final HardTrendingQueryRepository hardTrendingQueryRepository;

    public FullFeedPostResult readTrendingPostList(FullFeedSearchCommand command) {
        PageRequest pageable = PageRequest.of(command.page(), command.size());
        Slice<PostFullFeedRow> posts = hardTrendingQueryRepository.findTrendingPosts(
                PUBLISHED,
                PUBLIC,
                command.category(),
                command.blogType(),
                pageable
        );

        return FullFeedPostResult.from(posts);
    }
}
