using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Data.SqlClient;
using WebPush;

namespace UniversityDemo.Notifications;

public static class NotificationSetup
{
    public static IServiceCollection AddNotificationSystem(this IServiceCollection services,string connectionString,IConfiguration configuration)
    {
        services.AddSingleton(new NotificationOptions(connectionString,configuration["WebPush:VapidSubject"]??"",configuration["WebPush:VapidPublicKey"]??"",configuration["WebPush:VapidPrivateKey"]??""));
        services.AddHostedService<PushOutboxWorker>();
        return services;
    }

    public static WebApplication MapNotificationSystem(this WebApplication app)
    {
        app.MapGet("/api/notifications/stream",Stream).RequireAuthorization();
        app.MapGet("/api/notifications/config",(NotificationOptions o)=>Results.Ok(new{pushAvailable=o.PushAvailable,vapidPublicKey=o.PublicKey})).RequireAuthorization();
        app.MapGet("/api/notifications/preferences",GetPreferences).RequireAuthorization();
        app.MapPut("/api/notifications/preferences",SavePreferences).RequireAuthorization();
        app.MapGet("/api/notifications/devices",GetDevices).RequireAuthorization();
        app.MapPost("/api/notifications/devices",SaveDevice).RequireAuthorization();
        app.MapPut("/api/notifications/devices/{id:long}",RenameDevice).RequireAuthorization();
        app.MapDelete("/api/notifications/devices/{id:long}",DeleteDevice).RequireAuthorization();
        app.MapPut("/api/notifications/devices/{id:long}/active",SetDeviceActive).RequireAuthorization();
        return app;
    }

    static int UserId(HttpContext h)=>int.Parse(h.User.FindFirstValue("uid")!);

    static async Task Stream(HttpContext h,NotificationOptions options,CancellationToken ct)
    {
        h.Response.Headers.CacheControl="no-cache, no-transform";
        h.Response.Headers.Append("X-Accel-Buffering","no");
        h.Response.ContentType="text/event-stream";
        var uid=UserId(h);var role=h.User.FindFirstValue(ClaimTypes.Role)??"";
        var cursor=int.TryParse(h.Request.Query["after"],out var q)?q:0;
        await h.Response.WriteAsync("retry: 3000\n\n",ct);await h.Response.Body.FlushAsync(ct);
        while(!ct.IsCancellationRequested)
        {
            try
            {
                await using var c=new SqlConnection(options.ConnectionString);await c.OpenAsync(ct);
                const string sql="""select top 50 n.Id,n.Type,n.Title,n.Message,n.CreatedAt,isnull(n.ActionUrl,''),isnull(p.SoundEnabled,1) from Notifications n left join NotificationPreferences p on p.UserId=@uid and p.Category=n.Type where n.Id>@after and isnull(p.Enabled,1)=1 and (n.TargetUserId=@uid or n.Audience='All' or (n.Audience='Admin' and @role in ('Admin','Approver')) or exists(select 1 from NotificationRecipients nr where nr.NotificationId=n.Id and nr.UserId=@uid)) order by n.Id""";
                await using var cmd=new SqlCommand(sql,c);cmd.Parameters.AddWithValue("@uid",uid);cmd.Parameters.AddWithValue("@role",role);cmd.Parameters.AddWithValue("@after",cursor);
                await using var r=await cmd.ExecuteReaderAsync(ct);var sent=false;
                while(await r.ReadAsync(ct))
                {
                    cursor=r.GetInt32(0);sent=true;
                    var payload=JsonSerializer.Serialize(new{id=cursor,type=r.GetString(1),title=r.GetString(2),message=r.GetString(3),createdAt=r.GetDateTime(4),actionUrl=r.GetString(5),soundEnabled=r.GetBoolean(6)});
                    await h.Response.WriteAsync($"id: {cursor}\nevent: notification\ndata: {payload}\n\n",ct);
                }
                if(!sent)await h.Response.WriteAsync(": keep-alive\n\n",ct);
                await h.Response.Body.FlushAsync(ct);
            }
            catch(OperationCanceledException){break;}
            catch(SqlException){await h.Response.WriteAsync(": database-retry\n\n",ct);await h.Response.Body.FlushAsync(ct);}
            await Task.Delay(TimeSpan.FromSeconds(2),ct);
        }
    }

