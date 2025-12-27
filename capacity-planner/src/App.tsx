import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { PlanningSetupPage } from './pages/PlanningSetup';
import { PeopleManagementPage } from './pages/PeopleManagement';
import { ProjectsManagementPage } from './pages/ProjectsManagement';
import { AssignmentDashboardPage } from './pages/AssignmentDashboard';
import { CapacityAnalysisPage } from './pages/CapacityAnalysis';

function App() {
  return (
    <MantineProvider>
      <Notifications />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/planning" replace />} />
            <Route path="planning" element={<PlanningSetupPage />} />
            <Route path="people" element={<PeopleManagementPage />} />
            <Route path="projects" element={<ProjectsManagementPage />} />
            <Route path="assignments" element={<AssignmentDashboardPage />} />
            <Route path="analysis" element={<CapacityAnalysisPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
