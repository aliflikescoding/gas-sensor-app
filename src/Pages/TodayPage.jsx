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

    // If there’s old data, average and push to history
    if (saved.length > 0 && filtered.length !== saved.length) {
      const oldData = saved.filter(
        (entry) => entry.dateTime.split("T")[0] !== today
      );
      const avg = calculateAverage(oldData);
      if (avg) {
        const history = JSON.parse(localStorage.getItem("data_history")) || [];
        history.push(avg);
        localStorage.setItem("data_history", JSON.stringify(history));
      }
      // Overwrite only today's data back
      localStorage.setItem("todays_data", JSON.stringify(filtered));
    }

    setTodayData(filtered);
  }, [today]);

  return (
    <div className="bg-base-200 min-h-screen">
      <div className="container py-10 px-4 mx-auto">
        <NavLink to="/" className="btn btn-primary mb-4">
          Back to home
        </NavLink>
        <div className="bg-base-100 rounded-box shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Today's Data ({today})</h2>

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
