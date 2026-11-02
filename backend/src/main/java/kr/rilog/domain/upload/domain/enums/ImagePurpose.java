package kr.rilog.domain.upload.domain.enums;

public enum ImagePurpose {

    PROFILE("profiles"),
    CONTENT("images");

    private final String directory;

    ImagePurpose(String directory) {
        this.directory = directory;
    }

    public String getDirectory() {
        return directory;
    }
}
