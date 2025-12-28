import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { PlanningSetupPage } from './pages/PlanningSetup';
import { PeopleManagementPage } from './pages/PeopleManagement';
import { ProjectsManagementPage } from './pages/ProjectsManagement';
import { PlanningPeriodDetailPage } from './pages/PlanningPeriodDetail';

function App() {
  return (
    <MantineProvider>
      <ModalsProvider>
        <Notifications />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/planning" replace />} />
              <Route path="planning" element={<PlanningSetupPage />} />
              <Route path="planning/:periodId" element={<PlanningPeriodDetailPage />} />
              <Route path="people" element={<PeopleManagementPage />} />
              <Route path="projects" element={<ProjectsManagementPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ModalsProvider>
    </MantineProvider>
  );
}

export default App;
