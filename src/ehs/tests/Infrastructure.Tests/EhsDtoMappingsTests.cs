using FluentAssertions;
using SpaceOS.Modules.Ehs.Application.Mappings;
using SpaceOS.Modules.Ehs.Domain.Aggregates.HazardousMaterialAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.SafetyWalkAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.TrainingRecordAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

public class EhsDtoMappingsTests
{
    private readonly Guid _tenantId = Guid.NewGuid();
    private readonly Guid _employeeId = Guid.NewGuid();

    [Fact]
    public void IncidentMappings_PreserveNestedReadModel()
    {
        var incident = Incident.Create(
            _tenantId,
            IncidentType.NearMiss,
            DateTimeOffset.UtcNow.AddHours(-1),
            "A csarnok",
            "Elsodródott munkadarab",
            Severity.Major,
            _employeeId);

        incident.StartInvestigation(_employeeId);
        incident.AddInvestigationFindings("Rögzítés hiánya", "Elhasználódott befogó", "Csereprogram");
        incident.AddWitness(Guid.NewGuid(), "A befogó meglazult.");
        incident.AddCorrectiveAction("Befogócsere", Guid.NewGuid(), DateTimeOffset.UtcNow.AddDays(7));

        var detail = incident.ToDto();
        var listItem = incident.ToListItemDto();

        detail.IncidentId.Should().Be(incident.IncidentId);
        detail.Investigation.Should().NotBeNull();
        detail.Investigation!.RootCause.Should().Be("Elhasználódott befogó");
        detail.CorrectiveActions.Should().ContainSingle();
        detail.Witnesses.Should().ContainSingle();
        listItem.Status.Should().Be(incident.Status);
    }

    [Fact]
    public void RiskAndCapaMappings_PreserveCalculatedAndLinkedFields()
    {
        var assessment = RiskAssessment.Create(
            _tenantId,
            "Forgó szerszám érintése",
            Severity.Catastrophic,
            Likelihood.Possible,
            _employeeId,
            DateTimeOffset.UtcNow.AddMonths(3),
            RiskBandConfiguration.Default,
            Guid.NewGuid());
        var control = assessment.AddControl("Reteszelt burkolat", "Karbantartás");
        var correctiveActionId = Guid.NewGuid();
        assessment.LinkControlCorrectiveAction(control.RiskControlId, correctiveActionId);

        var capa = CorrectiveAction.CreateForRiskAssessment(
            _tenantId,
            assessment.RiskAssessmentId,
            "Burkolat felszerelése",
            _employeeId,
            DateTimeOffset.UtcNow.AddDays(14));

        var detail = assessment.ToDto();

        detail.RiskScore.Should().Be(15);
        detail.ControlMeasures.Should().ContainSingle()
            .Which.CorrectiveActionId.Should().Be(correctiveActionId);
        assessment.ToListItemDto().RiskLevel.Should().Be(assessment.RiskLevel);
        capa.ToCapaDto().Source.Should().Be(CapaSource.RiskAssessment);
    }

    [Fact]
    public void RegistryMappings_PreserveProviderAndCalculatedValuesWithoutAliasingLists()
    {
        var now = DateTimeOffset.UtcNow;
        var location = EhsLocation.Create(_tenantId, "VAC-A", "A csarnok", LocationKind.Hall);
        var training = TrainingRecord.Create(
            _tenantId,
            _employeeId,
            "Tűzvédelmi oktatás",
            now.AddDays(-1),
            "Biztonság Kft.",
            now.AddDays(90));
        var material = HazardousMaterial.Create(
            _tenantId,
            "Aceton",
            "Vegyszer Kft.",
            location.LocationId,
            12.5m,
            "l",
            now.AddDays(-30),
            now.AddDays(90),
            "67-64-1",
            new List<string> { "GHS02", "GHS07" });

        var locationDto = location.ToDto();
        var trainingDto = training.ToDto();
        var materialDto = material.ToDto();

        locationDto.Code.Should().Be("VAC-A");
        trainingDto.TrainingProvider.Should().Be(training.IssuedBy);
        training.ToListItemDto().Status.Should().Be(TrainingStatus.Valid);
        materialDto.SdsValidity.Should().Be(SdsValidity.Valid);
        material.ToListItemDto().MaterialId.Should().Be(material.MaterialId);
        materialDto.GhsHazardClasses.Should().Equal(material.GhsHazardClasses);
        materialDto.GhsHazardClasses.Should().NotBeSameAs(material.GhsHazardClasses);
    }

    [Fact]
    public void PpeAndSafetyWalkMappings_PreserveLifecycleAndNestedFindings()
    {
        var item = PpeItem.Create(_tenantId, "Védőkesztyű", PpeCategory.Hand, "EN 388", 12);
        var issuance = PpeIssuance.Issue(
            _tenantId,
            _employeeId,
            item.PpeItemId,
            Guid.NewGuid(),
            2,
            DateTimeOffset.UtcNow.AddMonths(12));
        var walk = SafetyWalk.Schedule(
            _tenantId,
            Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddDays(1),
            _employeeId,
            new List<Guid> { Guid.NewGuid() });
        walk.Start();
        walk.AddFinding("Hiányzó burkolat", Severity.Major, true, "evidence/photo.jpg");

        var walkDto = walk.ToDto();

        item.ToDto().Category.Should().Be(PpeCategory.Hand);
        issuance.ToDto().Quantity.Should().Be(2);
        walkDto.Findings.Should().ContainSingle().Which.RequiresAction.Should().BeTrue();
        walkDto.Participants.Should().Equal(walk.Participants);
        walkDto.Participants.Should().NotBeSameAs(walk.Participants);
        walk.ToListItemDto().FindingCount.Should().Be(1);
    }
}
