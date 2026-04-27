import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar from "./components/Navbar";
import PlayersPage from "./pages/PlayersPage";
import TeamsPage from "./pages/TeamsPage";
import LivePage from "./pages/LivePage";
import PropsPage from "./pages/PropsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/players" replace />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/props" element={<PropsPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
