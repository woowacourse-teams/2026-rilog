package kr.rilog.domain.blog.repository;

import kr.rilog.domain.blog.entity.BlogMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BlogMemberRepository extends JpaRepository<BlogMember, Long> {
}
