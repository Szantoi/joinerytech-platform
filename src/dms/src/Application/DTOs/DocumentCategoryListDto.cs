namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Paginated list of DocumentCategories.
/// </summary>
public class DocumentCategoryListDto
{
    public List<DocumentCategoryDto> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }

    public int TotalPages => (TotalCount + PageSize - 1) / PageSize;
}
