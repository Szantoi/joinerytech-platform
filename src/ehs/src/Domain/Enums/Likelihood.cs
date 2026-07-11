namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Likelihood scale (1-5) for risk assessment
/// ISO 45001 compatible 5x5 risk matrix
/// </summary>
public enum Likelihood
{
    /// <summary>May occur only in exceptional circumstances</summary>
    Rare = 1,

    /// <summary>Could occur at some time</summary>
    Unlikely = 2,

    /// <summary>Might occur at some time</summary>
    Possible = 3,

    /// <summary>Will probably occur in most circumstances</summary>
    Likely = 4,

    /// <summary>Expected to occur in most circumstances</summary>
    AlmostCertain = 5
}
