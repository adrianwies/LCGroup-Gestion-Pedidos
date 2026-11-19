/* SQL Server / MonsterASP.NET. Ejecutar conectado a una base demo vacía. */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.DataProtectionKeys',N'U') IS NULL CREATE TABLE dbo.DataProtectionKeys(
 Id int IDENTITY CONSTRAINT PK_DataProtectionKeys PRIMARY KEY,FriendlyName nvarchar(256) NULL,Xml nvarchar(max) NOT NULL,
 CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_DataProtectionKeys_CreatedAt DEFAULT SYSUTCDATETIME());

IF OBJECT_ID(N'dbo.Users',N'U') IS NULL CREATE TABLE dbo.Users(
 Id int IDENTITY CONSTRAINT PK_Users PRIMARY KEY,UserName nvarchar(40) NOT NULL CONSTRAINT UQ_Users_UserName UNIQUE,
 PasswordHash nvarchar(200) NOT NULL,Role varchar(10) NOT NULL,Active bit NOT NULL CONSTRAINT DF_Users_Active DEFAULT(1),
 SellerCode varchar(30) NULL,ApprovalArea varchar(20) NULL,
 CONSTRAINT CK_Users_Role_Demo CHECK(Role IN('Admin','Seller','Approver','Billing')));

IF OBJECT_ID(N'dbo.Products',N'U') IS NULL CREATE TABLE dbo.Products(
 Code varchar(30) CONSTRAINT PK_Products PRIMARY KEY,Description nvarchar(250) NOT NULL,
 Size nvarchar(60) NOT NULL CONSTRAINT DF_Products_Size DEFAULT(N''),Pack int NOT NULL CONSTRAINT DF_Products_Pack DEFAULT(1),
 Stock decimal(18,3) NOT NULL CONSTRAINT DF_Products_Stock DEFAULT(0),StockUnits decimal(18,3) NOT NULL CONSTRAINT DF_Products_StockUnits DEFAULT(0),TotalStock decimal(18,3) NOT NULL CONSTRAINT DF_Products_TotalStock DEFAULT(0),UnitPrice decimal(18,2) NOT NULL CONSTRAINT DF_Products_UnitPrice DEFAULT(0),
 UpdatedAt datetime2(0) NOT NULL CONSTRAINT DF_Products_UpdatedAt DEFAULT SYSUTCDATETIME(),InCurrentStock bit NOT NULL CONSTRAINT DF_Products_InCurrentStock DEFAULT(1),
 CONSTRAINT CK_Products_Pack CHECK(Pack>0),CONSTRAINT CK_Products_Stock CHECK(Stock>=0),CONSTRAINT CK_Products_StockUnits CHECK(StockUnits>=0),CONSTRAINT CK_Products_UnitPrice CHECK(UnitPrice>=0));

IF OBJECT_ID(N'dbo.Sellers',N'U') IS NULL CREATE TABLE dbo.Sellers(
 Code varchar(30) CONSTRAINT PK_Sellers PRIMARY KEY,Name nvarchar(180) NOT NULL,
 Division nvarchar(120) NOT NULL CONSTRAINT DF_Sellers_Division DEFAULT(N''),Active bit NOT NULL CONSTRAINT DF_Sellers_Active DEFAULT(1),
 UpdatedAt datetime2(0) NOT NULL CONSTRAINT DF_Sellers_UpdatedAt DEFAULT SYSUTCDATETIME());

IF OBJECT_ID(N'dbo.Clients',N'U') IS NULL CREATE TABLE dbo.Clients(
 Id int IDENTITY CONSTRAINT PK_Clients PRIMARY KEY,Code varchar(30) NOT NULL CONSTRAINT UQ_Clients_Code UNIQUE,
 Name nvarchar(180) NOT NULL,Ruc varchar(20) NOT NULL CONSTRAINT UQ_Clients_Ruc UNIQUE,
 FiscalAddress nvarchar(250) NOT NULL CONSTRAINT DF_Clients_FiscalAddress DEFAULT(N''),
 DeliveryAddress nvarchar(250) NOT NULL CONSTRAINT DF_Clients_DeliveryAddress DEFAULT(N''),
 PaymentTerms nvarchar(100) NOT NULL CONSTRAINT DF_Clients_PaymentTerms DEFAULT(N''),SellerCode varchar(30) NULL,
 CONSTRAINT FK_Clients_Sellers FOREIGN KEY(SellerCode) REFERENCES dbo.Sellers(Code));

