import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Coach from "./pages/Coach";
import Dashboard from "./pages/Dashboard";
import Month from "./pages/Month";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Today from "./pages/Today";
import VisionBoard from "./pages/VisionBoard";
import { Route, Switch } from "wouter";

function Router() {
  return <Switch><Route path="/"><DashboardLayout><Dashboard /></DashboardLayout></Route><Route path="/today"><DashboardLayout><Today /></DashboardLayout></Route><Route path="/visions"><DashboardLayout><VisionBoard /></DashboardLayout></Route><Route path="/month"><DashboardLayout><Month /></DashboardLayout></Route><Route path="/coach"><DashboardLayout><Coach /></DashboardLayout></Route><Route path="/settings"><DashboardLayout><Settings /></DashboardLayout></Route><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
