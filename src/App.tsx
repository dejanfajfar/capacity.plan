import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { PlanningSetupPage } from "./pages/PlanningSetup";
import { PeopleManagementPage } from "./pages/PeopleManagement";
import { ProjectsManagementPage } from "./pages/ProjectsManagement";
import { PlanningPeriodDetailPage } from "./pages/PlanningPeriodDetail";
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
              <Route path="projects" element={<ProjectsManagementPage />} />
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
