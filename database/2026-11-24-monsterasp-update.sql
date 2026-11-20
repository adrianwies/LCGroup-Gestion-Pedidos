/*
  Actualización incremental para una base existente en MonsterASP.NET.
  No crea la base, no elimina tablas y no borra registros.
  Puede ejecutarse más de una vez.
*/
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

    IF OBJECT_ID(N'dbo.Users',N'U') IS NULL OR OBJECT_ID(N'dbo.Orders',N'U') IS NULL
        THROW 51100, 'Faltan las tablas base Users u Orders. Ejecute primero el esquema de la aplicación.', 1;

    IF COL_LENGTH(N'dbo.Orders',N'FulfillmentStatus') IS NULL
        EXEC(N'ALTER TABLE dbo.Orders ADD FulfillmentStatus varchar(20) NOT NULL
               CONSTRAINT DF_Orders_FulfillmentStatus DEFAULT(''AwaitingBilling'') WITH VALUES;');

    EXEC(N'UPDATE dbo.Orders
           SET FulfillmentStatus=''AwaitingBilling''
           WHERE FulfillmentStatus IS NULL OR LTRIM(RTRIM(FulfillmentStatus))='''';');

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id=OBJECT_ID(N'dbo.Orders')
          AND name=N'CK_Orders_FulfillmentStatus'
    )
        EXEC(N'ALTER TABLE dbo.Orders WITH CHECK ADD CONSTRAINT CK_Orders_FulfillmentStatus
               CHECK(FulfillmentStatus IN(''AwaitingBilling'',''Billed'',''Picking'',''Ready'',''InTransit'',''Delivered''));');

    IF OBJECT_ID(N'dbo.OrderFulfillmentEvents',N'U') IS NULL
        EXEC(N'CREATE TABLE dbo.OrderFulfillmentEvents(
            Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderFulfillmentEvents PRIMARY KEY,
            OrderId int NOT NULL,
            Status varchar(20) NOT NULL,
            ActorUserId int NOT NULL,
            CreatedAt datetime2 NOT NULL CONSTRAINT DF_OrderFulfillmentEvents_CreatedAt DEFAULT SYSUTCDATETIME(),
            CONSTRAINT FK_OrderFulfillmentEvents_Orders FOREIGN KEY(OrderId) REFERENCES dbo.Orders(Id),
            CONSTRAINT FK_OrderFulfillmentEvents_Users FOREIGN KEY(ActorUserId) REFERENCES dbo.Users(Id),
            CONSTRAINT CK_OrderFulfillmentEvents_Status CHECK(Status IN(''Billed'',''Picking'',''Ready'',''InTransit'',''Delivered''))
        );');

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id=OBJECT_ID(N'dbo.OrderFulfillmentEvents')
          AND name=N'IX_OrderFulfillmentEvents_Order_Status'
    )
        EXEC(N'CREATE INDEX IX_OrderFulfillmentEvents_Order_Status
               ON dbo.OrderFulfillmentEvents(OrderId,Status,CreatedAt);');

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id=OBJECT_ID(N'dbo.Users')
          AND definition LIKE N'%Warehouse%'
    )
    BEGIN
        DECLARE @roleConstraint sysname;
        SELECT TOP(1) @roleConstraint=cc.name
        FROM sys.check_constraints cc
        JOIN sys.columns col ON col.object_id=cc.parent_object_id
        WHERE cc.parent_object_id=OBJECT_ID(N'dbo.Users')
          AND col.name=N'Role'
          AND cc.definition LIKE N'%Role%';

        IF @roleConstraint IS NOT NULL
        BEGIN
            DECLARE @dropRoleSql nvarchar(max)=N'ALTER TABLE dbo.Users DROP CONSTRAINT '+QUOTENAME(@roleConstraint)+N';';
            EXEC sp_executesql @dropRoleSql;
        END;

        IF NOT EXISTS (
            SELECT 1 FROM sys.check_constraints
            WHERE parent_object_id=OBJECT_ID(N'dbo.Users')
              AND name=N'CK_Users_Role_Demo'
        )
            EXEC(N'ALTER TABLE dbo.Users WITH CHECK ADD CONSTRAINT CK_Users_Role_Demo
                   CHECK(Role IN(''Admin'',''Seller'',''Approver'',''Billing'',''Warehouse''));');
    END;

    /* Recupera notificaciones únicamente para eventos ya existentes. */
    IF OBJECT_ID(N'dbo.Notifications',N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.Notifications',N'DeduplicationKey') IS NOT NULL
       AND COL_LENGTH(N'dbo.Notifications',N'ActionUrl') IS NOT NULL
    BEGIN
        INSERT dbo.Notifications(Type,Title,Message,Audience,TargetUserId,ActorUserId,ActionUrl,DeduplicationKey,CreatedAt)
        SELECT CASE WHEN e.Status='Billed' THEN 'billing' ELSE 'order' END,
               CASE e.Status
                 WHEN 'Billed' THEN N'Pedido facturado'
                 WHEN 'Picking' THEN N'Pedido en preparación'
                 WHEN 'Ready' THEN N'Pedido listo en almacén'
                 WHEN 'InTransit' THEN N'Pedido en tránsito'
                 WHEN 'Delivered' THEN N'Pedido entregado' END,
               CASE e.Status
                 WHEN 'Billed' THEN CONCAT(N'El pedido ',o.Number,N' fue facturado.')
                 WHEN 'Picking' THEN CONCAT(N'El pedido ',o.Number,N' está en preparación.')
                 WHEN 'Ready' THEN CONCAT(N'El pedido ',o.Number,N' está listo en almacén.')
                 WHEN 'InTransit' THEN CONCAT(N'El pedido ',o.Number,N' está en tránsito.')
                 WHEN 'Delivered' THEN CONCAT(N'El pedido ',o.Number,N' fue entregado.') END,
               'User',o.SellerId,e.ActorUserId,CONCAT('/?orderNumber=',o.Number),
               CONCAT('fulfillment:',o.Id,':',e.Status),e.CreatedAt
        FROM dbo.OrderFulfillmentEvents e
        JOIN dbo.Orders o ON o.Id=e.OrderId
        WHERE e.Id=(SELECT MIN(firstEvent.Id)
                    FROM dbo.OrderFulfillmentEvents firstEvent
                    WHERE firstEvent.OrderId=e.OrderId AND firstEvent.Status=e.Status)
          AND NOT EXISTS(
              SELECT 1 FROM dbo.Notifications n
              WHERE n.DeduplicationKey=CONCAT('fulfillment:',o.Id,':',e.Status)
                 OR (e.Status='Billed' AND n.DeduplicationKey=CONCAT('billing:',o.Id))
          );
    END;

    COMMIT TRANSACTION;
    PRINT N'Actualización de MonsterASP.NET aplicada o verificada correctamente.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
