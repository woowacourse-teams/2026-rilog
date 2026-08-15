package kr.rilog.domain.blog.service.dto.command;

public record CologCreateCommand(
        String name,
        String slug,
        String introduction,
        String logoUrl,
        String coverImageUrl,
        String serviceUrl,
        String githubUrl
) {
}
