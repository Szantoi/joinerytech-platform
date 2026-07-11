
        // POST /api/crm/leads
        app.MapPost("/api/crm/leads", async (
            [FromServices] IMediator mediator,
            [FromRoute] Guid id,
            [FromBody] CreateLeadRequest request,
            CancellationToken ct) =>
        {
            var command = new CreateLeadCommand
            {
                TenantId = GetTenantId(), // TODO: Implement GetTenantId()
                // TODO: Map request to command
            };

            var result = await mediator.Send(command, ct);

            return result.IsSuccess
                ? Results.Ok(result.Value)
                : Results.BadRequest(result.Errors);
        })
        .WithName("CreateLead")
        .WithTags("Lead")
        .RequireAuthorization();
