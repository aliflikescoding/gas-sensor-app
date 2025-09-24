import React from "react";
import HomePage from "./Pages/HomePage";
import { Route, Routes } from "react-router-dom";
import Header from "./Components/Header";
import TodayPage from "./Pages/TodayPage";
import HistoryPage from "./Pages/HistoryPage";

const App = () => {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </>
  );
};

export default App;
