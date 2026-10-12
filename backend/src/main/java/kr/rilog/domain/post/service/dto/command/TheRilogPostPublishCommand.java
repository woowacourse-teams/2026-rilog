package kr.rilog.domain.post.service.dto.command;

import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.TheRilogPostMetadata;
import kr.rilog.domain.post.entity.vo.PostDetail;

/** Internal input for approved THE Rilog content; public publish requests remain STANDARD. */
public record TheRilogPostPublishCommand(
        PostType postType,
        PostDetail detail,
        String description,
        String sourceProfileName,
        String sourceProfileImage
) {
    public TheRilogPostPublishCommand {
        new TheRilogPostMetadata(postType, description, sourceProfileName, sourceProfileImage);
    }

    public TheRilogPostMetadata toMetadata() {
        return new TheRilogPostMetadata(postType, description, sourceProfileName, sourceProfileImage);
    }
}
