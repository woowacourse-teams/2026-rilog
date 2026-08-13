package kr.rilog.domain.blog.service.dto.command;

public record CologCreateCommand(
        String name,
        String slug,
        String introduction,
        String coverImageUrl,
        String serviceUrl
) {
}
