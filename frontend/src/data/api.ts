export * from './types';
import { dataProvider } from './dataProvider';

/**
 * @deprecated Use dataProvider from ./dataProvider directly.
 * Mapping for backward compatibility during refactor.
 */
export const dataApi = {
  fetchDashboardKPIs: dataProvider.getDashboardKPIs.bind(dataProvider),
  fetchLeads: dataProvider.getLeads.bind(dataProvider),
  fetchLeadsTrend: dataProvider.getLeadsTrend.bind(dataProvider),
  fetchStageDistribution: dataProvider.getStageDistribution.bind(dataProvider),
  fetchTopFollowUps: dataProvider.getTopFollowUps.bind(dataProvider),
  fetchFunnel: dataProvider.getFunnel.bind(dataProvider),
  fetchAgentPerformance: dataProvider.getAgentPerformance.bind(dataProvider),
  fetchVoicePulse: dataProvider.getVoicePulse.bind(dataProvider),
  fetchVoiceTrend: dataProvider.getVoiceTrend.bind(dataProvider),
  fetchSessions: dataProvider.getSessions.bind(dataProvider),
  fetchConversation: dataProvider.getConversation.bind(dataProvider),
  fetchLeadInsightByPhone: dataProvider.getLeadInsightByPhone.bind(dataProvider),
  fetchLeadInsightsSummary: dataProvider.getLeadInsightsSummary.bind(dataProvider),
  fetchTasks: dataProvider.getTasks.bind(dataProvider),
  createTask: dataProvider.createTask.bind(dataProvider),
  toggleTaskDone: dataProvider.toggleTaskDone.bind(dataProvider),
  fetchReportsData: dataProvider.getReportsData.bind(dataProvider),
  fetchExportHistory: dataProvider.getExportHistory.bind(dataProvider),
  logExportAction: dataProvider.logExportAction.bind(dataProvider),
  updateLeadStatus: dataProvider.updateLeadStatus.bind(dataProvider),
  toggleWorkedStatus: dataProvider.toggleWorkedStatus.bind(dataProvider),
};
