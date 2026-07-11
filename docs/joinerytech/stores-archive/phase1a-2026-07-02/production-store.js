// ──────────────────────────────────────────────────────────────────────────
// production-store.js — Manufacturing & Operations Management slice
//
// Handles: Jobs, Tasks, Schedules, Nesting
// Size target: ~60KB (currently mixed in app-store.jsx)
// Pattern: Pure functions, immutable state updates
// ──────────────────────────────────────────────────────────────────────────

export const productionSlice = {
  // ── Get initial state for Production ──
  getState: () => ({
    jobs: [],
    tasks: [],
    schedules: [],
    nestings: [],
    productionSeq: { job: 1, task: 1, nesting: 1 }
  }),

  // ── All Production actions (reducers) ──
  actions: {
    // JOBS (manufacturing jobs from orders)
    createJob: (state, payload) => {
      // payload: { orderId, type, status, dueDate, materials, priority, ... }
      const newJob = {
        id: `JOB-${state.productionSeq.job}`,
        orderId: payload.orderId,
        type: payload.type || "cabinet", // cabinet, door, custom, service
        status: "planned", // planned, scheduled, in-progress, completed, cancelled
        dueDate: payload.dueDate,
        startDate: payload.startDate || null,
        endDate: payload.endDate || null,
        priority: payload.priority || "normal", // high, normal, low
        materials: payload.materials || [],
        tasks: [],
        nestings: [],
        assignedTo: payload.assignedTo || null,
        notes: payload.notes || "",
        estimatedHours: payload.estimatedHours || 0,
        actualHours: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        jobs: [newJob, ...state.jobs],
        productionSeq: { ...state.productionSeq, job: state.productionSeq.job + 1 }
      };
    },

    updateJob: (state, payload) => {
      // payload: { jobId, updates: { status, priority, assignedTo, ... } }
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === payload.jobId
            ? {
                ...job,
                ...payload.updates,
                updatedAt: new Date().toISOString()
              }
            : job
        )
      };
    },

    updateJobStatus: (state, payload) => {
      // payload: { jobId, newStatus, startDate, endDate }
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === payload.jobId
            ? {
                ...job,
                status: payload.newStatus,
                startDate: payload.newStatus === "in-progress" ? (payload.startDate || new Date().toISOString()) : job.startDate,
                endDate: payload.newStatus === "completed" ? (payload.endDate || new Date().toISOString()) : null,
                updatedAt: new Date().toISOString()
              }
            : job
        )
      };
    },

    addJobTask: (state, payload) => {
      // payload: { jobId, taskId }
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === payload.jobId
            ? {
                ...job,
                tasks: [...job.tasks, payload.taskId],
                updatedAt: new Date().toISOString()
              }
            : job
        )
      };
    },

    addJobNesting: (state, payload) => {
      // payload: { jobId, nestingId }
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === payload.jobId
            ? {
                ...job,
                nestings: [...job.nestings, payload.nestingId],
                updatedAt: new Date().toISOString()
              }
            : job
        )
      };
    },

    recordJobHours: (state, payload) => {
      // payload: { jobId, hours }
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === payload.jobId
            ? {
                ...job,
                actualHours: job.actualHours + payload.hours,
                updatedAt: new Date().toISOString()
              }
            : job
        )
      };
    },

    deleteJob: (state, payload) => {
      // payload: { jobId }
      return {
        ...state,
        jobs: state.jobs.filter(job => job.id !== payload.jobId)
      };
    },

    // TASKS (work steps within a job)
    createTask: (state, payload) => {
      // payload: { jobId, name, type, status, sequenceNo, estimatedMinutes, ... }
      const newTask = {
        id: `TSK-${state.productionSeq.task}`,
        jobId: payload.jobId,
        name: payload.name,
        type: payload.type || "cutting", // cutting, assembly, finishing, qc, packing
        status: "pending", // pending, in-progress, completed, blocked
        sequenceNo: payload.sequenceNo || 1,
        estimatedMinutes: payload.estimatedMinutes || 0,
        actualMinutes: 0,
        assignedTo: payload.assignedTo || null,
        startedAt: null,
        completedAt: null,
        notes: payload.notes || "",
        dependencies: payload.dependencies || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        tasks: [newTask, ...state.tasks],
        productionSeq: { ...state.productionSeq, task: state.productionSeq.task + 1 }
      };
    },

    updateTask: (state, payload) => {
      // payload: { taskId, updates: { status, assignedTo, notes, ... } }
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === payload.taskId
            ? {
                ...task,
                ...payload.updates,
                updatedAt: new Date().toISOString()
              }
            : task
        )
      };
    },

    updateTaskStatus: (state, payload) => {
      // payload: { taskId, newStatus, actualMinutes }
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === payload.taskId
            ? {
                ...task,
                status: payload.newStatus,
                startedAt: payload.newStatus === "in-progress" ? (new Date().toISOString()) : task.startedAt,
                completedAt: payload.newStatus === "completed" ? (new Date().toISOString()) : null,
                actualMinutes: payload.newStatus === "completed" ? (payload.actualMinutes || task.estimatedMinutes) : task.actualMinutes,
                updatedAt: new Date().toISOString()
              }
            : task
        )
      };
    },

    deleteTask: (state, payload) => {
      // payload: { taskId }
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== payload.taskId)
      };
    },

    // SCHEDULES (calendar/timeline planning)
    createSchedule: (state, payload) => {
      // payload: { jobId, date, resourceType, resourceId, duration, notes }
      const newSchedule = {
        id: `SCH-${Date.now()}`,
        jobId: payload.jobId,
        date: payload.date,
        resourceType: payload.resourceType, // machine, person, area
        resourceId: payload.resourceId,
        duration: payload.duration || 480, // minutes
        status: "scheduled", // scheduled, confirmed, cancelled
        notes: payload.notes || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        schedules: [newSchedule, ...state.schedules]
      };
    },

    updateSchedule: (state, payload) => {
      // payload: { scheduleId, updates: { date, resourceId, duration, ... } }
      return {
        ...state,
        schedules: state.schedules.map(schedule =>
          schedule.id === payload.scheduleId
            ? {
                ...schedule,
                ...payload.updates,
                updatedAt: new Date().toISOString()
              }
            : schedule
        )
      };
    },

    updateScheduleStatus: (state, payload) => {
      // payload: { scheduleId, newStatus }
      return {
        ...state,
        schedules: state.schedules.map(schedule =>
          schedule.id === payload.scheduleId
            ? {
                ...schedule,
                status: payload.newStatus,
                updatedAt: new Date().toISOString()
              }
            : schedule
        )
      };
    },

    deleteSchedule: (state, payload) => {
      // payload: { scheduleId }
      return {
        ...state,
        schedules: state.schedules.filter(s => s.id !== payload.scheduleId)
      };
    },

    // NESTING (cutting optimization layouts)
    createNesting: (state, payload) => {
      // payload: { jobId, material, sheets, efficiency, parts, layout, ... }
      const newNesting = {
        id: `NST-${state.productionSeq.nesting}`,
        jobId: payload.jobId,
        material: payload.material, // material code
        sheets: payload.sheets || 1,
        efficiency: payload.efficiency || 0, // percentage
        waste: payload.waste || 0, // kg
        parts: payload.parts || [],
        layout: payload.layout || null, // CAD layout reference
        status: "draft", // draft, approved, in-cutting, completed
        createdAt: new Date().toISOString(),
        approvedAt: null,
        updatedAt: new Date().toISOString()
      };
      return {
        ...state,
        nestings: [newNesting, ...state.nestings],
        productionSeq: { ...state.productionSeq, nesting: state.productionSeq.nesting + 1 }
      };
    },

    updateNesting: (state, payload) => {
      // payload: { nestingId, updates: { status, efficiency, waste, ... } }
      return {
        ...state,
        nestings: state.nestings.map(nesting =>
          nesting.id === payload.nestingId
            ? {
                ...nesting,
                ...payload.updates,
                updatedAt: new Date().toISOString()
              }
            : nesting
        )
      };
    },

    approveNesting: (state, payload) => {
      // payload: { nestingId }
      return {
        ...state,
        nestings: state.nestings.map(nesting =>
          nesting.id === payload.nestingId
            ? {
                ...nesting,
                status: "approved",
                approvedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            : nesting
        )
      };
    },

    updateNestingStatus: (state, payload) => {
      // payload: { nestingId, newStatus }
      return {
        ...state,
        nestings: state.nestings.map(nesting =>
          nesting.id === payload.nestingId
            ? {
                ...nesting,
                status: payload.newStatus,
                updatedAt: new Date().toISOString()
              }
            : nesting
        )
      };
    },

    deleteNesting: (state, payload) => {
      // payload: { nestingId }
      return {
        ...state,
        nestings: state.nestings.filter(n => n.id !== payload.nestingId)
      };
    }
  },

  // ── Seed data for demo (optional) ──
  seedData: {
    jobs: [
      {
        id: "JOB-1",
        orderId: "JT-2426-0001",
        type: "cabinet",
        status: "in-progress",
        dueDate: "2026-07-10",
        startDate: "2026-06-25T08:00:00Z",
        endDate: null,
        priority: "high",
        materials: [
          { code: "MAT-001", qty: 20 },
          { code: "MAT-002", qty: 500 }
        ],
        tasks: ["TSK-1", "TSK-2"],
        nestings: ["NST-1"],
        assignedTo: "Kovács István",
        notes: "Doorstar ajtórendszer gyártása",
        estimatedHours: 40,
        actualHours: 24,
        createdAt: "2026-06-25T08:00:00Z",
        updatedAt: "2026-06-28T15:30:00Z"
      }
    ],
    tasks: [
      {
        id: "TSK-1",
        jobId: "JOB-1",
        name: "Lapok vágása",
        type: "cutting",
        status: "completed",
        sequenceNo: 1,
        estimatedMinutes: 120,
        actualMinutes: 115,
        assignedTo: "Kovács István",
        startedAt: "2026-06-25T08:30:00Z",
        completedAt: "2026-06-25T10:30:00Z",
        notes: "Nesting NST-1 alapján",
        dependencies: [],
        createdAt: "2026-06-25T08:00:00Z",
        updatedAt: "2026-06-25T10:30:00Z"
      },
      {
        id: "TSK-2",
        jobId: "JOB-1",
        name: "Szerelés",
        type: "assembly",
        status: "in-progress",
        sequenceNo: 2,
        estimatedMinutes: 360,
        actualMinutes: 180,
        assignedTo: "Kiss János",
        startedAt: "2026-06-26T08:00:00Z",
        completedAt: null,
        notes: "Munkalapok és ajtók összeszerelése",
        dependencies: ["TSK-1"],
        createdAt: "2026-06-25T08:00:00Z",
        updatedAt: "2026-06-28T14:00:00Z"
      }
    ],
    schedules: [
      {
        id: "SCH-1",
        jobId: "JOB-1",
        date: "2026-06-25",
        resourceType: "machine",
        resourceId: "CNC-1",
        duration: 120,
        status: "confirmed",
        notes: "CNC vágás nap",
        createdAt: "2026-06-24T10:00:00Z",
        updatedAt: "2026-06-25T08:00:00Z"
      }
    ],
    nestings: [
      {
        id: "NST-1",
        jobId: "JOB-1",
        material: "MAT-001",
        sheets: 3,
        efficiency: 87,
        waste: 45,
        parts: [
          { partId: "PART-1", qty: 2, type: "front" },
          { partId: "PART-2", qty: 2, type: "side" }
        ],
        layout: "LAYOUT-DSD-001",
        status: "completed",
        createdAt: "2026-06-24T10:00:00Z",
        approvedAt: "2026-06-24T14:00:00Z",
        updatedAt: "2026-06-25T10:30:00Z"
      }
    ],
    productionSeq: { job: 2, task: 3, nesting: 2 }
  }
};
