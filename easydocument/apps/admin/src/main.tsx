import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { AdminShell } from "./app/AdminShell";
import "./styles.css";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2457A7"
    },
    secondary: {
      main: "#009B72"
    },
    background: {
      default: "#F7F8FA"
    }
  },
  shape: {
    borderRadius: 8
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AdminShell />
    </ThemeProvider>
  </React.StrictMode>
);
