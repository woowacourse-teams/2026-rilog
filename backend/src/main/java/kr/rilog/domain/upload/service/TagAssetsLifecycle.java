package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.vo.TagAssets;

public interface TagAssetsLifecycle {

    /** TEMPORARY -> CONFIRMED*/
    void attach(TagAssets assets);

    void synchronize(TagAssets previous, TagAssets current);

    /** CONFIRMED -> TEMPORARY */
    void detach(TagAssets assets);

}
