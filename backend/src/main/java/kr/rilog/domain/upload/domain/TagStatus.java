package kr.rilog.domain.upload.domain;

import software.amazon.awssdk.services.s3.model.Tag;
import software.amazon.awssdk.services.s3.model.Tagging;

public enum TagStatus {

    TEMPORARY,
    CONFIRMED,
    ;

    private static final String KEY = "status";

    public Tagging toTagging() {
        return Tagging.builder()
                .tagSet(Tag.builder().key(KEY).value(name()).build())
                .build();
    }

}
