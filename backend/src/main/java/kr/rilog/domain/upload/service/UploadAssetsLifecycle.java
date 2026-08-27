package kr.rilog.domain.upload.service;

import kr.rilog.domain.upload.domain.vo.v2.UploadAssets;

public interface UploadAssetsLifecycle {

    void attach(UploadAssets assets);

    void synchronize(UploadAssets previous, UploadAssets current);

    void detach(UploadAssets assets);

}
