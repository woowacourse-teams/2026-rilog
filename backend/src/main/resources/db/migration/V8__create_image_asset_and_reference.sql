create table image_asset
(
    id              bigint auto_increment primary key,
    object_key      varchar(512) character set utf8mb4 collate utf8mb4_0900_bin not null,
    uploader_id     bigint       not null,
    status          varchar(32)  not null,
    unreferenced_at datetime(6)  null,
    created_at      datetime(6)  null,
    updated_at      datetime(6)  null,
    deleted_at      datetime(6)  null,
    constraint uk_image_asset_object_key unique (object_key)
);

create table image_reference
(
    id              bigint auto_increment primary key,
    image_asset_id  bigint       not null,
    reference_type  varchar(32)  not null,
    reference_id    bigint       not null,
    created_at      datetime(6)  null,
    updated_at      datetime(6)  null,
    deleted_at      datetime(6)  null,
    constraint fk_image_reference_asset foreign key (image_asset_id) references image_asset (id),
    constraint uk_image_reference_source unique (image_asset_id, reference_type, reference_id)
);