IF OBJECT_ID(N'dbo.UserSellerCodes',N'U') IS NULL CREATE TABLE dbo.UserSellerCodes(
 UserId int NOT NULL,SellerCode varchar(30) NOT NULL,CONSTRAINT PK_UserSellerCodes PRIMARY KEY(UserId,SellerCode),
 CONSTRAINT FK_UserSellerCodes_Users FOREIGN KEY(UserId) REFERENCES dbo.Users(Id),
 CONSTRAINT FK_UserSellerCodes_Sellers FOREIGN KEY(SellerCode) REFERENCES dbo.Sellers(Code));

IF OBJECT_ID(N'dbo.Orders',N'U') IS NULL CREATE TABLE dbo.Orders(
 Id int IDENTITY CONSTRAINT PK_Orders PRIMARY KEY,Number varchar(40) NOT NULL CONSTRAINT UQ_Orders_Number UNIQUE,
 ClientId int NOT NULL,SellerId int NOT NULL,ClientName nvarchar(180) NULL,ClientCode varchar(30) NULL,ClientRuc varchar(20) NULL,FiscalAddress nvarchar(250) NULL,DeliveryAddress nvarchar(250) NOT NULL CONSTRAINT DF_Orders_DeliveryAddress DEFAULT(N''),
 DeliveryNotes nvarchar(500) NOT NULL CONSTRAINT DF_Orders_DeliveryNotes DEFAULT(N''),
 PaymentTerms nvarchar(100) NOT NULL CONSTRAINT DF_Orders_PaymentTerms DEFAULT(N''),
 CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Orders_CreatedAt DEFAULT SYSUTCDATETIME(),SellerCode varchar(30) NULL,
 SequenceYear int NULL,SequenceMonth int NULL,SequenceNo int NULL,
 Status varchar(15) NOT NULL CONSTRAINT DF_Orders_Status_Pending DEFAULT('Pending'),
 StockRestored bit NOT NULL CONSTRAINT DF_Orders_StockRestored DEFAULT(0),
 CONSTRAINT FK_Orders_Clients FOREIGN KEY(ClientId) REFERENCES dbo.Clients(Id),
 CONSTRAINT FK_Orders_Users FOREIGN KEY(SellerId) REFERENCES dbo.Users(Id),
 CONSTRAINT FK_Orders_Sellers FOREIGN KEY(SellerCode) REFERENCES dbo.Sellers(Code),
 CONSTRAINT CK_Orders_Sequence CHECK((SequenceYear IS NULL AND SequenceMonth IS NULL AND SequenceNo IS NULL) OR (SequenceYear>=2000 AND SequenceMonth BETWEEN 1 AND 12 AND SequenceNo>0)),
 CONSTRAINT CK_Orders_Status CHECK(Status IN('Pending','Accepted','Annulled')));

IF OBJECT_ID(N'dbo.OrderItems',N'U') IS NULL CREATE TABLE dbo.OrderItems(
 Id int IDENTITY CONSTRAINT PK_OrderItems PRIMARY KEY,OrderId int NOT NULL,ProductCode varchar(30) NOT NULL,
 Quantity decimal(18,3) NOT NULL,UnitPrice decimal(18,2) NOT NULL,SaleType varchar(10) NOT NULL CONSTRAINT DF_OrderItems_SaleType DEFAULT('Unidad'),Pack int NOT NULL CONSTRAINT DF_OrderItems_Pack DEFAULT(1),QuantityUnits decimal(18,3) NOT NULL CONSTRAINT DF_OrderItems_QuantityUnits DEFAULT(0),
 CONSTRAINT FK_OrderItems_Orders FOREIGN KEY(OrderId) REFERENCES dbo.Orders(Id),
 CONSTRAINT FK_OrderItems_Products FOREIGN KEY(ProductCode) REFERENCES dbo.Products(Code),
 CONSTRAINT CK_OrderItems_Quantity CHECK(Quantity>0),CONSTRAINT CK_OrderItems_UnitPrice CHECK(UnitPrice>=0));

