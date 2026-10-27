package kr.rilog.domain.post.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.service.dto.command.DraftOverwriteCommand;
import kr.rilog.domain.post.service.dto.command.DraftPublishCommand;
import kr.rilog.domain.post.service.dto.command.DraftSaveCommand;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.post.service.dto.command.PostUpdateCommand;
import kr.rilog.domain.upload.domain.ImageAsset;
import kr.rilog.domain.upload.domain.ImageReference;
import kr.rilog.domain.upload.repository.ImageAssetRepository;
import kr.rilog.domain.upload.repository.ImageReferenceRepository;
import kr.rilog.domain.upload.service.S3ImageObjectKeyPolicy;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.global.s3.properties.S3Properties;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static kr.rilog.domain.upload.domain.enums.ImageReferenceType.POST;
import static kr.rilog.support.fixure.PostContentFixture.imageBlock;
import static kr.rilog.support.fixure.PostContentFixture.paragraph;
import static kr.rilog.support.fixure.PostContentFixture.readTree;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class PostImageReferenceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime UPLOADED_AT = LocalDateTime.of(2026, 10, 1, 12, 0);

    @Autowired
    private PostService postService;

    @Autowired
    private DraftService draftService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private ImageAssetRepository imageAssetRepository;

    @Autowired
    private ImageReferenceRepository imageReferenceRepository;

    @Autowired
    private S3ImageObjectKeyPolicy imageObjectKeyPolicy;

    @Autowired
    private S3Properties s3Properties;

    @Test
    @DisplayName("같은 이미지를 쓰는 게시글 중 하나를 삭제해도 남은 게시글의 이미지 참조는 유지된다.")
    void deletingOnePostKeepsSharedImageReferenceOfOtherPost() {
        // given
        User writer = saveCompletedUser(1L, "writer");
        Blog rilog = saveRilog(writer);
        ImageAsset image = saveAsset(writer);
        Long deletedPostId = postService.publish(publishCommand(rilog, null, image), writer.getId()).postId();
        Long remainingPostId = postService.publish(publishCommand(rilog, null, image), writer.getId()).postId();

        // when
        postService.deletePublishedPost(deletedPostId, writer.getId());

        // then
        assertSoftly(softly -> {
            softly.assertThat(activeAssetIdsOf(deletedPostId)).isEmpty();
            softly.assertThat(activeAssetIdsOf(remainingPostId)).containsExactly(image.getId());
        });
    }

    @Test
    @DisplayName("본문과 썸네일에 같은 이미지를 써서 발행하면 참조는 하나만 생긴다.")
    void publishCreatesSingleReferenceForBodyAndThumbnail() {
        // given
        User writer = saveCompletedUser(1L, "writer");
        Blog rilog = saveRilog(writer);
        ImageAsset image = saveAsset(writer);

        // when
        Long postId = postService.publish(publishCommand(rilog, urlOf(image), image), writer.getId()).postId();

        // then
        assertThat(activeAssetIdsOf(postId)).containsExactly(image.getId());
    }

    @Test
    @DisplayName("게시글을 수정하면 추가된 이미지는 참조하고 제거된 이미지의 참조는 삭제한다.")
    void updateSynchronizesReferences() {
        // given
        User writer = saveCompletedUser(1L, "writer");
        Blog rilog = saveRilog(writer);
        ImageAsset kept = saveAsset(writer);
        ImageAsset removed = saveAsset(writer);
        ImageAsset added = saveAsset(writer);
        Long postId = postService.publish(publishCommand(rilog, urlOf(removed), kept), writer.getId()).postId();

        // when
        postService.update(updateCommand(rilog, urlOf(added), kept), postId, writer.getId());

        // then
        assertSoftly(softly -> {
            softly.assertThat(activeAssetIdsOf(postId)).containsExactlyInAnyOrder(kept.getId(), added.getId());
        });
    }

    @Test
    @DisplayName("임시저장, 덮어쓰기, 발행은 같은 게시글 참조로 이어진다.")
    void draftLifecycleKeepsPostReferences() {
        // given
        User writer = saveCompletedUser(1L, "writer");
        Blog rilog = saveRilog(writer);
        ImageAsset first = saveAsset(writer);
        ImageAsset second = saveAsset(writer);
        ImageAsset published = saveAsset(writer);
        Long draftId = draftService.saveDraft(new DraftSaveCommand("임시 제목", contentWith(first)), writer.getId())
                .draftId();

        // when
        draftService.overwriteDraft(new DraftOverwriteCommand("덮어쓴 제목", contentWith(second)), draftId, writer.getId());
        List<Long> afterOverwrite = activeAssetIdsOf(draftId);
        draftService.publishDraft(draftPublishCommand(rilog, published), draftId, writer.getId());

        // then
        assertSoftly(softly -> {
            softly.assertThat(afterOverwrite).containsExactly(second.getId());
            softly.assertThat(activeAssetIdsOf(draftId)).containsExactly(published.getId());
        });
    }

    @Test
    @DisplayName("임시저장을 삭제하면 임시저장의 이미지 참조를 삭제한다.")
    void deleteDraftDetachesReferences() {
        // given
        User writer = saveCompletedUser(1L, "writer");
        saveRilog(writer);
        ImageAsset image = saveAsset(writer);
        Long draftId = draftService.saveDraft(new DraftSaveCommand("임시 제목", contentWith(image)), writer.getId())
                .draftId();

        // when
        draftService.deleteDraft(draftId, writer.getId());

        // then
        assertSoftly(softly -> {
            softly.assertThat(activeAssetIdsOf(draftId)).isEmpty();
        });
    }

    @Test
    @DisplayName("다른 사용자가 올린 이미지를 쓴 게시글도 참조로 등록된다.")
    void publishRegistersOthersImage() {
        // given
        User uploader = saveCompletedUser(1L, "uploader");
        User writer = saveCompletedUser(2L, "writer");
        Blog rilog = saveRilog(writer);
        ImageAsset othersImage = saveAsset(uploader);

        // when
        Long postId = postService.publish(publishCommand(rilog, null, othersImage), writer.getId()).postId();

        // then
        assertThat(activeAssetIdsOf(postId)).containsExactly(othersImage.getId());
    }

    private PostSaveCommand publishCommand(Blog blog, String thumbnailUrl, ImageAsset... bodyImages) {
        return new PostSaveCommand(
                blog.getSlug(),
                "게시글 제목",
                contentWith(bodyImages),
                Category.TECH,
                PostVisibility.PUBLIC,
                thumbnailUrl,
                null
        );
    }

    private PostUpdateCommand updateCommand(Blog blog, String thumbnailUrl, ImageAsset... bodyImages) {
        return new PostUpdateCommand(
                blog.getSlug(),
                "수정된 제목",
                contentWith(bodyImages),
                Category.TECH,
                PostVisibility.PUBLIC,
                thumbnailUrl,
                null
        );
    }

    private DraftPublishCommand draftPublishCommand(Blog blog, ImageAsset... bodyImages) {
        return new DraftPublishCommand(
                blog.getSlug(),
                "발행된 제목",
                contentWith(bodyImages),
                Category.TECH,
                PostVisibility.PUBLIC,
                null,
                null
        );
    }

    private JsonNode contentWith(ImageAsset... images) {
        String imageBlocks = Arrays.stream(images)
                .map(image -> imageBlock(urlOf(image)))
                .collect(Collectors.joining(","));
        String blocks = imageBlocks.isEmpty() ? paragraph("본문") : paragraph("본문") + "," + imageBlocks;
        return readTree("[" + blocks + "]");
    }

    private User saveCompletedUser(long githubId, String slug) {
        User user = UserFixture.user(githubId, "github_user_" + githubId);
        user.completeOnboarding(
                "작성자" + githubId,
                slug,
                "기록하는 개발자입니다.",
                null,
                "https://github.com/github_user_" + githubId,
                "user" + githubId + "@example.com"
        );
        return userRepository.saveAndFlush(user);
    }

    private Blog saveRilog(User owner) {
        Blog blog = blogRepository.saveAndFlush(Blog.createRilog(owner));
        blogMemberRepository.saveAndFlush(BlogMemberFixture.owner(blog, owner));
        return blog;
    }

    private ImageAsset saveAsset(User uploader) {
        String objectKey = imageObjectKeyPolicy.create(uploader.getId(), UUID.randomUUID(), "png");
        return imageAssetRepository.saveAndFlush(ImageAsset.create(objectKey, uploader.getId(), UPLOADED_AT));
    }

    private String urlOf(ImageAsset asset) {
        return "https://%s.s3.%s.amazonaws.com/%s".formatted(
                s3Properties.bucket(),
                s3Properties.region(),
                asset.getObjectKey()
        );
    }

    private List<Long> activeAssetIdsOf(Long postId) {
        return imageReferenceRepository.findAll().stream()
                .filter(reference -> reference.getReferenceType() == POST)
                .filter(reference -> reference.getReferenceId().equals(postId))
                .filter(reference -> reference.getDeletedAt() == null)
                .map(ImageReference::getImageAsset)
                .map(ImageAsset::getId)
                .toList();
    }
}
