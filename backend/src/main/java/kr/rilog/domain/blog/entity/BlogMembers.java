package kr.rilog.domain.blog.entity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public record BlogMembers(
        Map<Long, BlogMember> values
) {

    public BlogMembers {
        values = Map.copyOf(values);
    }

    public static BlogMembers from(List<BlogMember> blogMembers) {
        Map<Long, BlogMember> valuesByUserId = new HashMap<>();
        for (BlogMember blogMember : blogMembers) {
            Long userId = blogMember.getUser().getId();
            if (valuesByUserId.putIfAbsent(userId, blogMember) != null) {
                throw new IllegalArgumentException("Duplicate blog member user id: " + userId);
            }
        }
        return new BlogMembers(valuesByUserId);
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
        return Optional.ofNullable(values.get(userId));
    }

}
