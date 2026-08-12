package kr.rilog.auth.domain;

public enum GlobalRole {

    USER,
    ADMIN;

    public boolean permits(GlobalRole required) {
        return required != null && (this == ADMIN || this == required);
    }
}
