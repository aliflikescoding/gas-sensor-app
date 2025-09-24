import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const TodayPage = () => {
  const [todayData, setTodayData] = useState([]);
  const today = new Date().toISOString().split("T")[0];

  // Helper: calculate average
  const calculateAverage = (data) => {
    if (data.length === 0) return null;

    const sums = data.reduce(
      (acc, entry) => {
        acc.etanol += entry.etanol;
        acc.co2 += entry.co2;
        acc.co += entry.co;
        acc.nh3 += entry.nh3;
        return acc;
      },
      { etanol: 0, co2: 0, co: 0, nh3: 0 }
    );

    const count = data.length;
    return {
      date: today, // keep the date with the average
      etanol: sums.etanol / count,
      co2: sums.co2 / count,
      co: sums.co / count,
      nh3: sums.nh3 / count,
    };
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("todays_data")) || [];

    // Filter only today's entries
    const filtered = saved.filter(
      (entry) => entry.dateTime.split("T")[0] === today
    );

    // Handle old data → history
    if (saved.length > 0 && filtered.length !== saved.length) {
      const oldData = saved.filter(
        (entry) => entry.dateTime.split("T")[0] !== today
      );
      const avg = calculateAverage(oldData);
      if (avg) {
        const history = JSON.parse(localStorage.getItem("data_history")) || [];
        // Merge if same date exists
        const existingIndex = history.findIndex((h) => h.date === avg.date);
        if (existingIndex >= 0) {
          history[existingIndex] = {
            ...avg,
          };
        } else {
          history.push(avg);
        }
        localStorage.setItem("data_history", JSON.stringify(history));
      }
      // Save only today's data back
      localStorage.setItem("todays_data", JSON.stringify(filtered));
    }

    setTodayData(filtered);
  }, [today]);

  // Button handler
  const handleSaveAverage = () => {
    if (todayData.length === 0) return;

    const avg = calculateAverage(todayData);
    if (avg) {
      const history = JSON.parse(localStorage.getItem("data_history")) || [];
      const existingIndex = history.findIndex((h) => h.date === avg.date);

      if (existingIndex >= 0) {
        history[existingIndex] = avg; // Replace existing
      } else {
        history.push(avg); // Add new
      }

      localStorage.setItem("data_history", JSON.stringify(history));

      // 🔹 Clear today's data after saving
      localStorage.setItem("todays_data", JSON.stringify([]));
      setTodayData([]);

      alert("Average saved to history and today's data cleared!");
    }
  };

  return (
    <div className="bg-base-200 min-h-screen">
      <div className="container py-10 px-4 mx-auto">
        <NavLink to="/" className="btn btn-primary mb-4">
          Back to home
        </NavLink>

        <div className="bg-base-100 rounded-box shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Today's Data ({today})</h2>

          {/* Save Average Button */}
          <button
            className="btn btn-secondary mb-4"
            onClick={handleSaveAverage}
            disabled={todayData.length === 0}
          >
            Save Average to History
          </button>

          {todayData.length === 0 ? (
            <p className="text-center text-gray-500">
              No data available for today.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayData.map((entry, index) => (
                <div key={index} className="card bg-base-200 shadow-sm">
                  <div className="card-body">
                    <h3 className="card-title text-sm">
                      {new Date(entry.dateTime).toLocaleTimeString()}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-semibold">Etanol:</span>{" "}
                        {entry.etanol.toFixed(1)}
                      </div>
                      <div>
                        <span className="font-semibold">CO₂:</span>{" "}
                        {entry.co2.toFixed(1)}
                      </div>
                      <div>
                        <span className="font-semibold">CO:</span>{" "}
                        {entry.co.toFixed(1)}
                      </div>
                      <div>
                        <span className="font-semibold">NH₃:</span>{" "}
                        {entry.nh3.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodayPage;
