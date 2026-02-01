"use client";

import { useState } from "react";

interface TabProps {
  buttonContent: React.ReactElement;
  tabContent: React.ReactElement;
}

interface TabViewProps {
  tabs: TabProps[];
  defaultTab?: number;
  className?: string;
}

interface TabButtonProps {
  children: React.ReactElement;
  onClick: () => void;
  isActive: boolean;
}

export function TabView({
  tabs,
  defaultTab = 0,
  className = "",
}: TabViewProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className={className}>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab, index) => (
          <TabButton
            key={index}
            onClick={() => {
              setActiveTab(index);
            }}
            isActive={activeTab === index}
          >
            {tab.buttonContent}
          </TabButton>
        ))}
      </div>
      {/* Tab View */}
      <div className="space-y-4">{tabs[activeTab].tabContent}</div>
    </div>
  );
}

function TabButton({ children, onClick, isActive }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-medium transition-all ${
        isActive
          ? "bg-indigo-600 text-white shadow-lg"
          : "bg-white text-gray-700 hover:bg-gray-50 shadow"
      }`}
    >
      {children}
    </button>
  );
}
