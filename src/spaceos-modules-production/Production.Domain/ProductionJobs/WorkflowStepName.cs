namespace SpaceOS.Modules.Production.Domain.ProductionJobs;

/// <summary>
/// 6 STAGE workflow step names (Doorstar production process)
/// </summary>
public enum WorkflowStepName
{
    /// <summary>
    /// Szabászat/Előgyártás - Auto-triggered by CuttingCompleted event
    /// </summary>
    SzabaszatElőgyártás = 1,

    /// <summary>
    /// Megmunkálás - CNC, gérvágás, csiszolás
    /// </summary>
    Megmunkálás = 2,

    /// <summary>
    /// Felületkezelés - Fúrás, ragasztó, fóliázás
    /// </summary>
    Felületkezelés = 3,

    /// <summary>
    /// Összeszerelés - Él-lécezés, CNC pánt-zár, tok/gér összerakás (photo required)
    /// </summary>
    Összeszerelés = 4,

    /// <summary>
    /// Csomagolás - Paknizás, csomagolás
    /// </summary>
    Csomagolás = 5,

    /// <summary>
    /// Kiszállítható - Final stage, triggers ShippingReady event
    /// </summary>
    KiszállításraMegjelölés = 6
}
