using Microsoft.Data.SqlClient;
using System.Data;

namespace UniversityDemo.Documents;

public interface IOrderInvoiceStorage
{
    Task<(long Id,int Version)> SaveAsync(SqlConnection connection,SqlTransaction transaction,int orderId,string invoiceNumber,string fileName,byte[] pdfData,string hash,int userId,CancellationToken cancellationToken=default);
}

public sealed class SqlOrderInvoiceStorage : IOrderInvoiceStorage
{
    public async Task<(long Id,int Version)> SaveAsync(SqlConnection connection,SqlTransaction transaction,int orderId,string invoiceNumber,string fileName,byte[] pdfData,string hash,int userId,CancellationToken cancellationToken=default)
    {
        const string sql="""declare @version int=(select isnull(max(Version),0)+1 from OrderInvoices where OrderId=@id);insert OrderInvoices(OrderId,Version,InvoiceNumber,FileName,ContentType,FileLength,FileHash,PdfData,UploadedByUserId) output inserted.Id,inserted.Version values(@id,@version,@invoice,@file,'application/pdf',@length,@hash,@data,@uid)""";
        await using var command=new SqlCommand(sql,connection,transaction);
        command.Parameters.AddWithValue("@id",orderId);command.Parameters.AddWithValue("@invoice",invoiceNumber);command.Parameters.AddWithValue("@file",Path.GetFileName(fileName));command.Parameters.AddWithValue("@length",pdfData.LongLength);command.Parameters.AddWithValue("@hash",hash);command.Parameters.Add("@data",SqlDbType.VarBinary,-1).Value=pdfData;command.Parameters.AddWithValue("@uid",userId);
        await using var reader=await command.ExecuteReaderAsync(cancellationToken);await reader.ReadAsync(cancellationToken);return(reader.GetInt64(0),reader.GetInt32(1));
    }
}
