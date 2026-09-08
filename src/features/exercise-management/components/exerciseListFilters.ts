import type { CurrentStepFilter } from '../workflowLabels'

export type OfficialScenarioFilter = 'All scenarios' | 'Assigned' | 'Not assigned'

export type ExerciseListFilterValues = {
  exerciseCode: string
  pl3: string
  toolkit: string
  reviewStage: CurrentStepFilter
  finalStatus: string
  createdFrom: string
  createdTo: string
  officialScenario: OfficialScenarioFilter
  reviewer: string
  submittedFrom: string
  submittedTo: string
  archivedFrom: string
  archivedTo: string
}

export function emptyExerciseListFilters(): ExerciseListFilterValues {
  return {
    exerciseCode: '',
    pl3: '',
    toolkit: 'All toolkits',
    reviewStage: 'All stages',
    finalStatus: 'All statuses',
    createdFrom: '',
    createdTo: '',
    officialScenario: 'All scenarios',
    reviewer: 'All reviewers',
    submittedFrom: '',
    submittedTo: '',
    archivedFrom: '',
    archivedTo: '',
  }
}