    static async Task<IResult> GetPreferences(HttpContext h,NotificationOptions o)
    {
        await using var c=new SqlConnection(o.ConnectionString);await c.OpenAsync();
        const string sql="""select v.Category,isnull(p.Enabled,1),isnull(p.SoundEnabled,1) from (values('order'),('approval'),('rejection'),('credit'),('billing'),('stock'),('system'))v(Category) left join NotificationPreferences p on p.UserId=@u and p.Category=v.Category order by v.Category""";
        await using var cmd=new SqlCommand(sql,c);cmd.Parameters.AddWithValue("@u",UserId(h));await using var r=await cmd.ExecuteReaderAsync();var rows=new List<object>();while(await r.ReadAsync())rows.Add(new{category=r.GetString(0),enabled=r.GetBoolean(1),soundEnabled=r.GetBoolean(2)});return Results.Ok(rows);
    }

    static async Task<IResult> SavePreferences(List<PreferenceInput> values,HttpContext h,NotificationOptions o)
    {
        var allowed=new HashSet<string>(["order","approval","rejection","credit","billing","stock","system"]);await using var c=new SqlConnection(o.ConnectionString);await c.OpenAsync();await using var tx=(SqlTransaction)await c.BeginTransactionAsync();
        foreach(var x in values.Where(x=>allowed.Contains(x.Category))){await using var cmd=new SqlCommand("merge NotificationPreferences as t using(values(@u,@c,@e,@s)) as v(UserId,Category,Enabled,SoundEnabled) on t.UserId=v.UserId and t.Category=v.Category when matched then update set Enabled=v.Enabled,SoundEnabled=v.SoundEnabled,UpdatedAt=sysutcdatetime() when not matched then insert(UserId,Category,Enabled,SoundEnabled) values(v.UserId,v.Category,v.Enabled,v.SoundEnabled);",c,tx);cmd.Parameters.AddWithValue("@u",UserId(h));cmd.Parameters.AddWithValue("@c",x.Category);cmd.Parameters.AddWithValue("@e",x.Enabled);cmd.Parameters.AddWithValue("@s",x.SoundEnabled);await cmd.ExecuteNonQueryAsync();}await tx.CommitAsync();return Results.NoContent();
    }

    static async Task<IResult> GetDevices(HttpContext h,NotificationOptions o)
    {
        await using var c=new SqlConnection(o.ConnectionString);await c.OpenAsync();await using var cmd=new SqlCommand("select Id,Name,Platform,Active,ContinueAfterLogout,ShowDetailsOnLock,CreatedAt,LastSeenAt from PushDevices where UserId=@u order by LastSeenAt desc",c);cmd.Parameters.AddWithValue("@u",UserId(h));await using var r=await cmd.ExecuteReaderAsync();var rows=new List<object>();while(await r.ReadAsync())rows.Add(new{id=r.GetInt64(0),name=r.GetString(1),platform=r.GetString(2),active=r.GetBoolean(3),continueAfterLogout=r.GetBoolean(4),showDetailsOnLock=r.GetBoolean(5),createdAt=r.GetDateTime(6),lastSeenAt=r.GetDateTime(7)});return Results.Ok(rows);
    }

    static async Task<IResult> SaveDevice(DeviceInput x,HttpContext h,NotificationOptions o)
    {
        if(string.IsNullOrWhiteSpace(x.Endpoint)||string.IsNullOrWhiteSpace(x.P256dh)||string.IsNullOrWhiteSpace(x.Auth))return Results.BadRequest(new{message="Suscripción Push incompleta."});
        await using var c=new SqlConnection(o.ConnectionString);await c.OpenAsync();const string sql="""merge PushDevices with(holdlock) as t using(values(@endpoint))v(Endpoint) on t.Endpoint=v.Endpoint when matched then update set UserId=@u,Name=@name,Platform=@platform,P256dh=@p,Auth=@auth,Active=1,ContinueAfterLogout=@keep,ShowDetailsOnLock=@details,LastSeenAt=sysutcdatetime(),InvalidAt=null when not matched then insert(UserId,Name,Platform,Endpoint,P256dh,Auth,ContinueAfterLogout,ShowDetailsOnLock) values(@u,@name,@platform,@endpoint,@p,@auth,@keep,@details) output inserted.Id;""";await using var cmd=new SqlCommand(sql,c);cmd.Parameters.AddWithValue("@u",UserId(h));cmd.Parameters.AddWithValue("@name",Cut(x.Name,80,"Este dispositivo"));cmd.Parameters.AddWithValue("@platform",Cut(x.Platform,40,"Navegador"));cmd.Parameters.AddWithValue("@endpoint",x.Endpoint);cmd.Parameters.AddWithValue("@p",x.P256dh);cmd.Parameters.AddWithValue("@auth",x.Auth);cmd.Parameters.AddWithValue("@keep",x.ContinueAfterLogout);cmd.Parameters.AddWithValue("@details",x.ShowDetailsOnLock);return Results.Ok(new{id=(long)(await cmd.ExecuteScalarAsync())!});
    }

