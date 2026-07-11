using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Handler for GetFolderTreeQuery.
/// </summary>
public class GetFolderTreeQueryHandler : IRequestHandler<GetFolderTreeQuery, Result<IReadOnlyList<FolderTreeDto>>>
{
    private readonly IFolderRepository _folderRepository;

    public GetFolderTreeQueryHandler(IFolderRepository folderRepository)
    {
        _folderRepository = folderRepository;
    }

    public async Task<Result<IReadOnlyList<FolderTreeDto>>> Handle(GetFolderTreeQuery request, CancellationToken ct)
    {
        try
        {
            // TODO: Implement when Folder aggregate is fully implemented (Phase 2)
            // For now, return empty list
            var emptyTree = new List<FolderTreeDto>().AsReadOnly();

            return Result<IReadOnlyList<FolderTreeDto>>.Success(emptyTree);

            /*
            // Future implementation:
            var rootFolders = await _folderRepository.GetRootFoldersAsync(ct).ConfigureAwait(false);

            var treeDtos = new List<FolderTreeDto>();
            foreach (var folder in rootFolders)
            {
                var dto = await BuildFolderTreeRecursive(folder, ct).ConfigureAwait(false);
                treeDtos.Add(dto);
            }

            return Result<IReadOnlyList<FolderTreeDto>>.Success(treeDtos.AsReadOnly());
            */
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<FolderTreeDto>>.Error($"Failed to retrieve folder tree: {ex.Message}");
        }
    }

    /*
    private async Task<FolderTreeDto> BuildFolderTreeRecursive(Folder folder, CancellationToken ct)
    {
        var childFolders = await _folderRepository.GetByParentIdAsync(folder.Id, ct).ConfigureAwait(false);

        var subfolders = new List<FolderTreeDto>();
        foreach (var child in childFolders)
        {
            var childDto = await BuildFolderTreeRecursive(child, ct).ConfigureAwait(false);
            subfolders.Add(childDto);
        }

        return new FolderTreeDto(folder.Id.Value, folder.Name, subfolders);
    }
    */
}
