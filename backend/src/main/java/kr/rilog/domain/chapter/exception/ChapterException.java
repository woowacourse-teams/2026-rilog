package kr.rilog.domain.chapter.exception;

import kr.rilog.global.exception.RilogBusinessException;

public class ChapterException extends RilogBusinessException {

    public ChapterException(ChapterErrorInformation errorInformation) {
        super(errorInformation);
    }
}
