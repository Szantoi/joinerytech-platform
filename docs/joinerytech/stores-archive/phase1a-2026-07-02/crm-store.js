// ──────────────────────────────────────────────────────────────────────────
// crm-store.js — Customer Relationship Management slice
//
// Handles: Leads, Opportunities, Activities, Pipeline management
// Size target: ~60KB (currently mixed in app-store.jsx)
// Pattern: Pure functions, immutable state updates
// ──────────────────────────────────────────────────────────────────────────

export const crmSlice = {
  // ── Get initial state for CRM ──
  getState: () => ({
    leads: [],
    opportunities: [],
    activities: [],
    crmSeq: { lead: 1, opp: 1, activity: 1 }
  }),

  // ── All CRM actions (reducers) ──
  actions: {
    // LEADS
    createLead: (state, payload) => {
      // payload: { id, email, company, assignedToUserId, ... }
      const newLead = {
        id: payload.id || `LEAD-${state.crmSeq.lead}`,
        email: payload.email,
        company: payload.company,
        status: "New", // New, Contacted, Qualified, Disqualified, Opportunity
        source: payload.source || "manual",
        assignedToUserId: payload.assignedToUserId,
        createdAt: payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: payload.notes || "",
        tags: payload.tags || [],
        activities: []
      };
      return {
        ...state,
        leads: [newLead, ...state.leads],
        crmSeq: { ...state.crmSeq, lead: state.crmSeq.lead + 1 }
      };
    },

    updateLeadStatus: (state, payload) => {
      // payload: { id, newStatus }
      return {
        ...state,
        leads: state.leads.map(lead =>
          lead.id === payload.id
            ? { ...lead, status: payload.newStatus, updatedAt: new Date().toISOString() }
            : lead
        )
      };
    },

    updateLead: (state, payload) => {
      // payload: { id, updates: { email, company, ... } }
      return {
        ...state,
        leads: state.leads.map(lead =>
          lead.id === payload.id
            ? { ...lead, ...payload.updates, updatedAt: new Date().toISOString() }
            : lead
        )
      };
    },

    deleteLead: (state, payload) => {
      // payload: { id }
      return {
        ...state,
        leads: state.leads.filter(lead => lead.id !== payload.id)
      };
    },

    // OPPORTUNITIES
    createOpportunity: (state, payload) => {
      // payload: { id, leadId, customerId, title, estimatedValue, probability, ... }
      const newOpp = {
        id: payload.id || `OPP-${state.crmSeq.opp}`,
        leadId: payload.leadId || null,
        customerId: payload.customerId,
        title: payload.title,
        status: "Open", // Open, Needs Analysis, Proposal Sent, Negotiating, Won, Lost
        estimatedValue: payload.estimatedValue || 0,
        probability: payload.probability || 50, // 0-100
        expectedCloseDate: payload.expectedCloseDate || null,
        assignedToUserId: payload.assignedToUserId,
        quoteRef: payload.quoteRef || null,
        orderRef: payload.orderRef || null,
        createdAt: payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: payload.notes || "",
        activities: []
      };
      return {
        ...state,
        opportunities: [newOpp, ...state.opportunities],
        crmSeq: { ...state.crmSeq, opp: state.crmSeq.opp + 1 }
      };
    },

    updateOpportunityStatus: (state, payload) => {
      // payload: { id, newStatus }
      return {
        ...state,
        opportunities: state.opportunities.map(opp =>
          opp.id === payload.id
            ? { ...opp, status: payload.newStatus, updatedAt: new Date().toISOString() }
            : opp
        )
      };
    },

    updateOpportunity: (state, payload) => {
      // payload: { id, updates: { title, estimatedValue, probability, ... } }
      return {
        ...state,
        opportunities: state.opportunities.map(opp =>
          opp.id === payload.id
            ? { ...opp, ...payload.updates, updatedAt: new Date().toISOString() }
            : opp
        )
      };
    },

    deleteOpportunity: (state, payload) => {
      // payload: { id }
      return {
        ...state,
        opportunities: state.opportunities.filter(opp => opp.id !== payload.id)
      };
    },

    // CONVERSION
    convertLeadToOpp: (state, payload) => {
      // payload: { leadId, title, customerId }
      const lead = state.leads.find(l => l.id === payload.leadId);
      if (!lead) return state;

      const newOpp = {
        id: `OPP-${state.crmSeq.opp}`,
        leadId: payload.leadId,
        customerId: payload.customerId,
        title: payload.title || `${lead.company} - Opportunity`,
        status: "Open",
        estimatedValue: 0,
        probability: 30,
        expectedCloseDate: null,
        assignedToUserId: lead.assignedToUserId,
        quoteRef: null,
        orderRef: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: `Converted from lead: ${lead.id}`,
        activities: []
      };

      return {
        ...state,
        leads: state.leads.map(l =>
          l.id === payload.leadId
            ? { ...l, status: "Opportunity" }
            : l
        ),
        opportunities: [newOpp, ...state.opportunities],
        crmSeq: { ...state.crmSeq, opp: state.crmSeq.opp + 1 }
      };
    },

    // ACTIVITIES (emails, calls, meetings)
    addActivity: (state, payload) => {
      // payload: { entityId (lead/opp), type: "email|call|meeting", description, ... }
      const newActivity = {
        id: `ACT-${state.crmSeq.activity}`,
        entityId: payload.entityId,
        entityType: payload.entityType || "lead", // lead | opportunity
        type: payload.type, // email, call, meeting, note
        description: payload.description,
        createdAt: payload.createdAt || new Date().toISOString(),
        createdBy: payload.createdBy,
        dueDate: payload.dueDate || null
      };

      // Add activity to lead or opportunity
      if (payload.entityType === "opportunity") {
        return {
          ...state,
          opportunities: state.opportunities.map(opp =>
            opp.id === payload.entityId
              ? { ...opp, activities: [newActivity, ...(opp.activities || [])] }
              : opp
          ),
          activities: [newActivity, ...state.activities],
          crmSeq: { ...state.crmSeq, activity: state.crmSeq.activity + 1 }
        };
      } else {
        return {
          ...state,
          leads: state.leads.map(lead =>
            lead.id === payload.entityId
              ? { ...lead, activities: [newActivity, ...(lead.activities || [])] }
              : lead
          ),
          activities: [newActivity, ...state.activities],
          crmSeq: { ...state.crmSeq, activity: state.crmSeq.activity + 1 }
        };
      }
    }
  },

  // ── Seed data for demo (optional) ──
  seedData: {
    leads: [
      {
        id: "LEAD-1",
        email: "contact@doorstar.hu",
        company: "Doorstar Kft.",
        status: "Qualified",
        source: "web",
        assignedToUserId: "USR-1",
        createdAt: "2026-04-15T10:00:00Z",
        updatedAt: "2026-06-28T15:30:00Z",
        notes: "Ready for proposal",
        tags: ["high-value", "urgent"],
        activities: []
      }
    ],
    opportunities: [
      {
        id: "OPP-1",
        leadId: "LEAD-1",
        customerId: "CUST-1",
        title: "Doorstar Cabinet System Q2 2026",
        status: "Proposal Sent",
        estimatedValue: 2500000,
        probability: 65,
        expectedCloseDate: "2026-07-15",
        assignedToUserId: "USR-1",
        quoteRef: "QT-2026-001",
        orderRef: null,
        createdAt: "2026-06-15T09:00:00Z",
        updatedAt: "2026-06-28T14:00:00Z",
        notes: "Awaiting client feedback",
        activities: []
      }
    ],
    activities: [],
    crmSeq: { lead: 2, opp: 2, activity: 1 }
  }
};
