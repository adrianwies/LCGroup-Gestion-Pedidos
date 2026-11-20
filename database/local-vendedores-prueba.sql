-- Solo para APLICACION_CONTA_DESARROLLO. Datos ficticios, inserción idempotente.
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET CONCAT_NULL_YIELDS_NULL ON; SET ARITHABORT ON; SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON; SET XACT_ABORT ON;
IF DB_NAME() <> 'APLICACION_CONTA_DESARROLLO' THROW 51000, 'Este script es exclusivo de la base local de desarrollo.', 1;
BEGIN TRANSACTION;
DECLARE @i int=1, @n int, @code varchar(30), @username nvarchar(40), @uid int, @client int, @oid int, @number varchar(40), @status varchar(15), @approver int=(SELECT Id FROM Users WHERE UserName='alfredo'), @credits int=(SELECT Id FROM Users WHERE UserName='creditos');
WHILE @i<=5
BEGIN
 SET @code=CONCAT('VEND-',RIGHT('000'+CAST(@i AS varchar),3)); SET @username=CONCAT('vendedor',@i);
 IF NOT EXISTS(SELECT 1 FROM Users WHERE UserName=@username)
  INSERT Users(UserName,PasswordHash,Role,Active,SellerCode) VALUES(@username,'L8UiXZYwi4e6o8A8zTm7nQ==.5zkZdI7TqC01KpbusypvwAEES/g3v9fWyfVeGiSZsRw=','Seller',1,@code);
 SELECT @uid=Id FROM Users WHERE UserName=@username AND Role='Seller';
 IF @uid IS NULL THROW 51001, 'El nombre de cuenta ya existe con otro rol.', 1;
 IF NOT EXISTS(SELECT 1 FROM UserSellerCodes WHERE UserId=@uid AND SellerCode=@code) INSERT UserSellerCodes VALUES(@uid,@code);
 SELECT @client=Id FROM Clients WHERE Code=CONCAT('CLI-',RIGHT('000'+CAST(@i AS varchar),3));
 IF @client IS NULL OR @approver IS NULL OR @credits IS NULL THROW 51002, 'Faltan clientes o aprobadores demo.', 1;
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
   IF @n<=3 INSERT OrderApprovals(OrderId,ApprovalArea,ApproverUserId,Decision) VALUES(@oid,'Alfredo',@approver,'Approved'),(@oid,'Credits',@credits,'Approved');
   IF @n BETWEEN 4 AND 6 INSERT OrderApprovals(OrderId,ApprovalArea,ApproverUserId,Decision) VALUES(@oid,'Alfredo',@approver,'Rejected');
   IF @n=7 INSERT OrderApprovals(OrderId,ApprovalArea,ApproverUserId,Decision) VALUES(@oid,'Alfredo',@approver,'Approved');
  END;
  SET @n+=1;
 END;
 SET @i+=1;
END;
COMMIT;
