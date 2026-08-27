package kr.rilog.domain.upload.domain.vo.v2;

import java.util.Set;

public record UploadAssetChanges(
        Set<String> added,
        Set<String> removed
) {

    public UploadAssetChanges {
        added = Set.copyOf(added);
        removed = Set.copyOf(removed);
    }

    public boolean isEmpty() {
        return added.isEmpty() && removed.isEmpty();
    }

}
