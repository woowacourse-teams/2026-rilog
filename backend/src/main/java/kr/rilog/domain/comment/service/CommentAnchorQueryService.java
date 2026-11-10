package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.entity.BlogMembers;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.comment.entity.vo.CommentAnchorGroups;
import kr.rilog.domain.comment.repository.CommentAnchorRepository;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorListResult;
import kr.rilog.domain.comment.service.dto.result.CommentAnchorSidebarResult;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.blog.entity.enums.BlogMemberStatus.ACTIVE;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentAnchorQueryService {

    private final CommentAnchorRepository commentAnchorRepository;
    private final PostRepository postRepository;
    private final BlogMemberRepository blogMemberRepository;

    public CommentAnchorListResult readCommentAnchors(Long postId, Long requesterId) {
        Post post = getPublishedPost(postId);
        post.validateReadableBy(requesterId);

        CommentAnchorGroups groups = CommentAnchorGroups.from(
                commentAnchorRepository.findAllByPostId(postId)
        );
        return CommentAnchorListResult.from(post, groups, getActiveBlogMembers(post), requesterId);
    }

    public CommentAnchorSidebarResult readSidebarCommentAnchors(Long postId, Long requesterId) {
        Post post = getPublishedPost(postId);
        post.validateReadableBy(requesterId);

        CommentAnchorGroups groups = CommentAnchorGroups.from(
                commentAnchorRepository.findAllByPostId(postId)
        );
        return CommentAnchorSidebarResult.from(post, groups, getActiveBlogMembers(post), requesterId);
    }

    private Post getPublishedPost(Long postId) {
        return postRepository.findDetailByIdAndStatus(postId, PostStatus.PUBLISHED)
                .orElseThrow(() -> new PostException(POST_NOT_FOUND));
    }

    private BlogMembers getActiveBlogMembers(Post post) {
        return BlogMembers.from(
                blogMemberRepository.findAllWithUserByBlogIdAndStatus(post.getOwnBlogId(), ACTIVE)
        );
    }

}
