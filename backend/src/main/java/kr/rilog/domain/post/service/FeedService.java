package kr.rilog.domain.post.service;

import kr.rilog.domain.post.controller.dto.response.FullFeedPostResponse;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.repository.PostFeedQueryRepository;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FeedService {

    private final PostFeedQueryRepository postFeedQueryRepository;

    /** 1차 MVP 전체 피드 조회 정책 - 게시됨 + 공개 */
    public FullFeedPostResponse getFullFeedPostList(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);

        Slice<PostFullFeedRow> feed = postFeedQueryRepository.findFullFeed(
                PostStatus.PUBLISHED,
                PostVisibility.PUBLIC,
                pageable
        );

        return FullFeedPostResponse.from(feed);
    }

}
