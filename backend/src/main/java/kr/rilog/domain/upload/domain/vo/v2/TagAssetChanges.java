package kr.rilog.domain.upload.domain.vo.v2;

import java.util.Set;

public record TagAssetChanges(
        Set<String> added,
        Set<String> removed
) {

    public TagAssetChanges {
        added = Set.copyOf(added);
        removed = Set.copyOf(removed);
    }

    public boolean isEmpty() {
        return added.isEmpty() && removed.isEmpty();
    }

}
