package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.service.gateway.ImageCompactionGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import static kr.rilog.global.config.AsyncConfig.IMAGE_COMPACTION_EXECUTOR;

/**
 * CONFIRMED 태그를 붙인 raw 원본마다 압축을 비동기로 요청한다. 결과를 기다리거나 다시 시도하지 않는다.
 */
@Service
@RequiredArgsConstructor
public class ImageCompactionRequester {

    private final ImageCompactionGateway imageCompactionGateway;

    @Async(IMAGE_COMPACTION_EXECUTOR)
    public void request(String rawObjectKey) {
        imageCompactionGateway.compact(rawObjectKey);
    }

}
