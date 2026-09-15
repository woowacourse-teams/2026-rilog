package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.enums.TagStatus;
import kr.rilog.domain.upload.domain.vo.S3TagTarget;
import kr.rilog.domain.upload.domain.vo.TagAssetChanges;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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

    @Override
    public void attach(TagAssets assets) {
        objectTagger.tag(toTargets(assets, TagStatus.CONFIRMED));
    }

    @Override
    public void synchronize(Long requesterId, TagAssets previous, TagAssets current) {
        TagAssetChanges changes = previous.changesTo(current);
        if (changes.isEmpty()) {
            return;
        }

        List<S3TagTarget> targets = new ArrayList<>();

        targets.addAll(toTargets(
                new TagAssets(changes.added()),
                TagStatus.CONFIRMED
        ));

        targets.addAll(toOwnedTargets(
                requesterId,
                new TagAssets(changes.removed()),
                TagStatus.TEMPORARY
        ));

        objectTagger.tag(targets);
    }

    @Override
    public void detach(Long requesterId, TagAssets assets) {
        objectTagger.tag(toOwnedTargets(requesterId, assets, TagStatus.TEMPORARY));
    }

    private List<S3TagTarget> toTargets(
            TagAssets assets,
            TagStatus status
    ) {
        return assets.objectUrls().stream()
                .map(objectKeyResolver::resolve)
                .flatMap(Optional::stream)
                .map(objectKey -> new S3TagTarget(objectKey, status))
                .toList();
    }

    private List<S3TagTarget> toOwnedTargets(
            Long requesterId,
            TagAssets assets,
            TagStatus status
    ) {
        return toTargets(assets, status).stream()
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
