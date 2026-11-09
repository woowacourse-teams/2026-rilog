package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse.ViewerPermissionsResponse;
import kr.rilog.domain.post.controller.dto.response.TotalPostsCountResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.view.PostViewStore;
import kr.rilog.domain.blog.entity.vo.Slug;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PostQueryService {

    private final PostRepository postRepository;
    private final BlogMemberRepository blogMemberRepository;
    private final PostViewStore postViewStore;
    private final PostCountCache postCountCache;

    public PostDetailResponse readPostDetailByCanonicalPath(String slug, Long postId, Long requesterId) {
        Post post = getPost(slug, postId);
        post.validateReadableBy(requesterId);
        ViewerPermissionsResponse viewerPermissions = viewerPermissionsFor(post, requesterId);

        return toPostDetailResponse(post, viewerPermissions);
    }

    public PostDetailResponse readEditablePostDetail(Long postId, Long requesterId) {
        Post post = getPublishedPost(postId);
        post.validateWrittenBy(requesterId);
        ViewerPermissionsResponse viewerPermissions = viewerPermissionsFor(post, requesterId);

        return toPostDetailResponse(post, viewerPermissions);
    }

    private PostDetailResponse toPostDetailResponse(
            Post post,
            ViewerPermissionsResponse viewerPermissions
    ) {
        Long viewCount = viewerPermissions.canDelete() ? postViewStore.currentCount(post.getId()) : null;
        if (!post.isCologAffiliated()) {
            return PostDetailResponse.fromRilog(post, viewerPermissions, viewCount);
        }

        return PostDetailResponse.fromColog(post, viewerPermissions, viewCount);
    }

    public TotalPostsCountResponse readPostsCount() {
        return new TotalPostsCountResponse(postCountCache.getCount());
    }

    private Post getPost(String slug, Long postId) {
        return postRepository.findDetailByCanonicalPath(Slug.from(slug), postId)
                .orElseThrow(() -> new PostException(POST_NOT_FOUND));
    }

    private Post getPublishedPost(Long postId) {
        return postRepository.findDetailByIdAndStatus(postId, PostStatus.PUBLISHED)
                .orElseThrow(() -> new PostException(POST_NOT_FOUND));
    }

    private ViewerPermissionsResponse viewerPermissionsFor(Post post, Long requesterId) {
        return findActiveBlogMember(post.getOwnBlogId(), requesterId)
                .map(member -> {
                    boolean canEdit = post.isWrittenBy(requesterId);
                    boolean canDelete = post.canBeDeletedBy(requesterId, member);
                    return ViewerPermissionsResponse.of(canEdit, canDelete);
                })
                .orElseGet(ViewerPermissionsResponse::none);
    }

    private Optional<BlogMember> findActiveBlogMember(Long blogId, Long requesterId) {
        if (requesterId == null) {
            return Optional.empty();
        }

        return blogMemberRepository.findByBlogIdAndUserIdAndStatusAndDeletedAtIsNull(
                blogId,
                requesterId,
                BlogMemberStatus.ACTIVE
        );
    }

}
