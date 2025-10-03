import React from "react";
import HomePage from "./Pages/HomePage";
import { Route, Routes } from "react-router-dom";
import Header from "./Components/Header";
import TodayPage from "./Pages/TodayPage";
import ThisMonthPage from "./Pages/ThisMonthPage";

const App = () => {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/this-month" element={<ThisMonthPage />} />
      </Routes>
    </>
  );
};

export default App;
