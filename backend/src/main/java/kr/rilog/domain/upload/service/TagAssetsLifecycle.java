package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.vo.TagAssets;

public interface TagAssetsLifecycle {

    void attach(TagAssets assets);

    void synchronize(TagAssets previous, TagAssets current);

    void detach(TagAssets assets);

}