    static async Task<IResult> RenameDevice(long id,DeviceUpdate x,HttpContext h,NotificationOptions o){await using var c=new SqlConnection(o.ConnectionString);await c.OpenAsync();await using var cmd=new SqlCommand("update PushDevices set Name=@n,ContinueAfterLogout=@k,ShowDetailsOnLock=@d where Id=@id and UserId=@u",c);cmd.Parameters.AddWithValue("@n",Cut(x.Name,80,"Este dispositivo"));cmd.Parameters.AddWithValue("@k",x.ContinueAfterLogout);cmd.Parameters.AddWithValue("@d",x.ShowDetailsOnLock);cmd.Parameters.AddWithValue("@id",id);cmd.Parameters.AddWithValue("@u",UserId(h));return await cmd.ExecuteNonQueryAsync()==0?Results.NotFound():Results.NoContent();}
    static async Task<IResult> SetDeviceActive(long id,ActiveInput x,HttpContext h,NotificationOptions o){await using var c=new SqlConnection(o.ConnectionString);await c.OpenAsync();await using var cmd=new SqlCommand("update PushDevices set Active=@a,LastSeenAt=sysutcdatetime() where Id=@id and UserId=@u",c);cmd.Parameters.AddWithValue("@a",x.Active);cmd.Parameters.AddWithValue("@id",id);cmd.Parameters.AddWithValue("@u",UserId(h));return await cmd.ExecuteNonQueryAsync()==0?Results.NotFound():Results.NoContent();}
    static async Task<IResult> DeleteDevice(long id,HttpContext h,NotificationOptions o){await using var c=new SqlConnection(o.ConnectionString);await c.OpenAsync();await using var cmd=new SqlCommand("delete PushDevices where Id=@id and UserId=@u",c);cmd.Parameters.AddWithValue("@id",id);cmd.Parameters.AddWithValue("@u",UserId(h));return await cmd.ExecuteNonQueryAsync()==0?Results.NotFound():Results.NoContent();}
    static string Cut(string? value,int size,string fallback){var s=string.IsNullOrWhiteSpace(value)?fallback:value.Trim();return s[..Math.Min(s.Length,size)];}
}

public sealed record NotificationOptions(string ConnectionString,string Subject,string PublicKey,string PrivateKey){public bool PushAvailable=>Subject.StartsWith("mailto:")&&PublicKey.Length>20&&PrivateKey.Length>20;}
public sealed record PreferenceInput(string Category,bool Enabled,bool SoundEnabled);
public sealed record DeviceInput(string Name,string Platform,string Endpoint,string P256dh,string Auth,bool ContinueAfterLogout,bool ShowDetailsOnLock);
public sealed record DeviceUpdate(string Name,bool ContinueAfterLogout,bool ShowDetailsOnLock);
public sealed record ActiveInput(bool Active);

