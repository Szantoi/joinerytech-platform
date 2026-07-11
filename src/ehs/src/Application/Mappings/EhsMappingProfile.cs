using AutoMapper;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;
using SpaceOS.Modules.Ehs.Application.TrainingRecords.DTOs;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Domain.Aggregates.TrainingRecordAggregate;

namespace SpaceOS.Modules.Ehs.Application.Mappings;

/// <summary>
/// AutoMapper profile for EHS module
/// Domain → DTO mappings
/// </summary>
public class EhsMappingProfile : Profile
{
    public EhsMappingProfile()
    {
        // Incident mappings
        CreateMap<Incident, IncidentDto>()
            .ForMember(dest => dest.CorrectiveActions, opt => opt.MapFrom(src => src.CorrectiveActions))
            .ForMember(dest => dest.Witnesses, opt => opt.MapFrom(src => src.Witnesses));

        CreateMap<IncidentInvestigation, IncidentInvestigationDto>();
        CreateMap<CorrectiveAction, CorrectiveActionDto>();
        CreateMap<IncidentWitness, IncidentWitnessDto>();
        CreateMap<Incident, IncidentListItemDto>();

        // RiskAssessment mappings
        CreateMap<RiskAssessment, RiskAssessmentDto>()
            .ForMember(dest => dest.ControlMeasures, opt => opt.MapFrom(src => src.Controls));

        CreateMap<RiskControl, ControlMeasureDto>();
        CreateMap<RiskAssessment, RiskAssessmentListItemDto>();

        // TrainingRecord mappings
        CreateMap<TrainingRecord, TrainingRecordDto>();
        CreateMap<TrainingRecord, TrainingRecordListItemDto>();
    }
}
