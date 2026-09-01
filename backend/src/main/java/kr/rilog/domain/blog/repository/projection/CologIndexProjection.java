package kr.rilog.domain.blog.repository.projection;

public record CologIndexProjection(
        Long cologId,
        String cologName,
        String cologSlug,
        String coloProfileImageUrl,
        long authoredPostCount
) {
}
