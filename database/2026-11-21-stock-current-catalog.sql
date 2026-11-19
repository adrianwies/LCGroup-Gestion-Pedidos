SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET XACT_ABORT ON;

IF COL_LENGTH('dbo.Products','InCurrentStock') IS NULL
    ALTER TABLE dbo.Products ADD InCurrentStock bit NULL;
EXEC(N'UPDATE dbo.Products SET InCurrentStock=1 WHERE InCurrentStock IS NULL;');
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Products') AND name='InCurrentStock' AND is_nullable=1)
    EXEC(N'ALTER TABLE dbo.Products ALTER COLUMN InCurrentStock bit NOT NULL;');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints WHERE parent_object_id=OBJECT_ID('dbo.Products') AND name='DF_Products_InCurrentStock')
    EXEC(N'ALTER TABLE dbo.Products ADD CONSTRAINT DF_Products_InCurrentStock DEFAULT(1) FOR InCurrentStock;');
