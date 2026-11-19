/* Incremental, idempotent. Execute against the demo database; never production. */
set ansi_nulls on;
set quoted_identifier on;
set ansi_padding on;
set ansi_warnings on;
set concat_null_yields_null on;
set arithabort on;
set numeric_roundabort off;
set xact_abort on;
begin transaction;

if col_length('Notifications','ActionUrl') is null alter table Notifications add ActionUrl nvarchar(300) null;
if col_length('Notifications','DeduplicationKey') is null alter table Notifications add DeduplicationKey varchar(160) null;
if col_length('Notifications','ExpiresAt') is null alter table Notifications add ExpiresAt datetime2 null;
if not exists(select 1 from sys.indexes where name='UX_Notifications_DeduplicationKey' and object_id=object_id('Notifications'))
  exec(N'create unique index UX_Notifications_DeduplicationKey on Notifications(DeduplicationKey) where DeduplicationKey is not null;');

if object_id('NotificationRecipients') is null create table NotificationRecipients(
  NotificationId int not null references Notifications(Id) on delete cascade,
  UserId int not null references Users(Id),
  primary key(NotificationId,UserId)
);

if object_id('NotificationPreferences') is null create table NotificationPreferences(
  UserId int not null references Users(Id),
  Category varchar(20) not null,
  Enabled bit not null constraint DF_NotificationPreferences_Enabled default 1,
  SoundEnabled bit not null constraint DF_NotificationPreferences_Sound default 1,
  UpdatedAt datetime2 not null constraint DF_NotificationPreferences_Updated default sysutcdatetime(),
  primary key(UserId,Category),
  constraint CK_NotificationPreferences_Category check(Category in('order','approval','rejection','credit','billing','stock','system'))
);

if object_id('PushDevices') is null create table PushDevices(
  Id bigint identity primary key,
  UserId int not null references Users(Id),
  Name nvarchar(80) not null,
  Platform nvarchar(40) not null,
  Endpoint nvarchar(1000) not null,
  P256dh varchar(200) not null,
  Auth varchar(100) not null,
  Active bit not null constraint DF_PushDevices_Active default 1,
  ContinueAfterLogout bit not null constraint DF_PushDevices_Continue default 1,
  ShowDetailsOnLock bit not null constraint DF_PushDevices_ShowDetails default 0,
  CreatedAt datetime2 not null constraint DF_PushDevices_Created default sysutcdatetime(),
  LastSeenAt datetime2 not null constraint DF_PushDevices_LastSeen default sysutcdatetime(),
  InvalidAt datetime2 null,
  constraint UX_PushDevices_Endpoint unique(Endpoint)
);
if col_length('PushDevices','ShowDetailsOnLock') is null exec(N'alter table PushDevices add ShowDetailsOnLock bit not null constraint DF_PushDevices_ShowDetails default 0;');
if not exists(select 1 from sys.indexes where name='IX_PushDevices_User' and object_id=object_id('PushDevices'))
  exec(N'create index IX_PushDevices_User on PushDevices(UserId,Active);');

if object_id('NotificationDeliveries') is null create table NotificationDeliveries(
  Id bigint identity primary key,
  NotificationId int not null references Notifications(Id) on delete cascade,
  DeviceId bigint not null references PushDevices(Id) on delete cascade,
  Attempts int not null constraint DF_NotificationDeliveries_Attempts default 0,
  NextAttemptAt datetime2 not null,
  LockedUntil datetime2 null,
  LockToken uniqueidentifier null,
  DeliveredAt datetime2 null,
  PermanentFailureAt datetime2 null,
  LastError nvarchar(1000) null,
  CreatedAt datetime2 not null constraint DF_NotificationDeliveries_Created default sysutcdatetime(),
  constraint UX_NotificationDeliveries unique(NotificationId,DeviceId)
);
if col_length('NotificationDeliveries','LockedUntil') is null alter table NotificationDeliveries add LockedUntil datetime2 null;
if col_length('NotificationDeliveries','LockToken') is null alter table NotificationDeliveries add LockToken uniqueidentifier null;
if not exists(select 1 from sys.indexes where name='IX_NotificationDeliveries_Pending' and object_id=object_id('NotificationDeliveries'))
  exec(N'create index IX_NotificationDeliveries_Pending on NotificationDeliveries(NextAttemptAt) where DeliveredAt is null and PermanentFailureAt is null;');

commit;
