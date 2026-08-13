package kr.rilog.domain.blog.repository;

import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BlogMemberRepository extends JpaRepository<BlogMember, Long> {

    Optional<BlogMember> findByBlogIdAndUserIdAndStatus(Long blogId, Long userId, BlogMemberStatus status);

    boolean existsByBlogIdAndUserIdAndStatus(Long blogId, Long userId, BlogMemberStatus status);

}
