package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.model.Publisher;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.repository.projection.DraftListRow;
import kr.rilog.domain.post.service.dto.command.DraftOverwriteCommand;
import kr.rilog.domain.post.service.dto.command.DraftPublishCommand;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.post.service.dto.result.DraftDetailResult;
import kr.rilog.domain.post.service.dto.result.DraftIdResult;
import kr.rilog.domain.post.service.dto.result.DraftListResult;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.*;
import static kr.rilog.domain.post.entity.enums.PostStatus.DRAFT;
import static kr.rilog.domain.post.exception.PostErrorInformation.DRAFT_NOT_FOUND;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class DraftService {

    private final PostRepository postRepository;
    private final BlogRepository blogRepository;
    private final BlogMemberRepository blogMemberRepository;
    private final UserRepository userRepository;

    // THINK 멱등성.
    @Transactional
    public DraftIdResult saveDraft(DraftSaveCommand command, Long writerId) {
        User writer = getUser(writerId);
        Blog rilog = getRilog(writer);

        // TODO 이미지 Confirmed 처리.
        Post saved = postRepository.save(Post.draft(command, writer, rilog));
        return DraftIdResult.from(saved.getId());
    }

    public DraftListResult readMyDraftList(Long requesterId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size);
        Slice<DraftListRow> drafts = postRepository.findDraftsByWriterId(requesterId, DRAFT, pageable);
        return DraftListResult.from(drafts);
    }

    public DraftDetailResult getMyDraft(Long draftId, Long requesterId) {
        Post draft = getDraft(draftId);
        draft.validateWrittenBy(requesterId);
        return DraftDetailResult.from(draft);
    }

    @Transactional
    public PostPublishResult publishDraft(DraftPublishCommand command, Long draftId, Long requesterId) {
        Post draft = getDraft(draftId);
        draft.validateWrittenBy(requesterId);
        User writer = getUser(requesterId);

        BlogMember targetMemberShip = getBlogMember(Slug.from(command.slug()), requesterId);
        BlogMember rilogMemberShip = getBlogMember(Slug.from(writer.getSlug()), requesterId);

        Publisher publisher = Publisher.of(rilogMemberShip, targetMemberShip);
        publisher.publishDraft(draft, command.toDetail());

        return PostPublishResult.of(draft);
    }

    @Transactional
    public DraftIdResult overwriteDraft(DraftOverwriteCommand command, Long postId, Long requesterId) {
        Post draft = getDraft(postId);
        draft.validateWrittenBy(requesterId);
        draft.overwriteDraft(command);
        return DraftIdResult.from(draft.getId());
    }

    @Transactional
    public void deleteDraft(Long postId, Long requesterId) {
        Post draft = getDraft(postId);
        draft.validateWrittenBy(requesterId);
        draft.delete();
    }

    private User getUser(Long requesterId) {
        return userRepository.findById(requesterId)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
    }

    private Blog getRilog(User writer) {
        return blogRepository.findRilogByOwnerId(writer.getId())
                .orElseThrow(() -> new BlogException(RILOG_NOT_FOUND));
    }

    private BlogMember getBlogMember(Slug slug, Long memberId) {
        return blogMemberRepository.findWithBlogBySlugAndUserId(slug, memberId)
                .orElseThrow(() -> new BlogException(BLOG_MEMBER_DOESNT_NOT_BELONG));
    }

    private Post getDraft(Long draftId) {
        return postRepository.findDraftById(draftId)
                .orElseThrow(() -> new PostException(DRAFT_NOT_FOUND));
    }

}
