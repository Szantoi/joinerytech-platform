using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Domain.Aggregates;
using SpaceOS.Modules.CRM.Domain.ValueObjects;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Application.Interfaces;

namespace SpaceOS.Modules.CRM.Application.Commands.CreateOpportunity;

/// <summary>
/// Handler for CreateOpportunityCommand
/// </summary>
public class CreateOpportunityCommandHandler : IRequestHandler<CreateOpportunityCommand, Result<Guid>>
{
    private readonly IOpportunityRepository _repository;

    public CreateOpportunityCommandHandler(IOpportunityRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<Result<Guid>> Handle(CreateOpportunityCommand request, CancellationToken ct)
    {
        try
        {
            // Parse currency enum
            if (!Enum.TryParse<Currency>(request.Currency, ignoreCase: true, out var currency))
            {
                return Result<Guid>.Invalid(new ValidationError
                {
                    Identifier = nameof(request.Currency),
                    ErrorMessage = $"Invalid currency: {request.Currency}"
                });
            }

            // Create value objects
            var email = new Email(request.Email);
            var phone = !string.IsNullOrWhiteSpace(request.Phone)
                ? new PhoneNumber(request.Phone)
                : null;
            var contactInfo = new ContactInfo(request.Name, email, phone, request.Company);
            var estimatedValue = new Money(request.EstimatedValue, currency);

            // Create Opportunity aggregate using factory method
            var opportunity = Opportunity.Create(contactInfo, estimatedValue, request.AssignedTo, request.TenantId);

            // Persist
            await _repository.AddAsync(opportunity, ct).ConfigureAwait(false);
            await _repository.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result<Guid>.Success(opportunity.Id);
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
