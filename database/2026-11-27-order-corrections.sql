SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.OrderCorrectionRequests',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderCorrectionRequests(
        Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderCorrectionRequests PRIMARY KEY,
        OrderId int NOT NULL,
        RequestedByUserId int NOT NULL,
        Reason nvarchar(500) NOT NULL,
        ProposedItemsJson nvarchar(max) NOT NULL,
        Status varchar(12) NOT NULL CONSTRAINT DF_OrderCorrectionRequests_Status DEFAULT('Pending'),
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_OrderCorrectionRequests_CreatedAt DEFAULT SYSUTCDATETIME(),
        ResolvedByUserId int NULL,
        ResolvedAt datetime2(0) NULL,
        ResolutionReason nvarchar(500) NULL,
        CONSTRAINT FK_OrderCorrectionRequests_Order FOREIGN KEY(OrderId) REFERENCES dbo.Orders(Id),
        CONSTRAINT FK_OrderCorrectionRequests_RequestedBy FOREIGN KEY(RequestedByUserId) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_OrderCorrectionRequests_ResolvedBy FOREIGN KEY(ResolvedByUserId) REFERENCES dbo.Users(Id),
        CONSTRAINT CK_OrderCorrectionRequests_Status CHECK(Status IN('Pending','Applied','Rejected')),
        CONSTRAINT CK_OrderCorrectionRequests_Json CHECK(ISJSON(ProposedItemsJson)=1),
        CONSTRAINT CK_OrderCorrectionRequests_Reason CHECK(LEN(LTRIM(RTRIM(Reason)))>=3)
    );
END;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.OrderCorrectionRequests') AND name=N'UX_OrderCorrectionRequests_Pending')
    EXEC(N'CREATE UNIQUE INDEX UX_OrderCorrectionRequests_Pending ON dbo.OrderCorrectionRequests(OrderId) WHERE Status=''Pending'';');

DECLARE @eventCheck sysname;
SELECT @eventCheck=cc.name FROM sys.check_constraints cc
WHERE cc.parent_object_id=OBJECT_ID(N'dbo.OrderApprovalEvents') AND cc.definition LIKE N'%CommercialEdited%';
IF @eventCheck IS NOT NULL
BEGIN
    DECLARE @dropEventCheck nvarchar(500)=N'ALTER TABLE dbo.OrderApprovalEvents DROP CONSTRAINT '+QUOTENAME(@eventCheck);
    EXEC sp_executesql @dropEventCheck;
END;
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.OrderApprovalEvents') AND name=N'CK_OrderApprovalEvents_Action_v2')
    ALTER TABLE dbo.OrderApprovalEvents ADD CONSTRAINT CK_OrderApprovalEvents_Action_v2 CHECK(Action IN('Approved','Observed','ObservationApproved','RejectionConfirmed','Cancelled','CommercialEdited','SellerEdited','CreditsReset','CorrectionRequested','CorrectionApplied'));

COMMIT;
