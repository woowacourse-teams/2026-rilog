package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.TagStatus;
import kr.rilog.domain.upload.domain.vo.v2.S3TagTarget;
import kr.rilog.domain.upload.domain.vo.v2.UploadAssetChanges;
import kr.rilog.domain.upload.domain.vo.v2.UploadAssets;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class S3UploadAssetsLifecycle implements UploadAssetsLifecycle {

    private final S3ObjectTaggerV2 objectTaggerV2;
    private final S3ObjectKeyResolver objectKeyResolver;

    @Override
    public void attach(UploadAssets assets) {
        objectTaggerV2.fileTag(toTargets(assets, TagStatus.CONFIRMED));
    }

    @Override
    public void synchronize(UploadAssets previous, UploadAssets current) {
        UploadAssetChanges changes = previous.changesTo(current);
        if (changes.isEmpty()) {
            return;
        }

        List<S3TagTarget> targets = new ArrayList<>();

        targets.addAll(toTargets(
                new UploadAssets(changes.added()),
                TagStatus.CONFIRMED
        ));

        targets.addAll(toTargets(
                new UploadAssets(changes.removed()),
                TagStatus.TEMPORARY
        ));

        objectTaggerV2.fileTag(targets);
    }

    @Override
    public void detach(UploadAssets assets) {
        objectTaggerV2.fileTag(toTargets(assets, TagStatus.TEMPORARY));
    }

    private List<S3TagTarget> toTargets(
            UploadAssets assets,
            TagStatus status
    ) {
        return assets.objectUrls().stream()
                .map(objectKeyResolver::resolve)
                .flatMap(Optional::stream)
                .map(objectKey -> new S3TagTarget(objectKey, status))
                .toList();
    }

}
