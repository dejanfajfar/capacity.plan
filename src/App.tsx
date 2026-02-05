import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/charts/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { PlanningSetupPage } from "./pages/PlanningSetup";
import { PeopleManagementPage } from "./pages/PeopleManagement";
import { PersonDetailPage } from "./pages/PersonDetail";
import { ProjectsManagementPage } from "./pages/ProjectsManagement";
import { PlanningPeriodDetailPage } from "./pages/PlanningPeriodDetail";
import { HolidaysManagementPage } from "./pages/HolidaysManagement";
import { JobsManagementPage } from "./pages/JobsManagement";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { oneDarkTheme, solarizedLightTheme } from "./theme";

function AppContent() {
  const { colorScheme } = useTheme();
  const theme = colorScheme === "dark" ? oneDarkTheme : solarizedLightTheme;

  return (
    <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
      <ModalsProvider>
        <Notifications />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/planning" replace />} />
              <Route path="planning" element={<PlanningSetupPage />} />
              <Route
                path="planning/:periodId"
                element={<PlanningPeriodDetailPage />}
              />
              <Route path="people" element={<PeopleManagementPage />} />
              <Route path="people/:personId" element={<PersonDetailPage />} />
              <Route path="projects" element={<ProjectsManagementPage />} />
              <Route path="jobs" element={<JobsManagementPage />} />
              <Route path="holidays" element={<HolidaysManagementPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ModalsProvider>
    </MantineProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
