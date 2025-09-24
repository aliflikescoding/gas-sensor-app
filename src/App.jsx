import React from "react";
import HomePage from "./Pages/HomePage";
import { Route, Routes } from "react-router-dom";
import Header from "./Components/Header";

const App = () => {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </>
  );
};

export default App;
