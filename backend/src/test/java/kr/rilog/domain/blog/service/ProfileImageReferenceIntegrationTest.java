package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.BlogProfileUpdateCommand;
import kr.rilog.domain.blog.service.dto.command.CologCreateCommand;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.service.PostService;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.upload.domain.ImageAsset;
import kr.rilog.domain.upload.domain.ImageReference;
import kr.rilog.domain.upload.domain.enums.ImageReferenceType;
import kr.rilog.domain.upload.repository.ImageAssetRepository;
import kr.rilog.domain.upload.repository.ImageReferenceRepository;
import kr.rilog.domain.upload.service.S3ImageObjectKeyPolicy;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.UserService;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import kr.rilog.global.s3.properties.S3Properties;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.BlogMemberFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static kr.rilog.domain.upload.domain.enums.ImageReferenceType.BLOG;
import static kr.rilog.domain.upload.domain.enums.ImageReferenceType.POST;
import static kr.rilog.domain.upload.domain.enums.ImageReferenceType.USER;
import static kr.rilog.support.fixure.PostContentFixture.imageBlock;
import static kr.rilog.support.fixure.PostContentFixture.readTree;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

class ProfileImageReferenceIntegrationTest extends ServiceSupport {

    private static final LocalDateTime UPLOADED_AT = LocalDateTime.of(2026, 10, 1, 12, 0);

    @Autowired
    private UserService userService;

    @Autowired
    private BlogService blogService;

    @Autowired
    private CologService cologService;

    @Autowired
    private PostService postService;

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
    @DisplayName("온보딩을 완료하면 사용자와 개인 블로그의 프로필 이미지를 참조한다.")
    void completeOnboardingAttachesUserAndRilogProfileImage() {
        // given
        User pendingUser = userRepository.saveAndFlush(UserFixture.pending());
        ImageAsset profileImage = saveAsset(pendingUser);

        // when
        userService.completeOnboarding(pendingUser.getId(), onboardingCommand(urlOf(profileImage)));

        // then
        Blog rilog = blogRepository.findRilogByOwnerId(pendingUser.getId()).orElseThrow();
        assertSoftly(softly -> {
            softly.assertThat(activeAssetIdsOf(USER, pendingUser.getId())).containsExactly(profileImage.getId());
            softly.assertThat(activeAssetIdsOf(BLOG, rilog.getId())).containsExactly(profileImage.getId());
        });
    }

    @Test
    @DisplayName("개인 블로그 프로필 이미지를 바꾸면 블로그와 소유자의 이미지 참조를 함께 바꾼다.")
    void changeRilogProfileSynchronizesBlogAndUserReferences() {
        // given
        User pendingUser = userRepository.saveAndFlush(UserFixture.pending());
        ImageAsset previousImage = saveAsset(pendingUser);
        ImageAsset newImage = saveAsset(pendingUser);
        ImageAsset cover = saveAsset(pendingUser);
        User owner = userService.completeOnboarding(pendingUser.getId(), onboardingCommand(urlOf(previousImage)));
        Blog rilog = blogRepository.findRilogByOwnerId(owner.getId()).orElseThrow();

        // when
        blogService.changeBlogProfile(owner.getId(), rilog.getSlug(), profileUpdateCommand(urlOf(newImage), urlOf(cover)));

        // then
        assertSoftly(softly -> {
            softly.assertThat(activeAssetIdsOf(BLOG, rilog.getId()))
                    .containsExactlyInAnyOrder(newImage.getId(), cover.getId());
            softly.assertThat(activeAssetIdsOf(USER, owner.getId())).containsExactly(newImage.getId());
        });
    }

    @Test
    @DisplayName("팀 블로그를 만들면 프로필과 커버 이미지를 참조한다.")
    void createCologAttachesProfileImages() {
        // given
        User owner = saveCompletedUser(1L, "owner");
        ImageAsset profileImage = saveAsset(owner);
        ImageAsset cover = saveAsset(owner);

        // when
        String slug = cologService.create(owner.getId(), cologCreateCommand(urlOf(profileImage), urlOf(cover))).slug();

        // then
        Blog colog = blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(slug))
                .orElseThrow();
        assertSoftly(softly -> softly.assertThat(activeAssetIdsOf(BLOG, colog.getId()))
                .containsExactlyInAnyOrder(profileImage.getId(), cover.getId()));
    }

    @Test
    @DisplayName("팀 블로그를 삭제하면 팀 블로그와 소속 게시글의 이미지 참조를 삭제한다.")
    void deleteCologDetachesBlogAndPostReferences() {
        // given
        User owner = saveCompletedUser(1L, "owner");
        saveRilog(owner);
        ImageAsset profileImage = saveAsset(owner);
        ImageAsset postImage = saveAsset(owner);
        String slug = cologService.create(owner.getId(), cologCreateCommand(urlOf(profileImage), null)).slug();
        Long postId = postService.publish(publishCommand(slug, postImage), owner.getId()).postId();
        Blog colog = blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(slug))
                .orElseThrow();

        // when
        cologService.deleteColog(owner.getId(), slug);

        // then
        assertSoftly(softly -> {
            softly.assertThat(activeAssetIdsOf(BLOG, colog.getId())).isEmpty();
            softly.assertThat(activeAssetIdsOf(POST, postId)).isEmpty();
        });
    }

    private OnboardingCompleteCommand onboardingCommand(String profileImageUrl) {
        return new OnboardingCompleteCommand(
                "러로",
                "ri_log_01",
                "기록하는 개발자입니다.",
                profileImageUrl,
                "https://github.com/rilog",
                "https://rilog.example.com",
                "rilog@example.com"
        );
    }

    private BlogProfileUpdateCommand profileUpdateCommand(String profileImageUrl, String coverImageUrl) {
        return new BlogProfileUpdateCommand(
                profileImageUrl,
                coverImageUrl,
                "새 개인 블로그",
                "새 소개",
                "https://new.example.com",
                "https://github.com/new_rilog",
                "new@example.com"
        );
    }

    private CologCreateCommand cologCreateCommand(String profileImageUrl, String coverImageUrl) {
        return new CologCreateCommand(
                "리로그 팀",
                "team_rilog",
                "팀 소개",
                profileImageUrl,
                coverImageUrl,
                "https://team.example.com",
                "https://github.com/team",
                "team@example.com"
        );
    }

    private PostSaveCommand publishCommand(String slug, ImageAsset image) {
        return new PostSaveCommand(
                slug,
                "팀 게시글",
                readTree("[" + imageBlock(urlOf(image)) + "]"),
                Category.TECH,
                PostVisibility.PUBLIC,
                null,
                null
        );
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

    private List<Long> activeAssetIdsOf(ImageReferenceType type, Long referenceId) {
        return imageReferenceRepository.findAll().stream()
                .filter(reference -> reference.getReferenceType() == type)
                .filter(reference -> reference.getReferenceId().equals(referenceId))
                .filter(reference -> reference.getDeletedAt() == null)
                .map(ImageReference::getImageAsset)
                .map(ImageAsset::getId)
                .toList();
    }
}
