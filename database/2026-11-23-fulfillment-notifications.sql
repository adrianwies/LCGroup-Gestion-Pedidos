-- Recover seller notifications for fulfillment events recorded before notifications existed.
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON; SET ARITHABORT ON; SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
INSERT dbo.Notifications(Type,Title,Message,Audience,TargetUserId,ActorUserId,ActionUrl,DeduplicationKey,CreatedAt)
SELECT CASE WHEN e.Status='Billed' THEN 'billing' ELSE 'order' END,
 CASE e.Status WHEN 'Billed' THEN N'Pedido facturado' WHEN 'Picking' THEN N'Pedido en preparación' WHEN 'Ready' THEN N'Pedido listo en almacén' WHEN 'InTransit' THEN N'Pedido en ruta' WHEN 'Delivered' THEN N'Pedido entregado' END,
 CASE e.Status WHEN 'Billed' THEN CONCAT(N'Tu pedido ',o.Number,N' ya fue facturado.') WHEN 'Picking' THEN CONCAT(N'Tu pedido ',o.Number,N' está siendo preparado en almacén.') WHEN 'Ready' THEN CONCAT(N'Tu pedido ',o.Number,N' está preparado y listo para salir de almacén.') WHEN 'InTransit' THEN CONCAT(N'Tu pedido ',o.Number,N' está en ruta hacia su destino.') WHEN 'Delivered' THEN CONCAT(N'Tu pedido ',o.Number,N' fue marcado como entregado.') END,
 'User',o.SellerId,e.ActorUserId,CONCAT('/?orderNumber=',o.Number),CONCAT('fulfillment:',o.Id,':',e.Status),e.CreatedAt
FROM dbo.OrderFulfillmentEvents e JOIN dbo.Orders o ON o.Id=e.OrderId
WHERE e.Status IN ('Billed','Picking','Ready','InTransit','Delivered')
 AND e.Id=(SELECT MIN(firstEvent.Id) FROM dbo.OrderFulfillmentEvents firstEvent WHERE firstEvent.OrderId=e.OrderId AND firstEvent.Status=e.Status)
 AND NOT EXISTS(SELECT 1 FROM dbo.Notifications n WHERE n.DeduplicationKey=CONCAT('fulfillment:',o.Id,':',e.Status) OR (e.Status='Billed' AND n.DeduplicationKey=CONCAT('billing:',o.Id)));
COMMIT;
