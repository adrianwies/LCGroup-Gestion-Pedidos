SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET XACT_ABORT ON;

IF COL_LENGTH('dbo.Products','TotalStock') IS NULL
    ALTER TABLE dbo.Products ADD TotalStock decimal(18,3) NULL;
EXEC(N'UPDATE dbo.Products SET TotalStock=COALESCE(TotalStock,Stock) WHERE TotalStock IS NULL;');
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Products') AND name='TotalStock' AND is_nullable=1)
    EXEC(N'ALTER TABLE dbo.Products ALTER COLUMN TotalStock decimal(18,3) NOT NULL;');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.Products') AND name='DF_Products_TotalStock')
    EXEC(N'ALTER TABLE dbo.Products ADD CONSTRAINT DF_Products_TotalStock DEFAULT(0) FOR TotalStock;');
