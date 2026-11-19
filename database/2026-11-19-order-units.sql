SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.Products', 'StockUnits') IS NULL
    ALTER TABLE dbo.Products ADD StockUnits decimal(18,3) NULL;
EXEC(N'UPDATE dbo.Products SET StockUnits = Stock * Pack WHERE StockUnits IS NULL;');
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Products') AND name='StockUnits' AND is_nullable=1)
    EXEC(N'ALTER TABLE dbo.Products ALTER COLUMN StockUnits decimal(18,3) NOT NULL;');
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.Products') AND name='DF_Products_StockUnits')
    EXEC(N'ALTER TABLE dbo.Products ADD CONSTRAINT DF_Products_StockUnits DEFAULT(0) FOR StockUnits;');
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.Products') AND name='CK_Products_StockUnits')
    EXEC(N'ALTER TABLE dbo.Products ADD CONSTRAINT CK_Products_StockUnits CHECK(StockUnits >= 0);');

IF COL_LENGTH('dbo.OrderItems', 'SaleType') IS NULL
    ALTER TABLE dbo.OrderItems ADD SaleType varchar(10) NULL;
IF COL_LENGTH('dbo.OrderItems', 'Pack') IS NULL
    ALTER TABLE dbo.OrderItems ADD Pack int NULL;
IF COL_LENGTH('dbo.OrderItems', 'QuantityUnits') IS NULL
    ALTER TABLE dbo.OrderItems ADD QuantityUnits decimal(18,3) NULL;
EXEC(N'UPDATE i SET SaleType=COALESCE(SaleType,''Caja''), Pack=COALESCE(i.Pack,p.Pack), QuantityUnits=COALESCE(QuantityUnits,i.Quantity*COALESCE(i.Pack,p.Pack)) FROM dbo.OrderItems i JOIN dbo.Products p ON p.Code=i.ProductCode WHERE SaleType IS NULL OR i.Pack IS NULL OR QuantityUnits IS NULL;');
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.OrderItems') AND name='SaleType' AND is_nullable=1)
    EXEC(N'ALTER TABLE dbo.OrderItems ALTER COLUMN SaleType varchar(10) NOT NULL;');
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.OrderItems') AND name='Pack' AND is_nullable=1)
    EXEC(N'ALTER TABLE dbo.OrderItems ALTER COLUMN Pack int NOT NULL;');
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.OrderItems') AND name='QuantityUnits' AND is_nullable=1)
    EXEC(N'ALTER TABLE dbo.OrderItems ALTER COLUMN QuantityUnits decimal(18,3) NOT NULL;');
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.OrderItems') AND name='DF_OrderItems_SaleType')
    EXEC(N'ALTER TABLE dbo.OrderItems ADD CONSTRAINT DF_OrderItems_SaleType DEFAULT(''Unidad'') FOR SaleType;');
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.OrderItems') AND name='DF_OrderItems_Pack')
    EXEC(N'ALTER TABLE dbo.OrderItems ADD CONSTRAINT DF_OrderItems_Pack DEFAULT(1) FOR Pack;');
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.OrderItems') AND name='DF_OrderItems_QuantityUnits')
    EXEC(N'ALTER TABLE dbo.OrderItems ADD CONSTRAINT DF_OrderItems_QuantityUnits DEFAULT(0) FOR QuantityUnits;');

IF COL_LENGTH('dbo.Orders', 'ClientName') IS NULL ALTER TABLE dbo.Orders ADD ClientName nvarchar(180) NULL;
IF COL_LENGTH('dbo.Orders', 'ClientCode') IS NULL ALTER TABLE dbo.Orders ADD ClientCode varchar(30) NULL;
IF COL_LENGTH('dbo.Orders', 'ClientRuc') IS NULL ALTER TABLE dbo.Orders ADD ClientRuc varchar(20) NULL;
IF COL_LENGTH('dbo.Orders', 'FiscalAddress') IS NULL ALTER TABLE dbo.Orders ADD FiscalAddress nvarchar(250) NULL;
EXEC(N'UPDATE o SET ClientName=COALESCE(o.ClientName,c.Name),ClientCode=COALESCE(o.ClientCode,c.Code),ClientRuc=COALESCE(o.ClientRuc,c.Ruc),FiscalAddress=COALESCE(o.FiscalAddress,c.FiscalAddress) FROM dbo.Orders o JOIN dbo.Clients c ON c.Id=o.ClientId WHERE o.ClientName IS NULL OR o.ClientCode IS NULL OR o.ClientRuc IS NULL OR o.FiscalAddress IS NULL;');

COMMIT;
