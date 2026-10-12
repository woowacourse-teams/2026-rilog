alter table post
    add column post_type enum ('STANDARD', 'DAILY_HEADLINES', 'ENTERPRISE_SPOTLIGHT', 'PERSONAL_SPOTLIGHT')
        not null default 'STANDARD';

alter table post
    add column description varchar(100) null;

alter table post
    add column source_profile_name varchar(255) null;

alter table post
    add column source_profile_image varchar(512) null;
