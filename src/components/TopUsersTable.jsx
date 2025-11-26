// src/components/TopUsersTable.jsx
import React from "react";

const TopUsersTable = ({ users }) => {
  return (
    <div className="table-card">
      <h3>Most Active Users (by events)</h3>
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>Events</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan="3">No users for this segment.</td>
            </tr>
          )}
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.displayName || "Unknown"}</td>
              <td>{u.email || "—"}</td>
              <td>{u.eventCount ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TopUsersTable;
