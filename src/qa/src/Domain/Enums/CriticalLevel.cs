namespace SpaceOS.Modules.QA.Domain.Enums;

/// <summary>
/// Critical level (determines production blocking behavior)
/// </summary>
public enum CriticalLevel
{
    Critical = 0,   // Kritikus - bukás blokkolja a gyártást
    Major = 1,      // Jelentős - figyelmeztetés, de nem blokkol
    Minor = 2       // Enyhe - csak naplózás
}
