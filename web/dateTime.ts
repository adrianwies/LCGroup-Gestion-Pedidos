// SQL Server stores these timestamps in UTC, but datetime2 has no offset.
const utcDate = (value: string) => new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value) ? value : value + "Z");
export const formatLimaDateTime = (value: string) => utcDate(value).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" });
export const formatLimaDate = (value: string) => utcDate(value).toLocaleDateString("es-PE", { timeZone: "America/Lima" });
