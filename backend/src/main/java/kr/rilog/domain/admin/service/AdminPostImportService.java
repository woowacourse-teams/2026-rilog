package kr.rilog.domain.admin.service;

import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.service.PostService;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.result.PostPublishResult;
import kr.rilog.domain.upload.domain.enums.UploadType;
import kr.rilog.domain.upload.exception.UploadException;
import kr.rilog.domain.upload.service.UploadService;
import kr.rilog.domain.upload.service.dto.command.PresignedUrlCreateCommand;
import kr.rilog.domain.upload.service.dto.result.PresignedUrlCreateResult;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_NOT_FOUND;
import static kr.rilog.domain.upload.exception.UploadErrorInformation.INVALID_UPLOAD_TARGET;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;

@Service
@RequiredArgsConstructor
public class AdminPostImportService {

    private final UserRepository userRepository;
    private final BlogRepository blogRepository;
    private final UploadService uploadService;
    private final PostService postService;

    @Transactional
    public PresignedUrlCreateResult createUploadUrl(Long targetUserId, PresignedUrlCreateCommand command) {
        validateTarget(targetUserId);
        if (command.type() != UploadType.IMAGE) {
            throw new UploadException(INVALID_UPLOAD_TARGET);
        }

        return uploadService.createUploadUrl(targetUserId, command);
    }

    @Transactional
    public PostPublishResult publish(Long targetUserId, PostSaveCommand command, Instant originalPublishedAt) {
        validateTarget(targetUserId);
        return postService.publishImported(command, targetUserId, originalPublishedAt);
    }

    private void validateTarget(Long targetUserId) {
        userRepository.findById(targetUserId)
                .filter(user -> user.getDeletedAt() == null)
                .orElseThrow(() -> new UserException(USER_NOT_FOUND));
        blogRepository.findRilogByOwnerId(targetUserId)
                .filter(blog -> blog.getDeletedAt() == null)
                .orElseThrow(() -> new BlogException(RILOG_NOT_FOUND));
    }

}
