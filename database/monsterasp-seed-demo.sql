/*
 Datos 100 % ficticios para PRUEBAS. Requiere monsterasp-schema.sql. No usar para operaciones reales.
 Las cuentas se insertan con PBKDF2-SHA256 (210000 iteraciones).
 Una cuenta existente nunca cambia de hash, rol o estado al repetir este script.
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
IF EXISTS(SELECT 1 FROM dbo.Users) OR EXISTS(SELECT 1 FROM dbo.Orders) THROW 51010, 'El seed requiere una base de aplicaci?n sin usuarios ni pedidos.', 1;
BEGIN TRY
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.Users',N'U') IS NULL THROW 51000,'Primero debe ejecutar database/demo-schema.sql.',1;

IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE UserName=N'admin')
 INSERT dbo.Users(UserName,PasswordHash,Role,Active,SellerCode,ApprovalArea) VALUES(N'admin',N'jhnvH7mWYCfmBTdjY8/RxQ==.64jPpUTWzat6CEMk44qJ9/bbDHHeqaCsqTi4snrgGw0=',N'Admin',1,NULL,NULL);
IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE UserName=N'vendedor')
 INSERT dbo.Users(UserName,PasswordHash,Role,Active,SellerCode,ApprovalArea) VALUES(N'vendedor',N'L8UiXZYwi4e6o8A8zTm7nQ==.5zkZdI7TqC01KpbusypvwAEES/g3v9fWyfVeGiSZsRw=',N'Seller',1,N'VEND-001',NULL);
IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE UserName=N'alfredo')
 INSERT dbo.Users(UserName,PasswordHash,Role,Active,SellerCode,ApprovalArea) VALUES(N'alfredo',N'dgLWG5TKeEE96q3DRO7K2g==.JnumqBWoGVGDhTbAxXjImU9HgCruw8ApbOCzXdC/3c8=',N'Approver',1,NULL,N'Alfredo');
IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE UserName=N'creditos')
 INSERT dbo.Users(UserName,PasswordHash,Role,Active,SellerCode,ApprovalArea) VALUES(N'creditos',N'u7fsbGUSqlxlzL5AFtES2A==.XOilo2k9ZAoumg0w3vIJ6ctOl3nj37ZQumZV9pPCy5g=',N'Approver',1,NULL,N'Credits');
IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE UserName=N'facturacion')
 INSERT dbo.Users(UserName,PasswordHash,Role,Active,SellerCode,ApprovalArea) VALUES(N'facturacion',N'dsfHF40L1BMFgVxh8kgF1g==.Kh32ZWTb/G3vQ0Hao8WwLjwW0M7WXriFk2U1UTA11Pc=',N'Billing',1,NULL,NULL);

INSERT dbo.Users(UserName,PasswordHash,Role,Active) VALUES(N'almacen',N'gra6tYBXqJortn/xkCiWYw==.gLWKf7fEQbM7djYp7xA5jwPno5I+R+cH+CvmA69retY=',N'Warehouse',1);

MERGE dbo.Sellers AS t USING(VALUES
 ('VEND-001',N'Vendedor 1',N'Vinos'),('VEND-002',N'Vendedor 2',N'Vinos'),('VEND-003',N'Vendedor 3',N'Vinos'),
 ('VEND-004',N'Vendedor 4',N'Vinos'),('VEND-005',N'Vendedor 5',N'Vinos'))s(Code,Name,Division) ON t.Code=s.Code
WHEN MATCHED THEN UPDATE SET Name=s.Name,Division=s.Division,Active=1,UpdatedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT(Code,Name,Division) VALUES(s.Code,s.Name,s.Division);

MERGE dbo.Clients AS t USING(VALUES
 ('CLI-001',N'Cliente 1','20000000001',N'Dirección fiscal 1',N'Dirección de entrega 1',N'Contado','VEND-001'),
 ('CLI-002',N'Cliente 2','20000000002',N'Dirección fiscal 2',N'Dirección de entrega 2',N'Crédito 15 días','VEND-002'),
 ('CLI-003',N'Cliente 3','20000000003',N'Dirección fiscal 3',N'Dirección de entrega 3',N'Contado','VEND-003'),
 ('CLI-004',N'Cliente 4','20000000004',N'Dirección fiscal 4',N'Dirección de entrega 4',N'Crédito 30 días','VEND-004'),
 ('CLI-005',N'Cliente 5','20000000005',N'Dirección fiscal 5',N'Dirección de entrega 5',N'Contado','VEND-005'))s(Code,Name,Ruc,FiscalAddress,DeliveryAddress,PaymentTerms,SellerCode) ON t.Code=s.Code
WHEN MATCHED THEN UPDATE SET Name=s.Name,Ruc=s.Ruc,FiscalAddress=s.FiscalAddress,DeliveryAddress=s.DeliveryAddress,PaymentTerms=s.PaymentTerms,SellerCode=s.SellerCode
WHEN NOT MATCHED THEN INSERT(Code,Name,Ruc,FiscalAddress,DeliveryAddress,PaymentTerms,SellerCode) VALUES(s.Code,s.Name,s.Ruc,s.FiscalAddress,s.DeliveryAddress,s.PaymentTerms,s.SellerCode);

MERGE dbo.Products AS t USING(VALUES
 ('VIN-001',N'Vino tinto 1',N'750 ML',6,100.000,25.00),('VIN-002',N'Vino tinto 2',N'750 ML',12,120.000,28.00),
 ('VIN-003',N'Vino tinto 3',N'750 ML',6,140.000,32.00),('VIN-004',N'Vino tinto 4',N'1 LT',12,160.000,35.00),
 ('VIN-005',N'Vino tinto 5',N'1 LT',6,180.000,40.00))s(Code,Description,Size,Pack,Stock,UnitPrice) ON t.Code=s.Code
WHEN MATCHED THEN UPDATE SET Description=s.Description,Size=s.Size,Pack=s.Pack,Stock=s.Stock,StockUnits=s.Stock*s.Pack,TotalStock=s.Stock,UnitPrice=s.UnitPrice,UpdatedAt=SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT(Code,Description,Size,Pack,Stock,StockUnits,TotalStock,UnitPrice) VALUES(s.Code,s.Description,s.Size,s.Pack,s.Stock,s.Stock*s.Pack,s.Stock,s.UnitPrice);

INSERT dbo.UserSellerCodes(UserId,SellerCode)
SELECT u.Id,s.Code FROM dbo.Users u CROSS JOIN dbo.Sellers s
WHERE u.UserName=N'vendedor' AND s.Code IN('VEND-001','VEND-002','VEND-003','VEND-004','VEND-005')
AND NOT EXISTS(SELECT 1 FROM dbo.UserSellerCodes x WHERE x.UserId=u.Id AND x.SellerCode=s.Code);

DECLARE @seller int=(SELECT Id FROM dbo.Users WHERE UserName=N'vendedor');
DECLARE @alfredo int=(SELECT Id FROM dbo.Users WHERE UserName=N'alfredo');
DECLARE @credits int=(SELECT Id FROM dbo.Users WHERE UserName=N'creditos');
DECLARE @client1 int=(SELECT Id FROM dbo.Clients WHERE Code='CLI-001');
DECLARE @client2 int=(SELECT Id FROM dbo.Clients WHERE Code='CLI-002');
IF @seller IS NULL OR @alfredo IS NULL OR @credits IS NULL THROW 51001,'No se pudieron preparar las cuentas demo.',1;

IF NOT EXISTS(SELECT 1 FROM dbo.Orders WHERE Number IN ('DEMO-APROBADA-001','DEMO-RECHAZADA-001'))
BEGIN
INSERT dbo.Orders(Number,ClientId,SellerId,ClientName,ClientCode,ClientRuc,FiscalAddress,DeliveryAddress,DeliveryNotes,PaymentTerms,CreatedAt,SellerCode,SequenceYear,SequenceMonth,SequenceNo,Status,StockRestored)
SELECT 'DEMO-APROBADA-001',@client1,@seller,Name,Code,Ruc,FiscalAddress,N'Dirección de entrega 1',N'Orden ficticia aprobada.',N'Contado',DATEADD(minute,-45,SYSUTCDATETIME()),'VEND-001',2099,1,1,'Accepted',0 FROM dbo.Clients WHERE Id=@client1;
DECLARE @approved int=CONVERT(int,SCOPE_IDENTITY());
INSERT dbo.OrderItems(OrderId,ProductCode,Quantity,UnitPrice,SaleType,Pack,QuantityUnits) VALUES(@approved,'VIN-001',2,25.00,'Unidad',6,2),(@approved,'VIN-003',1,32.00,'Unidad',6,1);
INSERT dbo.OrderApprovals(OrderId,ApprovalArea,ApproverUserId,Decision,DecidedAt) VALUES
 (@approved,'Alfredo',@alfredo,'Approved',DATEADD(minute,-35,SYSUTCDATETIME())),(@approved,'Credits',@credits,'Approved',DATEADD(minute,-25,SYSUTCDATETIME()));

INSERT dbo.Orders(Number,ClientId,SellerId,ClientName,ClientCode,ClientRuc,FiscalAddress,DeliveryAddress,DeliveryNotes,PaymentTerms,CreatedAt,SellerCode,SequenceYear,SequenceMonth,SequenceNo,Status,StockRestored)
SELECT 'DEMO-RECHAZADA-001',@client2,@seller,Name,Code,Ruc,FiscalAddress,N'Dirección de entrega 2',N'Orden ficticia rechazada.',N'Crédito 15 días',DATEADD(minute,-30,SYSUTCDATETIME()),'VEND-002',2099,1,1,'Annulled',1 FROM dbo.Clients WHERE Id=@client2;
DECLARE @rejected int=CONVERT(int,SCOPE_IDENTITY());
INSERT dbo.OrderItems(OrderId,ProductCode,Quantity,UnitPrice,SaleType,Pack,QuantityUnits) VALUES(@rejected,'VIN-002',1,28.00,'Unidad',12,1);
INSERT dbo.OrderApprovals(OrderId,ApprovalArea,ApproverUserId,Decision,DecidedAt) VALUES
 (@rejected,'Alfredo',@alfredo,'Approved',DATEADD(minute,-15,SYSUTCDATETIME())),(@rejected,'Credits',@credits,'Rejected',DATEADD(minute,-10,SYSUTCDATETIME()));

INSERT dbo.Notifications(Type,Title,Message,Audience,ActorUserId,ActionUrl,DeduplicationKey,CreatedAt) VALUES
 ('Demo',N'Orden aprobada',N'La orden DEMO-APROBADA-001 fue aprobada.',N'All',@credits,N'/orders/DEMO-APROBADA-001','demo-order-approved-001',DATEADD(minute,-25,SYSUTCDATETIME())),
 ('Demo',N'Orden rechazada',N'La orden DEMO-RECHAZADA-001 fue rechazada y su stock restaurado.',N'All',@credits,N'/orders/DEMO-RECHAZADA-001','demo-order-rejected-001',DATEADD(minute,-10,SYSUTCDATETIME()));
END;

COMMIT TRANSACTION;
PRINT N'Datos demo insertados. Las cuentas existentes no fueron modificadas.';
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;


/* Usuarios y pedidos adicionales de demostraci?n. */
-- Solo para APLICACION_CONTA_DESARROLLO. Datos ficticios, inserción idempotente.
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET CONCAT_NULL_YIELDS_NULL ON; SET ARITHABORT ON; SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON; SET XACT_ABORT ON;

