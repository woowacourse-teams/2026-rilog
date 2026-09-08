package kr.rilog.domain.post.entity.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum Category {

    TECH("기술"),
    DAILY("일상"),
    RETROSPECT("회고"),
    ;

    private final String name;

}
