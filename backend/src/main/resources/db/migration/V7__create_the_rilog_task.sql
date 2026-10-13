create table the_rilog_task
(
    id             bigint                                                                          not null auto_increment,
    created_at     datetime(6)                                                                     null,
    updated_at     datetime(6)                                                                     null,
    deleted_at     datetime(6)                                                                     null,
    spreadsheet_id varchar(128) collate utf8mb4_bin                                                 not null,
    row_id         varchar(128) collate utf8mb4_bin                                                 not null,
    content_type   enum ('SPOTLIGHT', 'NEWS')                                                       not null,
    source_url     varchar(2048)                                                                   null,
    category       enum ('TECH', 'DAILY', 'RETROSPECT')                                             not null,
    scheduled_at   timestamp(6)                                                                    not null,
    status         enum ('PRODUCTION_PENDING', 'REVIEW_PENDING', 'APPROVED', 'PUBLISHED')             not null,
    collected_at   timestamp(6)                                                                    not null,
    post_id        bigint                                                                          null,
    published_at   timestamp(6)                                                                    null,
    primary key (id),
    constraint uk_the_rilog_task_sheet_row unique (spreadsheet_id, row_id)
) character set utf8mb4;
