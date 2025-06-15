import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { initializeFileSystem } from "./utils/fileSystem";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

// Initialize file system before rendering the app
async function startApp() {
  try {
    await initializeFileSystem();
    console.log("File system ready");
    
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </LocalizationProvider>
      </React.StrictMode>,
    );
  } catch (error) {
    console.error("File system initialization failed:", error);
    
    // Render app anyway with error state
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </LocalizationProvider>
      </React.StrictMode>,
    );
  }
}

startApp();