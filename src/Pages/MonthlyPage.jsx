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

const MonthlyPage = () => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [importData, setImportData] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  // Eco thresholds (monthly average approximation)
  const ecoThresholds = {
    co: 50,
    co2: 100000,
    nh3: 10,
    etanol: 10,
  };

  const isEco = (value, pollutant) => {
    return value <= ecoThresholds[pollutant];
  };

  // Month names
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  useEffect(() => {
    loadMonthlyData();
  }, []);

  const loadMonthlyData = () => {
    const data = JSON.parse(localStorage.getItem("monthly_data")) || [];
    // sort descending (newest year first, then newest month)
    const sorted = data.sort((a, b) => new Date(b.month) - new Date(a.month));
    setMonthlyData(sorted);
  };

  const showMessage = (text, type = "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  // Export data
  const exportData = () => {
    if (monthlyData.length === 0) {
      showMessage("No data available to export", "error");
      return;
    }

    const dataStr = JSON.stringify(monthlyData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `monthly-data-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showMessage("Monthly data exported successfully!", "success");
  };

  // Import data
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

  const validateAndMergeData = (importedData) => {
    if (!Array.isArray(importedData)) {
      showMessage("Imported data must be an array", "error");
      return;
    }

    const validEntries = importedData.filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        entry.month &&
        /^\d{4}-\d{2}$/.test(entry.month)
    );

    if (validEntries.length === 0) {
      showMessage("No valid monthly entries found", "error");
      return;
    }

    const existingData = JSON.parse(localStorage.getItem("monthly_data")) || [];
    const dataMap = new Map();

    existingData.forEach((entry) => {
      dataMap.set(entry.month, entry);
    });

    validEntries.forEach((entry) => {
      dataMap.set(entry.month, entry);
    });

    const mergedData = Array.from(dataMap.values()).sort(
      (a, b) => new Date(b.month) - new Date(a.month)
    );

    localStorage.setItem("monthly_data", JSON.stringify(mergedData));
    setMonthlyData(mergedData);
    showMessage(
      `Successfully imported ${validEntries.length} entries. Total entries: ${mergedData.length}`,
      "success"
    );
  };

  // Chart data
  const chartData = {
    labels: monthlyData.map((entry) => {
      const [year, month] = entry.month.split("-");
      return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
    }),
    datasets: [
      {
        label: "Etanol",
        data: monthlyData.map((entry) => entry.etanol),
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
      },
      {
        label: "CO₂",
        data: monthlyData.map((entry) => entry.co2),
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
      },
      {
        label: "CO",
        data: monthlyData.map((entry) => entry.co),
        borderColor: "rgba(255, 206, 86, 1)",
        backgroundColor: "rgba(255, 206, 86, 0.2)",
      },
      {
        label: "NH₃",
        data: monthlyData.map((entry) => entry.nh3),
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Monthly Averages" },
    },
    scales: {
      x: { title: { display: true, text: "Month" } },
      y: { title: { display: true, text: "Value" } },
    },
  };

  // Group by year
  const groupedByYear = monthlyData.reduce((acc, entry) => {
    const [year] = entry.month.split("-");
    if (!acc[year]) acc[year] = [];
    acc[year].push(entry);
    return acc;
  }, {});

  return (
    <div className="bg-base-200 min-h-screen">
      <div className="container py-10 px-4 mx-auto">
        <NavLink to="/" className="btn btn-primary mb-4">
          Back to home
        </NavLink>

        {/* Export/Import Section */}
        <div className="bg-base-100 rounded-box shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Monthly Data Management</h2>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Export Data</h3>
              <button
                onClick={exportData}
                disabled={monthlyData.length === 0}
                className="btn btn-success w-full"
              >
                Export Data ({monthlyData.length} entries)
              </button>
            </div>

            {/* Import Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Import Data</h3>
              <input
                type="file"
                accept=".json"
                onChange={importDataFromFile}
                className="file-input file-input-bordered w-full"
              />
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder='Paste JSON data here: [{"month": "2025-09", "etanol": 94.08, ...}]'
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

        {/* Chart Section */}
        <div className="bg-base-100 rounded-box shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Monthly Averages</h2>
          {monthlyData.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <p className="text-center text-gray-500">
              No monthly data available for chart.
            </p>
          )}
        </div>

        {/* Yearly Grouped Monthly Data */}
        {Object.keys(groupedByYear)
          .sort((a, b) => b - a)
          .map((year) => (
            <div
              key={year}
              className="bg-base-100 rounded-box shadow-lg p-6 mb-6"
            >
              <h2 className="text-2xl font-bold mb-4">Year {year}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedByYear[year]
                  .sort((a, b) => new Date(a.month) - new Date(b.month))
                  .map((entry, idx) => {
                    const [y, m] = entry.month.split("-");
                    return (
                      <div key={idx} className="card bg-base-200 shadow-sm">
                        <div className="card-body">
                          <h3 className="card-title text-sm">
                            {monthNames[parseInt(m, 10) - 1]} {y}
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
                                {isEco(entry.etanol, "etanol")
                                  ? "eco"
                                  : "not eco"}
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
                    );
                  })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default MonthlyPage;
