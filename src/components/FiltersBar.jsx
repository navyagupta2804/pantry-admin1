// src/components/FiltersBar.jsx
import React from "react";

const FiltersBar = ({
  userTypeFilter,
  setUserTypeFilter,
  variantFilter,
  setVariantFilter,
  dateRange,
  setDateRange,
}) => {
  return (
    <div className="filters-bar">
      <div className="filter-group">
        <label>User Type</label>
        <select
          value={userTypeFilter}
          onChange={(e) => setUserTypeFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="student">Students</option>
          <option value="workingProfessional">Working Professionals</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Variant</label>
        <select
          value={variantFilter}
          onChange={(e) => setVariantFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="A">Group A</option>
          <option value="B">Group B</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Date Range</label>
        <div className="date-buttons">
          <button
            className={dateRange === "7d" ? "active" : ""}
            onClick={() => setDateRange("7d")}
          >
            Last 7 days
          </button>
          <button
            className={dateRange === "30d" ? "active" : ""}
            onClick={() => setDateRange("30d")}
          >
            Last 30 days
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersBar;
