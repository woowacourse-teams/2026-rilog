package kr.rilog.domain.post.entity.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum Category {

    TECH("기술"),
    DAILY("일상"),
    ;

    private final String name;

}
