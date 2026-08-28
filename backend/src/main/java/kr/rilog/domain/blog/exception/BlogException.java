package kr.rilog.domain.blog.exception;

import kr.rilog.global.exception.RilogBusinessException;

public class BlogException extends RilogBusinessException {

    public BlogException(BlogErrorInformation errorInformation) {
        super(errorInformation);
    }
}
