import React from "react";
import { Activity } from "lucide-react";

const Header = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-3 px-4">
        <Activity className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold text-base-content">
          MQ-135 Gas Sensor Monitor
        </h1>
      </div>
    </div>
  );
};

export default Header;
