package kr.rilog.domain.comment.service;

import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.comment.controller.dto.response.CommentListResponse;
import kr.rilog.domain.comment.repository.CommentRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentQueryService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final BlogMemberRepository blogMemberRepository;

    public CommentListResponse readComments(Long postId) {
        Post post = getPublishedPost(postId);
        Set<Long> activeMemberUserIds = new HashSet<>(
                blogMemberRepository.findActiveUserIdsByBlogId(post.getOwnBlogId())
        );
        return CommentListResponse.from(
                post,
                commentRepository.findAllByPostIdOrderByCreatedAtAscIdAsc(postId),
                activeMemberUserIds
        );
    }

    private Post getPublishedPost(Long postId) {
        Post post = postRepository.findDetailByIdAndStatus(postId, PostStatus.PUBLISHED)
                .orElseThrow(() -> new PostException(POST_NOT_FOUND));
        post.validateReadableBy(null);
        return post;
    }

}
