SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.Orders','FulfillmentStatus') IS NULL ALTER TABLE dbo.Orders ADD FulfillmentStatus varchar(20) NOT NULL CONSTRAINT DF_Orders_FulfillmentStatus DEFAULT 'AwaitingBilling';
IF OBJECT_ID('dbo.OrderFulfillmentEvents','U') IS NULL CREATE TABLE dbo.OrderFulfillmentEvents(Id int IDENTITY PRIMARY KEY,OrderId int NOT NULL REFERENCES dbo.Orders(Id),Status varchar(20) NOT NULL,ActorUserId int NOT NULL REFERENCES dbo.Users(Id),CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
DECLARE @constraint sysname;
SELECT @constraint=cc.name FROM sys.check_constraints cc WHERE cc.parent_object_id=OBJECT_ID('dbo.Users') AND cc.definition LIKE '%Role%';
IF @constraint IS NOT NULL BEGIN DECLARE @sql nvarchar(max) = N'ALTER TABLE dbo.Users DROP CONSTRAINT ' + QUOTENAME(@constraint); EXEC sp_executesql @sql; END;
ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role_Demo CHECK(Role IN('Admin','Seller','Approver','Billing','Warehouse'));
COMMIT;
