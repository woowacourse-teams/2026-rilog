create table notification
(
    id           bigint auto_increment primary key,
    recipient_id bigint      not null,
    type         varchar(64) not null,
    source_type  varchar(32) not null,
    source_id    bigint      not null,
    created_at   datetime(6) not null,
    read_at      datetime(6) null,
    constraint fk_notification_recipient
        foreign key (recipient_id) references users (id)
);
