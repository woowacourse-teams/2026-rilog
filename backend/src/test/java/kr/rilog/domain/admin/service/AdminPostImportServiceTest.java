package kr.rilog.domain.admin.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostVisibility;
import kr.rilog.domain.post.service.PostService;
import kr.rilog.domain.post.service.dto.command.PostSaveCommand;
import kr.rilog.domain.upload.domain.ImageAsset;
import kr.rilog.domain.upload.domain.enums.UploadType;
import kr.rilog.domain.upload.repository.ImageAssetRepository;
import kr.rilog.domain.upload.service.S3ImageObjectKeyPolicy;
import kr.rilog.domain.upload.service.UploadService;
import kr.rilog.domain.upload.service.dto.command.PresignedUrlCreateCommand;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.global.s3.properties.S3Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import tools.jackson.databind.node.JsonNodeFactory;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AdminPostImportServiceTest {

    private static final long TARGET_ID = 123L;
    private static final Instant ORIGINAL_DATE = Instant.parse("2024-03-15T05:30:00Z");
    private static final String KEY = "rilog/uploads/images/originals/123-b38e9b2c-4c13-4f52-9c31-0e52d768d517.png";
    private static final String IMAGE_URL = "https://test-bucket.s3.ap-northeast-2.amazonaws.com/" + KEY;

    private UserRepository users;
    private BlogRepository blogs;
    private PostService posts;
    private S3Presigner presigner;
    private ImageAssetRepository assets;
    private AdminPostImportService service;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        blogs = mock(BlogRepository.class);
        posts = mock(PostService.class);
        presigner = mock(S3Presigner.class);
        assets = mock(ImageAssetRepository.class);
        var properties = new S3Properties("test-bucket", "ap-northeast-2", "rilog/uploads", 10);
        var keyPolicy = new S3ImageObjectKeyPolicy(properties);
        var uploads = new UploadService(presigner, mock(S3Client.class), properties,
                keyPolicy, assets, Clock.systemUTC());
        service = new AdminPostImportService(users, blogs, uploads, posts);
    }

    @Test
    @DisplayName("실제 업로드 로직이 대상 작성자 ID로 이미지 키와 자산 소유자를 생성한다")
    void createsImageOwnedByTarget() throws Exception {
        // given
        validTarget();
        var signed = mock(PresignedPutObjectRequest.class);
        when(signed.url()).thenReturn(URI.create("https://storage.example/upload").toURL());
        when(presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(signed);

        // when
        var result = service.createUploadUrl(TARGET_ID, imageCommand());

        // then
        var asset = ArgumentCaptor.forClass(ImageAsset.class);
        verify(assets).save(asset.capture());
        assertThat(result.objectKey()).startsWith("rilog/uploads/images/originals/123-");
        assertThat(asset.getValue().getObjectKey()).isEqualTo(result.objectKey());
        assertThat(asset.getValue().getUploaderId()).isEqualTo(TARGET_ID);
    }

    @Test
    @DisplayName("대상 작성자와 원문 날짜를 이관 발행 경로로 전달한다")
    void delegatesToImportedPublish() {
        // given
        validTarget();
        var command = postCommand(IMAGE_URL, KEY);

        // when
        service.publish(TARGET_ID, command, ORIGINAL_DATE);

        // then
        verify(posts).publishImported(command, TARGET_ID, ORIGINAL_DATE);
        verify(posts, never()).publish(any(), any());
    }

    private void validTarget() {
        User user = User.builder().id(TARGET_ID).build();
        when(users.findById(TARGET_ID)).thenReturn(Optional.of(user));
        when(blogs.findRilogByOwnerId(TARGET_ID)).thenReturn(Optional.of(Blog.builder().id(1L).owner(user).build()));
    }

    private PresignedUrlCreateCommand imageCommand() {
        return new PresignedUrlCreateCommand("image.png", "image/png", 1024, UploadType.IMAGE);
    }

    private PostSaveCommand postCommand(String bodyImage, String thumbnail) {
        var body = JsonNodeFactory.instance.arrayNode();
        body.addObject().put("type", "image").putObject("props").put("url", bodyImage);
        return new PostSaveCommand("author_blog", "원문 제목", body,
                Category.TECH, PostVisibility.PUBLIC, thumbnail, null);
    }
}
