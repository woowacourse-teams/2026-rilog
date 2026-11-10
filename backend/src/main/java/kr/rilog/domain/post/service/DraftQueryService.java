package kr.rilog.domain.post.service;

import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.exception.PostException;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.post.repository.projection.DraftListRow;
import kr.rilog.domain.post.service.dto.result.DraftDetailResult;
import kr.rilog.domain.post.service.dto.result.DraftListResult;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static kr.rilog.domain.post.entity.enums.PostStatus.DRAFT;
import static kr.rilog.domain.post.exception.PostErrorInformation.DRAFT_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class DraftQueryService {

    private final PostRepository postRepository;

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

    private Post getDraft(Long draftId) {
        return postRepository.findDraftById(draftId)
                .orElseThrow(() -> new PostException(DRAFT_NOT_FOUND));
    }

}
