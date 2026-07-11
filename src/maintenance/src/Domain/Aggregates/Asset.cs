using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Events;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;

namespace SpaceOS.Modules.Maintenance.Domain.Aggregates;

/// <summary>
/// Asset aggregate root.
/// Represents a physical asset (machine, vehicle, tool, infrastructure, IT equipment, or room)
/// that requires maintenance tracking, operating hours recording, and preventive maintenance scheduling.
/// </summary>
public class Asset : AggregateRoot
{
    private readonly List<MaintenancePlan> _maintenancePlans = new();

    public AssetId Id { get; private set; } = null!;
    public Guid TenantId { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public AssetKind Kind { get; private set; }
    public Guid FacilityId { get; private set; }
    public string Location { get; private set; } = string.Empty;
    public string? Vendor { get; private set; }
    public string? Model { get; private set; }
    public decimal OperatingHours { get; private set; }
    public string? MachineId { get; private set; }
    public string? VehicleId { get; private set; }
    public bool Retired { get; private set; }
    public IReadOnlyList<MaintenancePlan> MaintenancePlans => _maintenancePlans.AsReadOnly();

    // EF Core constructor
    private Asset() { }

    private Asset(
        AssetId id,
        Guid tenantId,
        string code,
        string name,
        AssetKind kind,
        Guid facilityId,
        string location,
        string? vendor = null,
        string? model = null)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainException("Asset code is required");
        if (code.Length > 50)
            throw new DomainException("Asset code must not exceed 50 characters");
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Asset name is required");
        if (name.Length > 200)
            throw new DomainException("Asset name must not exceed 200 characters");
        if (string.IsNullOrWhiteSpace(location))
            throw new DomainException("Asset location is required");
        if (location.Length > 200)
            throw new DomainException("Asset location must not exceed 200 characters");

        Id = id;
        TenantId = tenantId;
        Code = code;
        Name = name;
        Kind = kind;
        FacilityId = facilityId;
        Location = location;
        Vendor = vendor;
        Model = model;
        OperatingHours = 0;
        Retired = false;

        AddDomainEvent(new AssetCreatedEvent(
            Id,
            TenantId,
            Code,
            Name,
            Kind,
            FacilityId,
            Location));
    }

    /// <summary>
    /// Factory method to create a new asset.
    /// </summary>
    public static Asset Create(
        Guid tenantId,
        string code,
        string name,
        AssetKind kind,
        Guid facilityId,
        string location,
        string? vendor = null,
        string? model = null)
    {
        return new Asset(
            AssetId.New(),
            tenantId,
            code,
            name,
            kind,
            facilityId,
            location,
            vendor,
            model);
    }

    /// <summary>
    /// Records operating hours for the asset.
    /// Only applicable for machines and vehicles.
    /// </summary>
    public void RecordOperatingHours(decimal hours)
    {
        if (Retired)
            throw new DomainException("Cannot record operating hours for retired assets");

        if (hours <= 0)
            throw new DomainException("Operating hours must be positive");

        if (Kind != AssetKind.Machine && Kind != AssetKind.Vehicle)
            throw new DomainException($"Operating hours can only be recorded for Machine or Vehicle assets, not {Kind}");

        OperatingHours += hours;

        AddDomainEvent(new AssetOperatingHoursRecordedEvent(
            Id,
            TenantId,
            hours,
            OperatingHours));
    }

    /// <summary>
    /// Retires the asset (asset is no longer in service).
    /// </summary>
    public void Retire()
    {
        if (Retired)
            throw new DomainException("Asset is already retired");

        Retired = true;

        AddDomainEvent(new AssetRetiredEvent(
            Id,
            TenantId));
    }

    /// <summary>
    /// Reactivates a retired asset (asset is brought back into service).
    /// </summary>
    public void Reactivate()
    {
        if (!Retired)
            throw new DomainException("Asset is not retired");

        Retired = false;

        AddDomainEvent(new AssetReactivatedEvent(
            Id,
            TenantId));
    }

    /// <summary>
    /// Adds a preventive maintenance plan to the asset.
    /// </summary>
    public void AddMaintenancePlan(MaintenancePlan plan)
    {
        if (plan == null)
            throw new DomainException("Maintenance plan is required");

        if (_maintenancePlans.Any(p => p.Id == plan.Id))
            throw new DomainException($"Maintenance plan with ID '{plan.Id}' already exists");

        _maintenancePlans.Add(plan);

        AddDomainEvent(new MaintenancePlanAddedEvent(
            Id,
            TenantId,
            plan.Id,
            plan.Label));
    }

    /// <summary>
    /// Removes a maintenance plan from the asset.
    /// </summary>
    public void RemoveMaintenancePlan(string planId)
    {
        if (string.IsNullOrWhiteSpace(planId))
            throw new DomainException("Plan ID is required");

        var plan = _maintenancePlans.FirstOrDefault(p => p.Id == planId);
        if (plan == null)
            throw new DomainException($"Maintenance plan with ID '{planId}' not found");

        _maintenancePlans.Remove(plan);

        AddDomainEvent(new MaintenancePlanRemovedEvent(
            Id,
            TenantId,
            planId));
    }

    /// <summary>
    /// Links the asset to a Production machine (AssetKind must be Machine).
    /// </summary>
    public void LinkToMachine(string machineId)
    {
        if (Kind != AssetKind.Machine)
            throw new DomainException($"Only Machine assets can be linked to Production machines, current kind is {Kind}");

        if (string.IsNullOrWhiteSpace(machineId))
            throw new DomainException("MachineId is required");

        MachineId = machineId;

        AddDomainEvent(new AssetLinkedToMachineEvent(
            Id,
            TenantId,
            machineId));
    }

    /// <summary>
    /// Links the asset to a Logistics vehicle (AssetKind must be Vehicle).
    /// </summary>
    public void LinkToVehicle(string vehicleId)
    {
        if (Kind != AssetKind.Vehicle)
            throw new DomainException($"Only Vehicle assets can be linked to Logistics vehicles, current kind is {Kind}");

        if (string.IsNullOrWhiteSpace(vehicleId))
            throw new DomainException("VehicleId is required");

        VehicleId = vehicleId;

        AddDomainEvent(new AssetLinkedToVehicleEvent(
            Id,
            TenantId,
            vehicleId));
    }
}
