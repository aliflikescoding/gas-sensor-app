import React, { useState, useEffect, useRef } from "react";
import {
  Bluetooth,
  BluetoothConnected,
  Activity,
  AlertCircle,
  Wifi,
} from "lucide-react";

const BluetoothGasSensor = () => {
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

  // Service and Characteristic UUIDs from your Arduino code
  const SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
  const CHARACTERISTIC_UUID = "abcd1234-5678-1234-5678-abcdef123456";

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-4), `${timestamp}: ${message}`]);
  };

  const parseGasData = (dataString) => {
    try {
      // Parse format: "Etanol:25.3ppm,CO2:412.7ppm,CO:15.2ppm,NH3:8.9ppm"
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
    }
  };

  const connectToBluetooth = async () => {
    // Better Web Bluetooth detection
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

    // Check if bluetooth is available
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

      // Request device
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "MQ135_Sensor" }],
        optionalServices: [SERVICE_UUID],
      });

      deviceRef.current = device;
      addLog(`Found device: ${device.name}`);

      // Connect to GATT server
      const server = await device.gatt.connect();
      addLog("Connected to GATT server");

      // Get service
      const service = await server.getPrimaryService(SERVICE_UUID);
      addLog("Got primary service");

      // Get characteristic
      const characteristic = await service.getCharacteristic(
        CHARACTERISTIC_UUID
      );
      characteristicRef.current = characteristic;
      addLog("Got characteristic");

      // Subscribe to notifications
      await characteristic.startNotifications();
      characteristic.addEventListener(
        "characteristicvaluechanged",
        handleCharacteristicValueChanged
      );
      addLog("Subscribed to notifications");

      setIsConnected(true);
      addLog("Successfully connected! Waiting for data...");

      // Handle disconnect
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
    // Simple color coding based on typical safe levels
    switch (gas) {
      case "co2":
        if (value < 400) return "text-green-600";
        if (value < 1000) return "text-yellow-600";
        return "text-red-600";
      case "co":
        if (value < 9) return "text-green-600";
        if (value < 35) return "text-yellow-600";
        return "text-red-600";
      case "etanol":
      case "nh3":
        if (value < 25) return "text-green-600";
        if (value < 50) return "text-yellow-600";
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">
              MQ-135 Gas Sensor Monitor
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <BluetoothConnected className="w-6 h-6 text-green-600" />
                <button
                  onClick={disconnect}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <Bluetooth className="w-6 h-6 text-gray-400" />
                <button
                  onClick={connectToBluetooth}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Connecting...
                    </>
                  ) : (
                    "Connect to Sensor"
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {!navigator.bluetooth && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800">
              <strong>Browser not supported:</strong>
              {navigator.userAgent.includes("Chrome") &&
              navigator.userAgent.includes("Linux") ? (
                <span>
                  {" "}
                  Web Bluetooth requires flags in Chrome on Linux. Start Chrome
                  with:{" "}
                  <code className="bg-gray-200 px-1 rounded text-sm">
                    google-chrome --enable-experimental-web-platform-features
                    --enable-web-bluetooth
                  </code>
                </span>
              ) : (
                <span>
                  {" "}
                  Web Bluetooth requires Chrome, Edge, or Opera browser.
                </span>
              )}
            </p>
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
            <div key={key} className="bg-gray-50 rounded-lg p-4 border">
              <h3 className="text-sm font-medium text-gray-600 mb-1">{name}</h3>
              <div className={`text-2xl font-bold ${getGasLevel(key, value)}`}>
                {value.toFixed(1)}{" "}
                <span className="text-sm font-normal text-gray-500">
                  {unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        {lastUpdate && (
          <div className="mb-4 text-sm text-gray-600">
            Last update: {lastUpdate.toLocaleString()}
          </div>
        )}

        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-white font-medium mb-2 flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Connection Log
          </h3>
          <div className="text-green-400 font-mono text-sm space-y-1 max-h-32 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">
                No logs yet. Click "Connect to Sensor" to start.
              </div>
            ) : (
              logs.map((log, index) => <div key={index}>{log}</div>)
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p>• Data updates every 5 minutes from the sensor</p>
          <p>
            • Make sure your ESP32 is powered on and the blue LED is blinking
          </p>
          <p>• Stay within Bluetooth range (typically 10-30 feet)</p>
        </div>
      </div>
    </div>
  );
};

export default BluetoothGasSensor;