BEGIN TRANSACTION;
DECLARE @i int=1, @n int, @code varchar(30), @username nvarchar(40), @uid int, @client int, @oid int, @number varchar(40), @status varchar(15), @approver int=(SELECT Id FROM Users WHERE UserName='alfredo'), @creditsLocal int=(SELECT Id FROM Users WHERE UserName='creditos');
WHILE @i<=5
BEGIN
 SET @code=CONCAT('VEND-',RIGHT('000'+CAST(@i AS varchar),3)); SET @username=CONCAT('vendedor',@i);
 IF NOT EXISTS(SELECT 1 FROM Users WHERE UserName=@username)
  INSERT Users(UserName,PasswordHash,Role,Active,SellerCode) VALUES(@username,'L8UiXZYwi4e6o8A8zTm7nQ==.5zkZdI7TqC01KpbusypvwAEES/g3v9fWyfVeGiSZsRw=','Seller',1,@code);
 SELECT @uid=Id FROM Users WHERE UserName=@username AND Role='Seller';
 IF @uid IS NULL THROW 51001, 'El nombre de cuenta ya existe con otro rol.', 1;
 IF NOT EXISTS(SELECT 1 FROM UserSellerCodes WHERE UserId=@uid AND SellerCode=@code) INSERT UserSellerCodes VALUES(@uid,@code);
 SELECT @client=Id FROM Clients WHERE Code=CONCAT('CLI-',RIGHT('000'+CAST(@i AS varchar),3));
 IF @client IS NULL OR @approver IS NULL OR @creditsLocal IS NULL THROW 51002, 'Faltan clientes o aprobadores demo.', 1;
 SET @n=1;
 WHILE @n<=10
 BEGIN
  SET @number=CONCAT('PRUEBA-',RIGHT('000'+CAST(@i AS varchar),3),'-',RIGHT('00'+CAST(@n AS varchar),2));
  IF NOT EXISTS(SELECT 1 FROM Orders WHERE Number=@number)
  BEGIN
   SET @status=CASE WHEN @n<=3 THEN 'Accepted' WHEN @n<=6 THEN 'Annulled' ELSE 'Pending' END;
   INSERT Orders(Number,ClientId,SellerId,ClientName,ClientCode,ClientRuc,FiscalAddress,DeliveryAddress,DeliveryNotes,PaymentTerms,CreatedAt,SellerCode,Status,StockRestored)
    SELECT @number,Id,@uid,Name,Code,Ruc,FiscalAddress,DeliveryAddress,N'Pedido ficticio de prueba',PaymentTerms,DATEADD(day,-@n,SYSUTCDATETIME()),@code,@status,CASE WHEN @status='Annulled' THEN 1 ELSE 0 END FROM Clients WHERE Id=@client;
   SET @oid=SCOPE_IDENTITY();
   INSERT OrderItems(OrderId,ProductCode,Quantity,UnitPrice,SaleType,Pack,QuantityUnits) SELECT @oid,Code,1,UnitPrice,'Unidad',Pack,1 FROM Products WHERE Code=CONCAT('VIN-',RIGHT('000'+CAST(@i AS varchar),3));
   IF @n<=3 INSERT OrderApprovals(OrderId,ApprovalArea,ApproverUserId,Decision) VALUES(@oid,'Alfredo',@approver,'Approved'),(@oid,'Credits',@creditsLocal,'Approved');
   IF @n BETWEEN 4 AND 6 INSERT OrderApprovals(OrderId,ApprovalArea,ApproverUserId,Decision) VALUES(@oid,'Alfredo',@approver,'Rejected');
   IF @n=7 INSERT OrderApprovals(OrderId,ApprovalArea,ApproverUserId,Decision) VALUES(@oid,'Alfredo',@approver,'Approved');
  END;
  SET @n+=1;
 END;
 SET @i+=1;
END;
COMMIT;
