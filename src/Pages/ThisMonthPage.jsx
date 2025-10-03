import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ThisMonthPage = () => {
  const [historyData, setHistoryData] = useState([]);
  const [importData, setImportData] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

  // Eco thresholds (daily average)
  const ecoThresholds = {
    co: 50,
    co2: 100000,
    nh3: 10,
    etanol: 10,
  };

  // Function to check if value is eco-friendly
  const isEco = (value, pollutant) => {
    return value <= ecoThresholds[pollutant];
  };

  // Helper: calculate monthly average
  const calculateMonthlyAverage = (data) => {
    if (data.length === 0) return null;
    const sums = data.reduce(
      (acc, entry) => {
        acc.etanol += entry.etanol || 0;
        acc.co2 += entry.co2 || 0;
        acc.co += entry.co || 0;
        acc.nh3 += entry.nh3 || 0;
        return acc;
      },
      { etanol: 0, co2: 0, co: 0, nh3: 0 }
    );
    const count = data.length;

    // Get the month from the first entry
    const monthDate = data[0].date.slice(0, 7); // YYYY-MM

    return {
      month: monthDate,
      etanol: sums.etanol / count,
      co2: sums.co2 / count,
      co: sums.co / count,
      nh3: sums.nh3 / count,
      dayCount: count,
    };
  };

  useEffect(() => {
    loadHistoryData();
  }, []);

  const loadHistoryData = () => {
    const history = JSON.parse(localStorage.getItem("data_history")) || [];

    // Filter data for current month and previous months
    const currentMonthData = history.filter(
      (entry) => entry.date.slice(0, 7) === currentMonth
    );

    const previousMonthsData = history.filter(
      (entry) => entry.date.slice(0, 7) !== currentMonth
    );

    // If there's previous months data, automatically archive it
    if (previousMonthsData.length > 0) {
      // Group by month
      const monthGroups = {};
      previousMonthsData.forEach((entry) => {
        const month = entry.date.slice(0, 7);
        if (!monthGroups[month]) {
          monthGroups[month] = [];
        }
        monthGroups[month].push(entry);
      });

      // Calculate average for each month and save to monthly_data
      const monthlyData =
        JSON.parse(localStorage.getItem("monthly_data")) || [];

      Object.keys(monthGroups).forEach((month) => {
        const avg = calculateMonthlyAverage(monthGroups[month]);
        if (avg) {
          const existingIndex = monthlyData.findIndex((m) => m.month === month);
          if (existingIndex >= 0) {
            monthlyData[existingIndex] = avg;
          } else {
            monthlyData.push(avg);
          }
        }
      });

      // Save monthly data
      localStorage.setItem("monthly_data", JSON.stringify(monthlyData));

      // Update data_history to only keep current month
      localStorage.setItem("data_history", JSON.stringify(currentMonthData));

      showMessage(
        `Archived ${previousMonthsData.length} entries from previous months`,
        "success"
      );
    }

    const sortedHistory = currentMonthData.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    setHistoryData(sortedHistory);
  };

  const showMessage = (text, type = "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  // Save monthly average manually
  const handleSaveMonthlyAverage = () => {
    if (historyData.length === 0) {
      showMessage("No data available to save", "error");
      return;
    }

    const avg = calculateMonthlyAverage(historyData);
    if (avg) {
      const monthlyData =
        JSON.parse(localStorage.getItem("monthly_data")) || [];
      const existingIndex = monthlyData.findIndex((m) => m.month === avg.month);

      if (existingIndex >= 0) {
        monthlyData[existingIndex] = avg;
      } else {
        monthlyData.push(avg);
      }

      localStorage.setItem("monthly_data", JSON.stringify(monthlyData));
      localStorage.setItem("data_history", JSON.stringify([]));
      setHistoryData([]);
      showMessage(
        `Monthly average saved (${avg.dayCount} days averaged) and this month's data cleared!`,
        "success"
      );
    }
  };

  // Export data to JSON file
  const exportData = () => {
    if (historyData.length === 0) {
      showMessage("No data available to export", "error");
      return;
    }

    const dataStr = JSON.stringify(historyData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `sensor-data-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage("Data exported successfully!", "success");
  };

  // Import data from JSON file
  const importDataFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        validateAndMergeData(importedData);
      } catch (error) {
        console.error(error);
        showMessage("Invalid JSON file", "error");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // Import data from text area
  const importDataFromText = () => {
    if (!importData.trim()) {
      showMessage("Please enter JSON data", "error");
      return;
    }

    try {
      const importedData = JSON.parse(importData);
      validateAndMergeData(importedData);
      setImportData("");
    } catch (error) {
      console.error(error);
      showMessage("Invalid JSON data", "error");
    }
  };

  // Validate and merge imported data with existing data
  const validateAndMergeData = (importedData) => {
    if (!Array.isArray(importedData)) {
      showMessage("Imported data must be an array", "error");
      return;
    }

    const validEntries = importedData.filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        entry.date &&
        !isNaN(new Date(entry.date).getTime())
    );

    if (validEntries.length === 0) {
      showMessage("No valid data entries found", "error");
      return;
    }

    const existingData = JSON.parse(localStorage.getItem("data_history")) || [];
    const dataMap = new Map();

    existingData.forEach((entry) => {
      if (entry.date) {
        dataMap.set(entry.date, entry);
      }
    });

    validEntries.forEach((entry) => {
      if (entry.date) {
        dataMap.set(entry.date, entry);
      }
    });

    const mergedData = Array.from(dataMap.values()).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    localStorage.setItem("data_history", JSON.stringify(mergedData));
    setHistoryData(mergedData);
    showMessage(
      `Successfully imported ${validEntries.length} entries. Total entries: ${mergedData.length}`,
      "success"
    );
  };

  // Clear all data
  const clearAllData = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all of this month's data? This action cannot be undone."
      )
    ) {
      localStorage.removeItem("data_history");
      setHistoryData([]);
      showMessage("All data cleared successfully", "success");
    }
  };

  // Prepare chart data
  const chartData = {
    labels: historyData.map((entry) =>
      new Date(entry.date).toLocaleDateString()
    ),
    datasets: [
      {
        label: "Etanol",
        data: historyData.map((entry) => entry.etanol),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
      },
      {
        label: "CO₂",
        data: historyData.map((entry) => entry.co2),
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
      },
      {
        label: "CO",
        data: historyData.map((entry) => entry.co),
        borderColor: "rgba(255, 206, 86, 1)",
        backgroundColor: "rgba(255, 206, 86, 0.2)",
      },
      {
        label: "NH₃",
        data: historyData.map((entry) => entry.nh3),
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "This Month's Averages" },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Date",
        },
      },
      y: {
        title: {
          display: true,
          text: "Value",
        },
      },
    },
  };

  return (
    <div className="bg-base-200 min-h-screen">
      <div className="container py-10 px-4 mx-auto">
        <NavLink to="/" className="btn btn-primary mb-4">
          Back to home
        </NavLink>

        {/* Export/Import Section */}
        <div className="bg-base-100 rounded-box shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Data Management</h2>

          {/* Message Display */}
          {message.text && (
            <div
              className={`alert alert-${
                message.type === "error"
                  ? "error"
                  : message.type === "success"
                  ? "success"
                  : "info"
              } mb-4`}
            >
              <span>{message.text}</span>
            </div>
          )}

          {/* Save Monthly Average Button */}
          {historyData.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold mb-2">
                Save Monthly Average
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Calculate and save the average of all daily data for this month
                ({currentMonth}). This will archive {historyData.length} day(s)
                of data.
              </p>
              <button
                onClick={handleSaveMonthlyAverage}
                className="btn btn-secondary"
              >
                Save Average to Monthly History
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Export Data</h3>
              <p className="text-sm text-gray-600">
                Download this month's data as a JSON file to share or backup.
              </p>
              <button
                onClick={exportData}
                disabled={historyData.length === 0}
                className="btn btn-success w-full"
              >
                Export Data ({historyData.length} entries)
              </button>
            </div>

            {/* Import Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Import Data</h3>

              {/* File Import */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Import from JSON file:
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={importDataFromFile}
                  className="file-input file-input-bordered w-full"
                />
              </div>

              {/* Text Import */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Or paste JSON data:
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder='Paste JSON data here: [{"date": "2025-09-24", "etanol": 97.5, ...}]'
                  className="textarea textarea-bordered w-full h-24"
                />
                <button
                  onClick={importDataFromText}
                  disabled={!importData.trim()}
                  className="btn btn-primary w-full mt-2"
                >
                  Import from Text
                </button>
              </div>
            </div>
          </div>

          {/* Clear Data Section */}
          {historyData.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-error mb-2">
                Danger Zone
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Permanently delete all of this month's data. This action cannot
                be undone.
              </p>
              <button onClick={clearAllData} className="btn btn-error">
                Clear All Data
              </button>
            </div>
          )}
        </div>

        <div className="bg-base-100 rounded-box shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">This Month's Data Average</h2>
          {historyData.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <p className="text-center text-gray-500">
              No data available for chart.
            </p>
          )}
        </div>

        <div className="bg-base-100 rounded-box shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">
            This Month's Data ({currentMonth})
          </h2>
          {historyData.length === 0 ? (
            <p className="text-center text-gray-500">
              No data available for this month.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {historyData.map((entry, index) => (
                <div key={index} className="card bg-base-200 shadow-sm">
                  <div className="card-body">
                    <h3 className="card-title text-sm">
                      {new Date(entry.date).toLocaleDateString()}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-semibold">Etanol:</span>{" "}
                        {entry.etanol?.toFixed(1) || "N/A"}{" "}
                        <div
                          className={`badge badge-xs ${
                            isEco(entry.etanol, "etanol")
                              ? "badge-success"
                              : "badge-error"
                          }`}
                        >
                          {isEco(entry.etanol, "etanol") ? "eco" : "not eco"}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold">CO₂:</span>{" "}
                        {entry.co2?.toFixed(1) || "N/A"}{" "}
                        <div
                          className={`badge badge-xs ${
                            isEco(entry.co2, "co2")
                              ? "badge-success"
                              : "badge-error"
                          }`}
                        >
                          {isEco(entry.co2, "co2") ? "eco" : "not eco"}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold">CO:</span>{" "}
                        {entry.co?.toFixed(1) || "N/A"}{" "}
                        <div
                          className={`badge badge-xs ${
                            isEco(entry.co, "co")
                              ? "badge-success"
                              : "badge-error"
                          }`}
                        >
                          {isEco(entry.co, "co") ? "eco" : "not eco"}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold">NH₃:</span>{" "}
                        {entry.nh3?.toFixed(1) || "N/A"}{" "}
                        <div
                          className={`badge badge-xs ${
                            isEco(entry.nh3, "nh3")
                              ? "badge-success"
                              : "badge-error"
                          }`}
                        >
                          {isEco(entry.nh3, "nh3") ? "eco" : "not eco"}
                        </div>
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

export default ThisMonthPage;
