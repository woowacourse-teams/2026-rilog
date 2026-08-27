package kr.rilog.domain.upload.domain.vo;

import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

public record TagAssets(
        Set<String> objectUrls
) {

    public TagAssets {
        objectUrls = Set.copyOf(objectUrls);
    }

    public static TagAssets from(Collection<String> objectUrls) {
        return new TagAssets(new HashSet<>(objectUrls));
    }

    public static TagAssets of(String... objectUrls) {
        return new TagAssets(Arrays.stream(objectUrls).collect(Collectors.toSet()));
    }

    public TagAssets plus(String objectUrl) {
        Set<String> merged = new HashSet<>(objectUrls);
        merged.add(objectUrl);
        return new TagAssets(merged);
    }

    public TagAssetChanges changesTo(TagAssets current) {
        Set<String> added = new HashSet<>(current.objectUrls());
        added.removeAll(objectUrls);

        Set<String> removed = new HashSet<>(objectUrls);
        removed.removeAll(current.objectUrls());

        return new TagAssetChanges(added, removed);
    }


}
