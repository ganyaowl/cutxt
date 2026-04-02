import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import App from "./App.jsx";

const theme = createTheme({
  primaryColor: "violet",
  defaultRadius: "md",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  headings: {
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    fontWeight: "600",
  },
  defaultGradient: { from: "violet", to: "grape", deg: 120 },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ModalsProvider>
        <Notifications position="top-right" zIndex={4000} />
        <App />
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
);
