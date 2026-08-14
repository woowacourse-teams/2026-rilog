package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.controller.dto.response.PostDetailResponse;
import kr.rilog.domain.post.controller.dto.response.TotalPostsCountResponse;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.COLOG_POST_PUBLISH_FORBIDDEN;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_NOT_FOUND;
import static kr.rilog.domain.post.exception.PostErrorInformation.POST_NOT_FOUND;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final BlogRepository blogRepository;
    private final BlogMemberRepository blogMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public PostPublishResult publish(PostSaveCommand command, Long blogId, Long requesterId) {
        Blog publishingBlog = getBlog(blogId);
        User writer = getUser(requesterId);

        Post post = publishingBlog.isColog()
                ? publishToColog(command, publishingBlog, writer)
                : publishToRilog(command, publishingBlog, writer);

        // TODO content에 있는 이미지 파싱하여, S3에 tag 변경...! 이건 그냥 주석으로 유지 다음에 구현..!
        Post published = postRepository.save(post);
        return PostPublishResult.of(published, publishingBlog);
    }

    public PostDetailResponse readPost(Long postId, Long requesterId) {
        Post post = getPost(postId);
        post.validateReadableBy(requesterId);
        return PostDetailResponse.from(post);
    }

    public TotalPostsCountResponse readPostsCount() {
        long count = postRepository.countByStatusAndVisibility(PostStatus.PUBLISHED, PostVisibility.PUBLIC);
        return new TotalPostsCountResponse(count);
    }

    private Post publishToRilog(PostSaveCommand command, Blog rilog, User writer) {
        rilog.validateIsOwner(writer);
        return Post.create(rilog, writer, command.toDetail());
    }

    private Post publishToColog(PostSaveCommand command, Blog colog, User writer) {
        validateCologMember(colog, writer);
        Blog rilog = getRilog(writer);
        return Post.create(colog, rilog, writer, command.toDetail());
    }

    private void validateCologMember(Blog colog, User writer) {
        boolean activeMember = blogMemberRepository.existsByBlogIdAndUserIdAndStatus(
                colog.getId(),
                writer.getId(),
                BlogMemberStatus.ACTIVE
        );
        if (!activeMember) {
            throw new BlogException(COLOG_POST_PUBLISH_FORBIDDEN);
        }
    }

    private User getUser(Long requesterId) {
        return userRepository.findById(requesterId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }

    private Blog getBlog(Long blogId) {
        return blogRepository.findById(blogId)
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

    private Blog getRilog(User writer) {
        return blogRepository.findRilogByOwnerId(writer.getId())
                .orElseThrow(() -> new BlogException(RILOG_NOT_FOUND));
    }

    private Post getPost(Long postId) {
        return postRepository.findDetailById(postId)
                .orElseThrow(() -> new PostException(POST_NOT_FOUND));
    }

}
