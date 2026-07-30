import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { Layout } from "./ui/Layout";
import { Dashboard } from "./ui/pages/Dashboard";
import { Cameras } from "./ui/pages/Cameras";
import { Lenses } from "./ui/pages/Lenses";
import { Films } from "./ui/pages/Films";
import { Rolls } from "./ui/pages/Rolls";
import { RollWorkspace } from "./ui/pages/RollWorkspace";
import { PrintBooklet } from "./ui/pages/PrintBooklet";
import { SettingsPage } from "./ui/pages/Settings";
import { ToastProvider } from "./ui/components";
import "./styles/global.css";

// Hash routing keeps deep links working from file:// origins inside the Tauri
// (desktop) and Capacitor (mobile) webviews, where the History API has no
// server to fall back to.
const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "rolls", element: <Rolls /> },
      { path: "rolls/:id", element: <RollWorkspace /> },
      { path: "cameras", element: <Cameras /> },
      { path: "lenses", element: <Lenses /> },
      { path: "films", element: <Films /> },
      { path: "print", element: <PrintBooklet /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </React.StrictMode>,
);
