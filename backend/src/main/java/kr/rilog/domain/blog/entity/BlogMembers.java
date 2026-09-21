package kr.rilog.domain.blog.entity;

import java.util.List;
import java.util.Optional;

public record BlogMembers(
        List<BlogMember> values
) {

    public BlogMembers {
        values = List.copyOf(values);
    }

    public static BlogMembers from(List<BlogMember> blogMembers) {
        return new BlogMembers(blogMembers);
    }

    public boolean isActiveMember(Long userId) {
        return findByUserId(userId)
                .map(BlogMember::isActive)
                .orElse(false);
    }

    public boolean hasDeletePermission(Long userId) {
        return findByUserId(userId)
                .map(BlogMember::hasDeletePermission)
                .orElse(false);
    }

    private Optional<BlogMember> findByUserId(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        return values.stream()
                .filter(blogMember -> blogMember.isUser(userId))
                .findFirst();
    }

}
