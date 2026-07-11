namespace SpaceOS.Modules.QA.Domain.Enums;

/// <summary>
/// Checkpoint type (quality control point in production)
/// </summary>
public enum CheckpointType
{
    Incoming = 0,   // Beérkező áru ellenőrzés (beszállított anyag)
    InProcess = 1,  // Gyártásközi ellenőrzés
    Final = 2       // Kiszállítás előtti ellenőrzés
}
