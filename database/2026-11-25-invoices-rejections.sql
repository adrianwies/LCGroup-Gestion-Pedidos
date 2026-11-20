SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.OrderInvoices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderInvoices(
        Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderInvoices PRIMARY KEY,
        OrderId int NOT NULL,
        Version int NOT NULL,
        InvoiceNumber nvarchar(60) NOT NULL,
        FileName nvarchar(255) NOT NULL,
        ContentType varchar(100) NOT NULL,
        FileLength bigint NOT NULL,
        FileHash char(64) NOT NULL,
        PdfData varbinary(max) NOT NULL,
        Status varchar(12) NOT NULL CONSTRAINT DF_OrderInvoices_Status DEFAULT('Active'),
        UploadedByUserId int NOT NULL,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_OrderInvoices_CreatedAt DEFAULT SYSUTCDATETIME(),
        EndedAt datetime2(0) NULL,
        EndedByUserId int NULL,
        EndReason nvarchar(500) NULL,
        CONSTRAINT FK_OrderInvoices_Orders FOREIGN KEY(OrderId) REFERENCES dbo.Orders(Id),
        CONSTRAINT FK_OrderInvoices_UploadedBy FOREIGN KEY(UploadedByUserId) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_OrderInvoices_EndedBy FOREIGN KEY(EndedByUserId) REFERENCES dbo.Users(Id),
        CONSTRAINT CK_OrderInvoices_Status CHECK(Status IN('Active','Replaced','Annulled')),
        CONSTRAINT CK_OrderInvoices_Version CHECK(Version > 0),
        CONSTRAINT CK_OrderInvoices_FileLength CHECK(FileLength > 0)
    );
END;

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.OrderInvoices') AND name=N'UX_OrderInvoices_ActiveOrder')
    EXEC(N'CREATE UNIQUE INDEX UX_OrderInvoices_ActiveOrder ON dbo.OrderInvoices(OrderId) WHERE Status=''Active'';');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.OrderInvoices') AND name=N'UX_OrderInvoices_OrderVersion')
    EXEC(N'CREATE UNIQUE INDEX UX_OrderInvoices_OrderVersion ON dbo.OrderInvoices(OrderId,Version);');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.OrderInvoices') AND name=N'IX_OrderInvoices_Number')
    EXEC(N'CREATE INDEX IX_OrderInvoices_Number ON dbo.OrderInvoices(InvoiceNumber);');

IF OBJECT_ID(N'dbo.OrderRejections', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderRejections(
        Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderRejections PRIMARY KEY,
        OrderId int NOT NULL,
        RejectedByUserId int NOT NULL,
        Reason nvarchar(500) NOT NULL,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_OrderRejections_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_OrderRejections_Orders FOREIGN KEY(OrderId) REFERENCES dbo.Orders(Id),
        CONSTRAINT FK_OrderRejections_Users FOREIGN KEY(RejectedByUserId) REFERENCES dbo.Users(Id),
        CONSTRAINT CK_OrderRejections_Reason CHECK(LEN(LTRIM(RTRIM(Reason))) >= 3)
    );
END;

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.OrderRejections') AND name=N'UX_OrderRejections_Order')
    EXEC(N'CREATE UNIQUE INDEX UX_OrderRejections_Order ON dbo.OrderRejections(OrderId);');

COMMIT;
