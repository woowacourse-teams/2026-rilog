package kr.rilog.domain.upload.domain.vo;

import java.util.HashSet;
import java.util.Set;

public record TagAssets(
        Set<String> objectUrls
) {

    public TagAssets {
        objectUrls = Set.copyOf(objectUrls);
    }

    public TagAssetChanges changesTo(TagAssets current) {
        Set<String> added = new HashSet<>(current.objectUrls());
        added.removeAll(objectUrls);

        Set<String> removed = new HashSet<>(objectUrls);
        removed.removeAll(current.objectUrls());

        return new TagAssetChanges(added, removed);
    }


}
