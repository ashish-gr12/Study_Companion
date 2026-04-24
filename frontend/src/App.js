import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import StudySetDetail from "./pages/StudySetDetail";
import Practice from "./pages/Practice";
import Analysis from "./pages/Analysis";
import { ProfileProvider } from "./context/ProfileContext";

function App() {
  return (
    <div className="App">
      <ProfileProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/library" element={<Library />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/set/:id" element={<StudySetDetail />} />
            </Routes>
          </Layout>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </ProfileProvider>
    </div>
  );
}

export default App;
