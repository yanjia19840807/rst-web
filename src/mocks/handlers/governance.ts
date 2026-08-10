import { http, HttpResponse } from 'msw'

import {
  benchmarkingData,
  dashboardData,
  repositoryRows,
  supportRepositoryData,
  validationWorkflowRows,
} from '../data/governance'

export const governanceHandlers = [
  http.get('*/api/v1/governance/dashboard', () => HttpResponse.json(dashboardData)),
  http.get('*/api/v1/governance/repository', () => HttpResponse.json(repositoryRows)),
  http.get('*/api/v1/governance/support-repository', () =>
    HttpResponse.json(supportRepositoryData),
  ),
  http.get('*/api/v1/governance/benchmarking', () => HttpResponse.json(benchmarkingData)),
  http.get('*/api/v1/governance/validation-workflow', () =>
    HttpResponse.json(validationWorkflowRows),
  ),
]
