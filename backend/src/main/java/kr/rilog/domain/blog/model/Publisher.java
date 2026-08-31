package kr.rilog.domain.blog.model;

import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.post.entity.vo.PostDetail;

public record Publisher(

        BlogMember rilogMembership,
        BlogMember targetMembership

) {

    public static Publisher of(BlogMember rilogMembership, BlogMember targetMembership) {
        return new Publisher(rilogMembership, targetMembership);
    }

    public void publishDraft(Post draft, PostDetail detail, Chapter chapter) {
        rilogMembership.validateActiveMember();
        targetMembership.validateActiveMember();
        draft.publish(rilogMembership.getBlog(), targetMembership.getBlog(), detail, chapter);
    }

}
