import React, { useState, useRef } from "react";
import {
  Bluetooth,
  BluetoothConnected,
  AlertCircle,
  Wifi,
  History,
  BookOpenText,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const HomePage = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [gasData, setGasData] = useState({
    etanol: 0,
    co2: 0,
    co: 0,
    nh3: 0,
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  const deviceRef = useRef(null);
  const characteristicRef = useRef(null);

  const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
  const CHARACTERISTIC_UUID = "abcd1234-5678-1234-5678-abcdef123456";

  // Save data to todays_data (one key only)
  const saveToTodaysData = (gasData) => {
    try {
      const timestamp = new Date().toISOString();

      const newEntry = {
        ...gasData,
        dateTime: timestamp,
      };

      // Get existing data
      const existingData = localStorage.getItem("todays_data");
      let todaysData = existingData ? JSON.parse(existingData) : [];

      // Add new entry
      todaysData.push(newEntry);

      // Keep only the last 100 entries
      if (todaysData.length > 100) {
        todaysData = todaysData.slice(-100);
      }

      // Save back to localStorage
      localStorage.setItem("todays_data", JSON.stringify(todaysData));

      console.log("Saved to today's data:", newEntry);
      addLog(`Data saved to today's storage (${todaysData.length} entries)`);
    } catch (err) {
      console.error("Error saving to today's data:", err);
      addLog("Error saving data to storage");
    }
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-4), `${timestamp}: ${message}`]);
  };

  const parseGasData = (dataString) => {
    try {
      console.log("Raw data:", dataString);
      const parts = dataString.split(",");
      const data = {};

      parts.forEach((part) => {
        const [gas, value] = part.split(":");
        const numericValue = parseFloat(value.replace("ppm", ""));

        switch (gas.toLowerCase()) {
          case "etanol":
            data.etanol = numericValue;
            break;
          case "co2":
            data.co2 = numericValue;
            break;
          case "co":
            data.co = numericValue;
            break;
          case "nh3":
            data.nh3 = numericValue;
            break;
        }
      });

      return data;
    } catch (err) {
      console.error("Error parsing gas data:", err);
      return null;
    }
  };

  const handleCharacteristicValueChanged = (event) => {
    const value = event.target.value;
    const decoder = new TextDecoder("utf-8");
    const dataString = decoder.decode(value);

    addLog(`Received: ${dataString}`);

    const parsedData = parseGasData(dataString);
    if (parsedData) {
      setGasData(parsedData);
      setLastUpdate(new Date());

      saveToTodaysData(parsedData);
    }
  };

  const connectToBluetooth = async () => {
    if (!navigator.bluetooth) {
      if (
        navigator.userAgent.includes("Chrome") &&
        navigator.userAgent.includes("Linux")
      ) {
        setError(
          "Web Bluetooth requires flags in Chrome on Linux. Start Chrome with: google-chrome --enable-experimental-web-platform-features --enable-web-bluetooth"
        );
      } else {
        setError(
          "Web Bluetooth API is not supported in this browser. Use Chrome, Edge, or Opera."
        );
      }
      return;
    }

    const isAvailable = await navigator.bluetooth.getAvailability();
    if (!isAvailable) {
      setError(
        "Bluetooth is not available. Make sure Bluetooth is enabled on your system."
      );
      return;
    }

    try {
      setIsConnecting(true);
      setError("");
      addLog("Searching for MQ135_Sensor...");

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "MQ135_Sensor" }],
        optionalServices: [SERVICE_UUID],
      });

      deviceRef.current = device;
      addLog(`Found device: ${device.name}`);

      const server = await device.gatt.connect();
      addLog("Connected to GATT server");

      const service = await server.getPrimaryService(SERVICE_UUID);
      addLog("Got primary service");

      const characteristic = await service.getCharacteristic(
        CHARACTERISTIC_UUID
      );
      characteristicRef.current = characteristic;
      addLog("Got characteristic");

      await characteristic.startNotifications();
      characteristic.addEventListener(
        "characteristicvaluechanged",
        handleCharacteristicValueChanged
      );
      addLog("Subscribed to notifications");

      setIsConnected(true);
      addLog("Successfully connected! Waiting for data...");

      device.addEventListener("gattserverdisconnected", () => {
        setIsConnected(false);
        addLog("Device disconnected");
      });
    } catch (err) {
      console.error("Bluetooth connection error:", err);
      setError(`Connection failed: ${err.message}`);
      addLog(`Error: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    if (deviceRef.current && deviceRef.current.gatt.connected) {
      deviceRef.current.gatt.disconnect();
      addLog("Disconnected manually");
    }
    setIsConnected(false);
  };

  const getGasLevel = (gas, value) => {
    switch (gas) {
      case "co2":
        if (value < 400) return "text-success";
        if (value < 1000) return "text-warning";
        return "text-error";
      case "co":
        if (value < 9) return "text-success";
        if (value < 35) return "text-warning";
        return "text-error";
      case "etanol":
      case "nh3":
        if (value < 25) return "text-success";
        if (value < 50) return "text-warning";
        return "text-error";
      default:
        return "text-neutral";
    }
  };

  return (
    <div className="bg-base-200 min-h-screen">
      <div className="container mx-auto py-10 px-4">
        <div className="bg-base-100 rounded-box shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <BluetoothConnected className="w-6 h-6 text-success" />
                  <button onClick={disconnect} className="btn btn-error">
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <Bluetooth className="w-6 h-6 text-base-content opacity-50" />
                  <button
                    onClick={connectToBluetooth}
                    disabled={isConnecting}
                    className="btn btn-primary"
                  >
                    {isConnecting ? (
                      <>
                        <div className="loading loading-spinner loading-sm"></div>
                        Connecting...
                      </>
                    ) : (
                      "Connect to Sensor"
                    )}
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <NavLink to="/this-month" className="btn">
                <History className="w-5 h-5" />
                This month average
              </NavLink>
              <NavLink to="/today" className="btn">
                <BookOpenText className="w-5 h-5" />
                Today's Data
              </NavLink>
            </div>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              {
                key: "etanol",
                name: "Ethanol",
                unit: "ppm",
                value: gasData.etanol,
              },
              {
                key: "co2",
                name: "Carbon Dioxide",
                unit: "ppm",
                value: gasData.co2,
              },
              {
                key: "co",
                name: "Carbon Monoxide",
                unit: "ppm",
                value: gasData.co,
              },
              { key: "nh3", name: "Ammonia", unit: "ppm", value: gasData.nh3 },
            ].map(({ key, name, unit, value }) => (
              <div key={key} className="card bg-base-200">
                <div className="card-body p-4">
                  <h3 className="text-sm font-medium text-base-content opacity-70">
                    {name}
                  </h3>
                  <div
                    className={`text-2xl font-bold ${getGasLevel(key, value)}`}
                  >
                    {value.toFixed(1)}{" "}
                    <span className="text-sm font-normal opacity-70">
                      {unit}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {lastUpdate && (
            <div className="mb-4 text-sm text-base-content opacity-70">
              Last update: {lastUpdate.toLocaleString()}
            </div>
          )}

          <div className="bg-neutral rounded-box p-4">
            <h3 className="text-neutral-content font-medium mb-2 flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Connection Log
            </h3>
            <div className="text-success font-mono text-sm space-y-1 max-h-32 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-base-content opacity-50">
                  No logs yet. Click "Connect to Sensor" to start.
                </div>
              ) : (
                logs.map((log, index) => <div key={index}>{log}</div>)
              )}
            </div>
          </div>

          <div className="mt-4 text-xs text-base-content opacity-70 space-y-1">
            <p>• Data updates every 1 minute from the sensor</p>
            <p>• Make sure your ESP32 is powered on</p>
            <p>• Stay within Bluetooth range (typically 10-30 feet)</p>
            <p>• Data is automatically saved to today's storage</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
