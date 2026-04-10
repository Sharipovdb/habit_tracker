import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import type { Theme } from "../hooks/useTheme";

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
}

export default function AppLayout({ theme, onToggleTheme }: Props) {
  return (
    <div className="app-layout">
      <Sidebar theme={theme} onToggleTheme={onToggleTheme} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