IF OBJECT_ID(N'dbo.Notifications',N'U') IS NULL CREATE TABLE dbo.Notifications(
 Id int IDENTITY CONSTRAINT PK_Notifications PRIMARY KEY,Type varchar(20) NOT NULL,Title nvarchar(120) NOT NULL,Message nvarchar(500) NOT NULL,
 Audience varchar(10) NOT NULL CONSTRAINT DF_Notifications_Audience DEFAULT('All'),TargetUserId int NULL,ActorUserId int NULL,
 ActionUrl nvarchar(300) NULL,DeduplicationKey varchar(160) NULL,ExpiresAt datetime2 NULL,
 CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_Notifications_TargetUser FOREIGN KEY(TargetUserId) REFERENCES dbo.Users(Id),
 CONSTRAINT FK_Notifications_ActorUser FOREIGN KEY(ActorUserId) REFERENCES dbo.Users(Id));

IF OBJECT_ID(N'dbo.NotificationReads',N'U') IS NULL CREATE TABLE dbo.NotificationReads(
 NotificationId int NOT NULL,UserId int NOT NULL,ReadAt datetime2(0) NOT NULL CONSTRAINT DF_NotificationReads_ReadAt DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_NotificationReads PRIMARY KEY(NotificationId,UserId),
 CONSTRAINT FK_NotificationReads_Notifications FOREIGN KEY(NotificationId) REFERENCES dbo.Notifications(Id),
 CONSTRAINT FK_NotificationReads_Users FOREIGN KEY(UserId) REFERENCES dbo.Users(Id));

IF OBJECT_ID(N'dbo.NotificationRecipients',N'U') IS NULL CREATE TABLE dbo.NotificationRecipients(
 NotificationId int NOT NULL,UserId int NOT NULL,
 CONSTRAINT PK_NotificationRecipients PRIMARY KEY(NotificationId,UserId),
 CONSTRAINT FK_NotificationRecipients_Notifications FOREIGN KEY(NotificationId) REFERENCES dbo.Notifications(Id) ON DELETE CASCADE,
 CONSTRAINT FK_NotificationRecipients_Users FOREIGN KEY(UserId) REFERENCES dbo.Users(Id));

IF OBJECT_ID(N'dbo.NotificationPreferences',N'U') IS NULL CREATE TABLE dbo.NotificationPreferences(
 UserId int NOT NULL,Category varchar(20) NOT NULL,
 Enabled bit NOT NULL CONSTRAINT DF_NotificationPreferences_Enabled DEFAULT(1),
 SoundEnabled bit NOT NULL CONSTRAINT DF_NotificationPreferences_Sound DEFAULT(1),
 UpdatedAt datetime2 NOT NULL CONSTRAINT DF_NotificationPreferences_Updated DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_NotificationPreferences PRIMARY KEY(UserId,Category),
 CONSTRAINT FK_NotificationPreferences_Users FOREIGN KEY(UserId) REFERENCES dbo.Users(Id),
 CONSTRAINT CK_NotificationPreferences_Category CHECK(Category IN('order','approval','rejection','credit','billing','stock','system')));

IF OBJECT_ID(N'dbo.PushDevices',N'U') IS NULL CREATE TABLE dbo.PushDevices(
 Id bigint IDENTITY CONSTRAINT PK_PushDevices PRIMARY KEY,UserId int NOT NULL,Name nvarchar(80) NOT NULL,
 Platform nvarchar(40) NOT NULL,Endpoint nvarchar(1000) NOT NULL,P256dh varchar(200) NOT NULL,Auth varchar(100) NOT NULL,
 Active bit NOT NULL CONSTRAINT DF_PushDevices_Active DEFAULT(1),
 ContinueAfterLogout bit NOT NULL CONSTRAINT DF_PushDevices_Continue DEFAULT(1),
 ShowDetailsOnLock bit NOT NULL CONSTRAINT DF_PushDevices_ShowDetails DEFAULT(0),
 CreatedAt datetime2 NOT NULL CONSTRAINT DF_PushDevices_Created DEFAULT SYSUTCDATETIME(),
 LastSeenAt datetime2 NOT NULL CONSTRAINT DF_PushDevices_LastSeen DEFAULT SYSUTCDATETIME(),InvalidAt datetime2 NULL,
 CONSTRAINT UQ_PushDevices_Endpoint UNIQUE(Endpoint),
 CONSTRAINT FK_PushDevices_Users FOREIGN KEY(UserId) REFERENCES dbo.Users(Id));