public sealed class PushOutboxWorker(NotificationOptions options,ILogger<PushOutboxWorker> logger):BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while(!stoppingToken.IsCancellationRequested)
        {
            try{if(options.PushAvailable)await Dispatch(stoppingToken);}catch(Exception e){logger.LogError(e,"Error procesando la cola Web Push");}
            await Task.Delay(TimeSpan.FromSeconds(5),stoppingToken);
        }
    }
    async Task Dispatch(CancellationToken ct)
    {
        await using var c=new SqlConnection(options.ConnectionString);await c.OpenAsync(ct);
        const string seed="""begin try insert NotificationDeliveries(NotificationId,DeviceId,NextAttemptAt) select n.Id,d.Id,sysutcdatetime() from Notifications n join PushDevices d on d.Active=1 and d.InvalidAt is null join Users u on u.Id=d.UserId and u.Active=1 left join NotificationPreferences p on p.UserId=d.UserId and p.Category=n.Type where isnull(p.Enabled,1)=1 and (n.TargetUserId=d.UserId or n.Audience='All' or (n.Audience='Admin' and u.Role in('Admin','Approver')) or exists(select 1 from NotificationRecipients nr where nr.NotificationId=n.Id and nr.UserId=d.UserId)) and not exists(select 1 from NotificationDeliveries x with(updlock,holdlock) where x.NotificationId=n.Id and x.DeviceId=d.Id);end try begin catch if error_number() not in(2601,2627) throw;end catch;""";
        await new SqlCommand(seed,c).ExecuteNonQueryAsync(ct);
        const string take="""declare @token uniqueidentifier=newid();declare @claimed table(Id bigint,Attempts int,DeviceId bigint);with next as(select top 20 q.Id,q.Attempts,q.DeviceId,q.LockedUntil,q.LockToken from NotificationDeliveries q with(updlock,readpast,rowlock) where q.DeliveredAt is null and q.PermanentFailureAt is null and q.NextAttemptAt<=sysutcdatetime() and (q.LockedUntil is null or q.LockedUntil<sysutcdatetime()) order by q.Id) update next set LockedUntil=dateadd(minute,2,sysutcdatetime()),LockToken=@token output inserted.Id,inserted.Attempts,inserted.DeviceId into @claimed;select q.Id,q.Attempts,d.Id,d.Endpoint,d.P256dh,d.Auth,d.ShowDetailsOnLock,n.Title,n.Message,isnull(n.ActionUrl,'/'),n.Type from @claimed q join PushDevices d on d.Id=q.DeviceId join NotificationDeliveries nd on nd.Id=q.Id join Notifications n on n.Id=nd.NotificationId;""";
        await using var cmd=new SqlCommand(take,c);await using var r=await cmd.ExecuteReaderAsync(ct);var jobs=new List<PushJob>();while(await r.ReadAsync(ct))jobs.Add(new(r.GetInt64(0),r.GetInt32(1),r.GetInt64(2),r.GetString(3),r.GetString(4),r.GetString(5),r.GetBoolean(6),r.GetString(7),r.GetString(8),r.GetString(9),r.GetString(10)));await r.CloseAsync();
        var client=new WebPushClient();var vapid=new VapidDetails(options.Subject,options.PublicKey,options.PrivateKey);
        foreach(var j in jobs)
        {
            try{var payload=JsonSerializer.Serialize(new{title=j.Title,body=j.ShowDetailsOnLock?j.Message:PrivateBody(j.Category),url=j.Url,tag=$"notification-{j.QueueId}",category=j.Category});await client.SendNotificationAsync(new PushSubscription(j.Endpoint,j.P256dh,j.Auth),payload,vapid,ct);await Update(c,j.QueueId,"DeliveredAt=sysutcdatetime(),LastError=null",null,ct);}
            catch(WebPushException e) when(e.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound){await Update(c,j.QueueId,"PermanentFailureAt=sysutcdatetime(),LastError=@e",e.Message,ct);await using var invalid=new SqlCommand("update PushDevices set Active=0,InvalidAt=sysutcdatetime() where Id=@id",c);invalid.Parameters.AddWithValue("@id",j.DeviceId);await invalid.ExecuteNonQueryAsync(ct);}
            catch(Exception e){var permanent=j.Attempts>=7;await Update(c,j.QueueId,permanent?"PermanentFailureAt=sysutcdatetime(),Attempts=Attempts+1,LockedUntil=null,LockToken=null,LastError=@e":"Attempts=Attempts+1,NextAttemptAt=dateadd(second,power(cast(2 as float),Attempts+1)*15,sysutcdatetime()),LockedUntil=null,LockToken=null,LastError=@e",e.Message,ct);}
        }
    }
    static async Task Update(SqlConnection c,long id,string set,string? error,CancellationToken ct){await using var cmd=new SqlCommand($"update NotificationDeliveries set {set} where Id=@id",c);cmd.Parameters.AddWithValue("@id",id);if(set.Contains("@e"))cmd.Parameters.AddWithValue("@e",(object?)error??DBNull.Value);await cmd.ExecuteNonQueryAsync(ct);}
    static string PrivateBody(string category)=>category switch{"order"=>"Se registró un nuevo pedido.","approval"=>"Un pedido cambió de estado.","rejection"=>"Un pedido fue rechazado.","credit"=>"Hay una novedad de crédito pendiente.","billing"=>"Hay un pedido listo para facturación.","stock"=>"El inventario fue actualizado.",_=>"Abre la aplicación para ver los detalles."};
    sealed record PushJob(long QueueId,int Attempts,long DeviceId,string Endpoint,string P256dh,string Auth,bool ShowDetailsOnLock,string Title,string Message,string Url,string Category);
}
