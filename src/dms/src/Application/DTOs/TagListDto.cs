namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Paginated list of Tags.
/// </summary>
public class TagListDto
{
    public List<TagDto> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }

    public int TotalPages => (TotalCount + PageSize - 1) / PageSize;
}
