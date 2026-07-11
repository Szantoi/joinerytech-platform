using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Application.Interfaces;

namespace SpaceOS.Modules.CRM.Application.Commands.CreateLead;

/// <summary>
/// Handler for CreateLeadCommand
/// </summary>
public class CreateLeadCommandHandler : IRequestHandler<CreateLeadCommand, Result<Guid>>
{
    private readonly ILeadRepository _repository;

    public CreateLeadCommandHandler(ILeadRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result<Guid>> Handle(CreateLeadCommand request, CancellationToken ct)
    {
        try
        {
            // Parse enum from string
            if (!Enum.TryParse<LeadSource>(request.Source, ignoreCase: true, out var leadSource))
            {
                return Result<Guid>.Invalid(new ValidationError
                {
                    Identifier = nameof(request.Source),
                    ErrorMessage = $"Invalid lead source: {request.Source}"
                });
            }

            // Create value objects
            var email = new Email(request.Email);
            var phone = !string.IsNullOrWhiteSpace(request.Phone)
                ? new PhoneNumber(request.Phone)
                : null;
            var contactInfo = new ContactInfo(request.Name, email, phone, request.Company);

            // Create Lead aggregate using factory method
            var lead = Lead.Create(contactInfo, leadSource, request.AssignedTo, request.TenantId);

            // Persist
            await _repository.AddAsync(lead, ct).ConfigureAwait(false);
            await _repository.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result<Guid>.Success(lead.Id);
        }
        catch (ArgumentException ex)
        {
            return Result<Guid>.Invalid(new ValidationError
            {
                ErrorMessage = ex.Message
            });
        }
        catch (Exception ex)
        {
            return Result<Guid>.Error(ex.Message);
        }
    }
}
