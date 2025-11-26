// src/components/StatCard.jsx
import React from "react";

const StatCard = ({ label, value, sublabel }) => {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sublabel && <p className="stat-sublabel">{sublabel}</p>}
    </div>
  );
};

export default StatCard;
