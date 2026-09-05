package kr.rilog.domain.upload.event;

import kr.rilog.domain.upload.domain.vo.TagAssets;

import java.util.Objects;

public sealed interface TagAssetsEvent {

    record Attach(TagAssets assets) implements TagAssetsEvent {

        public Attach {
            Objects.requireNonNull(assets);
        }

    }

    record Synchronize(TagAssets previous, TagAssets current) implements TagAssetsEvent {

        public Synchronize {
            Objects.requireNonNull(previous);
            Objects.requireNonNull(current);
        }

    }

    record Detach(TagAssets assets) implements TagAssetsEvent {

        public Detach {
            Objects.requireNonNull(assets);
        }

    }
}
