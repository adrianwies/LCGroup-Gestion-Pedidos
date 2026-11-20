SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRANSACTION;

DECLARE @dropStatus nvarchar(max)=N'';
SELECT @dropStatus=@dropStatus+N'ALTER TABLE dbo.Orders DROP CONSTRAINT '+QUOTENAME(cc.name)+N';'
FROM sys.check_constraints cc
WHERE cc.parent_object_id=OBJECT_ID(N'dbo.Orders')
  AND cc.name<>N'CK_Orders_Status_Workflow'
  AND (cc.definition LIKE N'%[[]Status[]]%' OR cc.definition LIKE N'%Status%');
IF LEN(@dropStatus)>0 EXEC sp_executesql @dropStatus;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.Orders') AND name=N'CK_Orders_Status_Workflow')
    ALTER TABLE dbo.Orders ADD CONSTRAINT CK_Orders_Status_Workflow CHECK(Status IN('Pending','Observed','Accepted','Annulled'));

IF COL_LENGTH(N'dbo.OrderRejections',N'FinalizedAt') IS NULL ALTER TABLE dbo.OrderRejections ADD FinalizedAt datetime2(0) NULL;
IF COL_LENGTH(N'dbo.OrderRejections',N'FinalizedByUserId') IS NULL ALTER TABLE dbo.OrderRejections ADD FinalizedByUserId int NULL;
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.OrderRejections') AND name=N'FK_OrderRejections_FinalizedBy')
    ALTER TABLE dbo.OrderRejections ADD CONSTRAINT FK_OrderRejections_FinalizedBy FOREIGN KEY(FinalizedByUserId) REFERENCES dbo.Users(Id);

IF OBJECT_ID(N'dbo.OrderApprovalEvents',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderApprovalEvents(
        Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderApprovalEvents PRIMARY KEY,
        OrderId int NOT NULL,ApprovalRole varchar(20) NOT NULL,ActorUserId int NOT NULL,
        Action varchar(30) NOT NULL,Reason nvarchar(500) NULL,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_OrderApprovalEvents_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_OrderApprovalEvents_Order FOREIGN KEY(OrderId) REFERENCES dbo.Orders(Id),
        CONSTRAINT FK_OrderApprovalEvents_User FOREIGN KEY(ActorUserId) REFERENCES dbo.Users(Id),
        CONSTRAINT CK_OrderApprovalEvents_Role CHECK(ApprovalRole IN('Credits','Commercial')),
        CONSTRAINT CK_OrderApprovalEvents_Action CHECK(Action IN('Approved','Observed','ObservationApproved','RejectionConfirmed','Cancelled','CommercialEdited','CreditsReset'))
    );
END;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.OrderApprovalEvents') AND name=N'IX_OrderApprovalEvents_Order')
    EXEC(N'CREATE INDEX IX_OrderApprovalEvents_Order ON dbo.OrderApprovalEvents(OrderId,CreatedAt,Id);');

IF OBJECT_ID(N'dbo.OrderItemChanges',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItemChanges(
        Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderItemChanges PRIMARY KEY,
        OrderId int NOT NULL,ChangedByUserId int NOT NULL,ChangeReason nvarchar(300) NULL,
        BeforeJson nvarchar(max) NOT NULL,AfterJson nvarchar(max) NOT NULL,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_OrderItemChanges_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_OrderItemChanges_Order FOREIGN KEY(OrderId) REFERENCES dbo.Orders(Id),
        CONSTRAINT FK_OrderItemChanges_User FOREIGN KEY(ChangedByUserId) REFERENCES dbo.Users(Id),
        CONSTRAINT CK_OrderItemChanges_BeforeJson CHECK(ISJSON(BeforeJson)=1),
        CONSTRAINT CK_OrderItemChanges_AfterJson CHECK(ISJSON(AfterJson)=1)
    );
END;

UPDATE dbo.Users SET ApprovalArea='Commercial' WHERE Role='Approver' AND ApprovalArea='Alfredo';

COMMIT;
