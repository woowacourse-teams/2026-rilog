package kr.rilog.domain.upload.domain;

public enum UploadType {

    IMAGE("images"),
    FILE("files");

    private final String directory;

    UploadType(String directory) {
        this.directory = directory;
    }

    public String getDirectory() {
        return directory;
    }
}
