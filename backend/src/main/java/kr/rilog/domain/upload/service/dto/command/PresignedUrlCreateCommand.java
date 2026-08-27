package kr.rilog.domain.upload.service.dto.command;

import kr.rilog.domain.upload.domain.enums.UploadType;

public record PresignedUrlCreateCommand(

        String fileName,
        String contentType,
        long size,
        UploadType type

) {
}
