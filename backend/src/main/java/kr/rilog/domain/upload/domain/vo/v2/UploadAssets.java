package kr.rilog.domain.upload.domain.vo.v2;

import java.util.HashSet;
import java.util.Set;

public record UploadAssets(
        Set<String> objectUrls
) {

    public UploadAssets {
        objectUrls = Set.copyOf(objectUrls);
    }

    public UploadAssetChanges changesTo(UploadAssets current) {
        Set<String> added = new HashSet<>(current.objectUrls());
        added.removeAll(objectUrls);

        Set<String> removed = new HashSet<>(objectUrls);
        removed.removeAll(current.objectUrls());

        return new UploadAssetChanges(added, removed);
    }


}
