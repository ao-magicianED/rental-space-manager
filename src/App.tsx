import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "./pages/Dashboard";
import { Import } from "./pages/Import";
import { Settings } from "./pages/Settings";
import { Analytics } from "./pages/Analytics";
import { PropertyProspects } from "./pages/PropertyProspects";
import { Bookings } from "./pages/Bookings";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type Page = "dashboard" | "import" | "settings" | "analytics" | "properties" | "bookings";

function getPageFromHash(): Page {
  const hash = window.location.hash.slice(1);
  if (hash === "import") return "import";
  if (hash === "settings") return "settings";
  if (hash === "analytics") return "analytics";
  if (hash === "properties") return "properties";
  if (hash === "bookings") return "bookings";
  return "dashboard";
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getPageFromHash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router currentPage={currentPage} />
    </QueryClientProvider>
  );
}

function Router({ currentPage }: { currentPage: Page }) {
  switch (currentPage) {
    case "import":
      return <Import />;
    case "settings":
      return <Settings />;
    case "analytics":
      return <Analytics />;
    case "properties":
      return <PropertyProspects />;
    case "bookings":
      return <Bookings />;
    default:
      return <Dashboard />;
  }
}

export default App;
