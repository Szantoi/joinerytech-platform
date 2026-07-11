namespace SpaceOS.Modules.Procurement.Application.Commands.CreateLead;

using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Procurement.Domain.Interfaces;

/// <summary>
/// Handler for CreateLeadCommand
/// </summary>
public class CreateLeadCommandHandler : IRequestHandler<CreateLeadCommand, Result>
{
    private readonly ILeadRepository _repository;

    public CreateLeadCommandHandler(ILeadRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result> Handle(CreateLeadCommand request, CancellationToken ct)
    {
        // TODO: Implement Create logic

        // 1. Load aggregate
        // 2. Execute domain method
        // 3. Save changes

        throw new NotImplementedException("CreateLeadCommandHandler not implemented");
    }
}
