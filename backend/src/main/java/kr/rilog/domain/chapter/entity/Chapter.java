package kr.rilog.domain.chapter.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.chapter.entity.vo.ChapterName;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.global.entity.BaseEntity;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.Objects;

import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.INVALID_CHAPTER_ORDER;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;

@Getter
@Entity
@Table(name = "chapter")
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Chapter extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "blog_id", nullable = false)
    private Blog blog;

    @Embedded
    private ChapterName name;

    @Column(name = "chapter_order", nullable = false)
    private int order;

    public static Chapter create(Blog blog, String name, int order) {
        validateOrder(order);
        return Chapter.builder()
                .blog(Objects.requireNonNull(blog))
                .name(ChapterName.from(name))
                .order(order)
                .build();
    }

    public void rename(ChapterName name) {
        this.name = name;
    }

    public void reorder(int order) {
        validateOrder(order);
        this.order = order;
    }

    public boolean isSameName(ChapterName name) {
        return this.name.equals(name);
    }

    public String getName() {
        return name == null ? null : name.getValue();
    }

    private static void validateOrder(int order) {
        if (order < 0) {
            throw new ChapterException(INVALID_CHAPTER_ORDER);
        }
    }

}
