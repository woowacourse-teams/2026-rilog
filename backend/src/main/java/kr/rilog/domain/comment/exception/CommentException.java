package kr.rilog.domain.comment.exception;

import kr.rilog.global.exception.RilogBusinessException;

public class CommentException extends RilogBusinessException {

    public CommentException(CommentErrorInformation errorInformation) {
        super(errorInformation);
    }
}
