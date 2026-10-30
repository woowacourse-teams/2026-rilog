package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.TagStatus;
import kr.rilog.domain.upload.domain.vo.S3TagTarget;
import kr.rilog.domain.upload.domain.vo.TagAssetChanges;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3TagAssetsLifecycle implements TagAssetsLifecycle {

    private static final String IMAGE_OWNERSHIP_MISMATCH_EVENT = "s3_image_ownership_mismatch";
    private static final String IMAGE_OWNERSHIP_MISMATCH_LOG_FORMAT =
            "event=s3_image_ownership_mismatch requesterId={} key={} tagStatus={}";

    private final S3ObjectTagger objectTagger;
    private final S3ObjectKeyResolver objectKeyResolver;
    private final S3ImageObjectKeyPolicy imageObjectKeyPolicy;
    private final S3CompactObjectKeyPolicy compactObjectKeyPolicy;
    private final ImageCompactionRequester imageCompactionRequester;

    @Override
    public void attach(TagAssets assets) {
        requestCompaction(objectTagger.tag(toTargets(resolveObjectKeys(assets), TagStatus.CONFIRMED)));
    }

    @Override
    public void synchronize(Long requesterId, TagAssets previous, TagAssets current) {
        if (previous.changesTo(current).isEmpty()) {
            return;
        }

        // 본문 주소와 크기 fragment가 붙은 썸네일 주소처럼 표기만 다른 같은 객체는 변경으로 보지 않는다.
        TagAssetChanges changes = TagAssets.from(resolveObjectKeys(previous))
                .changesTo(TagAssets.from(resolveObjectKeys(current)));
        if (changes.isEmpty()) {
            return;
        }

        List<S3TagTarget> targets = new ArrayList<>();

        targets.addAll(toTargets(
                changes.added(),
                TagStatus.CONFIRMED
        ));

        targets.addAll(toOwnedTargets(
                requesterId,
                changes.removed(),
                TagStatus.TEMPORARY
        ));

        requestCompaction(objectTagger.tag(targets));
    }

    @Override
    public void detach(Long requesterId, TagAssets assets) {
        objectTagger.tag(toOwnedTargets(requesterId, resolveObjectKeys(assets), TagStatus.TEMPORARY));
    }

    // CONFIRMED로 바뀐 raw 원본만 압축한다. 태깅에 실패한 원본은 TEMPORARY로 남아 지워질 수 있으므로 압축하지 않는다.
    private void requestCompaction(List<S3TagTarget> taggedTargets) {
        taggedTargets.stream()
                .filter(target -> target.tagStatus() == TagStatus.CONFIRMED)
                .map(S3TagTarget::key)
                .filter(compactObjectKeyPolicy::isCompactable)
                .forEach(imageCompactionRequester::request);
    }

    private Set<String> resolveObjectKeys(TagAssets assets) {
        return assets.objectUrls().stream()
                .map(objectKeyResolver::resolve)
                .flatMap(Optional::stream)
                .collect(Collectors.toSet());
    }

    private List<S3TagTarget> toTargets(
            Collection<String> objectKeys,
            TagStatus status
    ) {
        return objectKeys.stream()
                .map(objectKey -> new S3TagTarget(objectKey, status))
                .toList();
    }

    private List<S3TagTarget> toOwnedTargets(
            Long requesterId,
            Collection<String> objectKeys,
            TagStatus status
    ) {
        return toTargets(objectKeys, status).stream()
                .filter(target -> canChangeTag(requesterId, target.key(), status))
                .toList();
    }

    private boolean canChangeTag(Long requesterId, String objectKey, TagStatus status) {
        if (!imageObjectKeyPolicy.isManagedImage(objectKey)) {
            return true;
        }

        if (imageObjectKeyPolicy.isOwnedBy(objectKey, requesterId)) {
            return true;
        }

        log.atWarn()
                .addKeyValue("event", IMAGE_OWNERSHIP_MISMATCH_EVENT)
                .addKeyValue("requesterId", requesterId)
                .addKeyValue("key", objectKey)
                .addKeyValue("tagStatus", status)
                .log(
                        IMAGE_OWNERSHIP_MISMATCH_LOG_FORMAT,
                        requesterId,
                        objectKey,
                        status
                );
        return false;
    }

}
