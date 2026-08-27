package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.TagStatus;
import kr.rilog.domain.upload.domain.vo.v2.S3TagTarget;
import kr.rilog.domain.upload.domain.vo.v2.TagAssetChanges;
import kr.rilog.domain.upload.domain.vo.v2.TagAssets;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class S3TagAssetsLifecycle implements TagAssetsLifecycle {

    private final S3ObjectTaggerV2 objectTaggerV2;
    private final S3ObjectKeyResolver objectKeyResolver;

    @Override
    public void attach(TagAssets assets) {
        objectTaggerV2.tag(toTargets(assets, TagStatus.CONFIRMED));
    }

    @Override
    public void synchronize(TagAssets previous, TagAssets current) {
        TagAssetChanges changes = previous.changesTo(current);
        if (changes.isEmpty()) {
            return;
        }

        List<S3TagTarget> targets = new ArrayList<>();

        targets.addAll(toTargets(
                new TagAssets(changes.added()),
                TagStatus.CONFIRMED
        ));

        targets.addAll(toTargets(
                new TagAssets(changes.removed()),
                TagStatus.TEMPORARY
        ));

        objectTaggerV2.tag(targets);
    }

    @Override
    public void detach(TagAssets assets) {
        objectTaggerV2.tag(toTargets(assets, TagStatus.TEMPORARY));
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

}