IF OBJECT_ID(N'dbo.NotificationDeliveries',N'U') IS NULL CREATE TABLE dbo.NotificationDeliveries(
 Id bigint IDENTITY CONSTRAINT PK_NotificationDeliveries PRIMARY KEY,NotificationId int NOT NULL,DeviceId bigint NOT NULL,
 Attempts int NOT NULL CONSTRAINT DF_NotificationDeliveries_Attempts DEFAULT(0),NextAttemptAt datetime2 NOT NULL,
 LockedUntil datetime2 NULL,LockToken uniqueidentifier NULL,DeliveredAt datetime2 NULL,PermanentFailureAt datetime2 NULL,
 LastError nvarchar(1000) NULL,CreatedAt datetime2 NOT NULL CONSTRAINT DF_NotificationDeliveries_Created DEFAULT SYSUTCDATETIME(),
 CONSTRAINT UQ_NotificationDeliveries UNIQUE(NotificationId,DeviceId),
 CONSTRAINT FK_NotificationDeliveries_Notifications FOREIGN KEY(NotificationId) REFERENCES dbo.Notifications(Id) ON DELETE CASCADE,
 CONSTRAINT FK_NotificationDeliveries_PushDevices FOREIGN KEY(DeviceId) REFERENCES dbo.PushDevices(Id) ON DELETE CASCADE);

IF OBJECT_ID(N'dbo.OrderApprovals',N'U') IS NULL CREATE TABLE dbo.OrderApprovals(
 OrderId int NOT NULL,ApprovalArea varchar(20) NOT NULL,ApproverUserId int NOT NULL,Decision varchar(10) NOT NULL,
 DecidedAt datetime2(0) NOT NULL CONSTRAINT DF_OrderApprovals_DecidedAt DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_OrderApprovals PRIMARY KEY(OrderId,ApprovalArea),
 CONSTRAINT FK_OrderApprovals_Orders FOREIGN KEY(OrderId) REFERENCES dbo.Orders(Id),
 CONSTRAINT FK_OrderApprovals_Users FOREIGN KEY(ApproverUserId) REFERENCES dbo.Users(Id),
 CONSTRAINT CK_OrderApprovals_Decision CHECK(Decision IN('Approved','Rejected')));

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Orders') AND name=N'UX_Orders_CodePeriodSequence')
 CREATE UNIQUE INDEX UX_Orders_CodePeriodSequence ON dbo.Orders(SellerCode,SequenceYear,SequenceMonth,SequenceNo) WHERE SequenceNo IS NOT NULL AND SellerCode IS NOT NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Orders') AND name=N'IX_Orders_SellerId_CreatedAt')
 CREATE INDEX IX_Orders_SellerId_CreatedAt ON dbo.Orders(SellerId,CreatedAt DESC);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Orders') AND name=N'IX_Orders_Status_CreatedAt')
 CREATE INDEX IX_Orders_Status_CreatedAt ON dbo.Orders(Status,CreatedAt DESC);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Notifications') AND name=N'IX_Notifications_TargetUser_CreatedAt')
 EXEC(N'CREATE INDEX IX_Notifications_TargetUser_CreatedAt ON dbo.Notifications(TargetUserId,CreatedAt DESC);');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Notifications') AND name=N'UX_Notifications_DeduplicationKey')
 EXEC(N'CREATE UNIQUE INDEX UX_Notifications_DeduplicationKey ON dbo.Notifications(DeduplicationKey) WHERE DeduplicationKey IS NOT NULL;');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.PushDevices') AND name=N'IX_PushDevices_User')
 EXEC(N'CREATE INDEX IX_PushDevices_User ON dbo.PushDevices(UserId,Active);');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.NotificationDeliveries') AND name=N'IX_NotificationDeliveries_Pending')
 EXEC(N'CREATE INDEX IX_NotificationDeliveries_Pending ON dbo.NotificationDeliveries(NextAttemptAt) WHERE DeliveredAt IS NULL AND PermanentFailureAt IS NULL;');

COMMIT TRANSACTION;
PRINT N'Esquema demo creado o verificado correctamente.';
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
