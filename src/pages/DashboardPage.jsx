// src/pages/DashboardPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

import FiltersBar from "../components/FiltersBar";
import StatCard from "../components/StatCard";
import EventsPerDayChart from "../components/EventsPerDaychart";
import TopUsersTable from "../components/TopUsersTable";
import LoadingSpinner from "../components/LoadingSpinner";

const DAY_MS = 24 * 60 * 60 * 1000;

// helper to bucket timestamps like your RN code
function findBucket(ts, dayBuckets) {
  for (let i = dayBuckets.length - 1; i >= 0; i--) {
    if (ts >= dayBuckets[i]) return dayBuckets[i];
  }
  return null;
}

const DashboardPage = () => {
  const [userTypeFilter, setUserTypeFilter] = useState("all"); // "all" | "student" | "workingProfessional"
  const [variantFilter, setVariantFilter] = useState("all");   // "all" | "A" | "B"
  const [dateRange, setDateRange] = useState("7d");            // "7d" | "30d"

  const [loading, setLoading] = useState(true);
  const [segmentUsers, setSegmentUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [posts, setPosts] = useState([]);

  const [globalUserCount, setGlobalUserCount] = useState(0);
  const [globalEventCount, setGlobalEventCount] = useState(0);

  // ====== GLOBAL TOTALS (all users / last 30d events) ======
  useEffect(() => {
    async function fetchGlobalTotals() {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        setGlobalUserCount(usersSnap.size);

        const since30d = Timestamp.fromDate(
          new Date(Date.now() - 30 * DAY_MS)
        );
        const eventsQuery = query(
          collection(db, "events"),
          where("ts", ">=", since30d)
        );
        const eventsSnap = await getDocs(eventsQuery);
        setGlobalEventCount(eventsSnap.size);
      } catch (err) {
        console.error("Error fetching global totals:", err);
      }
    }
    fetchGlobalTotals();
  }, []);

  // ====== FETCH SEGMENTED USERS + EVENTS + POSTS ======
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        const now = Date.now();
        const daysBack = dateRange === "30d" ? 30 : 7;
        const sinceRange = Timestamp.fromDate(
          new Date(now - daysBack * DAY_MS)
        );

        // ---- 1) Build user filters (map FilterBar values -> Firestore values) ----
        let usersQuery = collection(db, "users");
        const constraints = [];

        // userType mapping: "student" -> "Student", "workingProfessional" -> "Working Professional"
        let userTypeValue = null;
        if ((userTypeFilter === "Student")) userTypeValue = "Student";
        if ((userTypeFilter === "workingProfessional") )
          userTypeValue = "Working Professional";
        if (userTypeFilter === "professional") userTypeValue = "Working Professional";

        if (userTypeValue) {
          constraints.push(where("userType", "==", userTypeValue));
        }

        // abTestGroup mapping: "A" -> "Group A", "B" -> "Group B"
        let abGroupValue = null;
        if (variantFilter === "A") abGroupValue = "Group A";
        if (variantFilter === "B") abGroupValue = "Group B";

        if (abGroupValue) {
          constraints.push(where("abTestGroup", "==", abGroupValue));
        }

        if (constraints.length > 0) {
          usersQuery = query(usersQuery, ...constraints);
        }

        const usersSnap = await getDocs(usersQuery);
        const users = usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setSegmentUsers(users);

        const userIds = users.map((u) => u.id);
        if (userIds.length === 0) {
          setEvents([]);
          setPosts([]);
          setLoading(false);
          return;
        }

        const allowedUserIds = new Set(userIds);

        // ---- 2) Events for selected range, filtered to segment users ----
        const eventsQuery = query(
          collection(db, "events"),
          where("ts", ">=", sinceRange)
        );
        const evSnap = await getDocs(eventsQuery);
        const segEvents = [];
        evSnap.forEach((d) => {
          const data = d.data();
          // events use 'uid' for user id in your RN code
          if (data.uid && allowedUserIds.has(data.uid)) {
            segEvents.push({ id: d.id, ...data });
          }
        });
        setEvents(segEvents);

        // ---- 3) Posts from "feed" for selected range, filtered to segment users ----
        const postsQuery = query(
          collection(db, "feed"),
          where("createdAt", ">=", sinceRange)
        );
        const postsSnap = await getDocs(postsQuery);
        const segPosts = [];
        postsSnap.forEach((d) => {
          const data = d.data();
          const postUid = data.uid || data.userId; // adjust if needed
          if (postUid && allowedUserIds.has(postUid)) {
            segPosts.push({ id: d.id, ...data });
          }
        });
        setPosts(segPosts);
      } catch (err) {
        console.error("Error fetching filtered data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userTypeFilter, variantFilter, dateRange]);

  // ====== DERIVED METRICS (similar to RN dashboard) ======
  const {
    dau,
    wau,
    eventsByDay,
    eventsByType,
    postsByDay,
    topUsersRaw,
  } = useMemo(() => {
    const now = Date.now();
    const rangeDays = dateRange === "30d" ? 30 : 7;

    // day buckets for selected range
    const dayBuckets = Array.from({ length: rangeDays }, (_, i) => {
      const start = new Date(now - (rangeDays - 1 - i) * DAY_MS);
      start.setHours(0, 0, 0, 0);
      return start.getTime();
    });

    const mkEmpty = () =>
      Object.fromEntries(dayBuckets.map((t) => [t, 0]));

    const evDay = mkEmpty();
    const postDay = mkEmpty();
    const typeCounts = {};
    const userCounts = {};
    const dauSet = new Set();
    const wauSet = new Set();

    // ---- events ----
    for (const ev of events) {
      const ts = ev.ts?.toDate?.() ? ev.ts.toDate().getTime() : null;
      if (!ts) continue;

      const bucket = findBucket(ts, dayBuckets);
      if (bucket) evDay[bucket]++;

      if (ev.type) {
        typeCounts[ev.type] = (typeCounts[ev.type] || 0) + 1;
      }

      if (ev.uid) {
        userCounts[ev.uid] = (userCounts[ev.uid] || 0) + 1;

        // DAU: last 1 day
        if (ts >= now - DAY_MS) dauSet.add(ev.uid);
        // WAU: last 7 days (like RN), independent of chart range
        if (ts >= now - 7 * DAY_MS) wauSet.add(ev.uid);
      }
    }

    // ---- posts ----
    for (const p of posts) {
      const ts = p.createdAt?.toDate?.()
        ? p.createdAt.toDate().getTime()
        : null;
      if (!ts) continue;

      const bucket = findBucket(ts, dayBuckets);
      if (bucket) postDay[bucket]++;
    }

    const topUsersList = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([uid, count]) => ({ uid, count }));

    return {
      dau: dauSet.size,
      wau: wauSet.size,
      eventsByDay: evDay,
      eventsByType: typeCounts,
      postsByDay: postDay,
      topUsersRaw: topUsersList,
    };
  }, [events, posts, dateRange]);

  // convert eventsByDay → chart data
  const eventsPerDayData = useMemo(() => {
    const entries = Object.entries(eventsByDay || {});
    if (entries.length === 0) return [];

    return entries
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([t, count]) => {
        const d = new Date(Number(t));
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        return { day: label, count };
      });
  }, [eventsByDay]);

  // Top users table joins with segmentUsers for names/emails
  const topUsersForTable = useMemo(() => {
    if (!topUsersRaw || topUsersRaw.length === 0) return [];

    const userMap = {};
    segmentUsers.forEach((u) => {
      userMap[u.id] = u;
    });

    return topUsersRaw.map(({ uid, count }) => {
      const u = userMap[uid] || {};
      return {
        id: uid,
        displayName: u.displayName || "",
        email: u.email || "",
        eventCount: count,
      };
    });
  }, [topUsersRaw, segmentUsers]);

  const segmentUserCount = segmentUsers.length;
  const segmentEventCount = events.length;

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  return (
    <div className="dashboard-root">
      <header className="dashboard-header">
        <div>
          <h1>Pantry Admin</h1>
          <p>Analytics &amp; A/B Testing Dashboard</p>
        </div>
        <button onClick={handleSignOut}>Sign Out</button>
      </header>

      <FiltersBar
        userTypeFilter={userTypeFilter}
        setUserTypeFilter={setUserTypeFilter}
        variantFilter={variantFilter}
        setVariantFilter={setVariantFilter}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />

      {loading ? (
        <div className="app-center">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <section className="stats-grid">
            <StatCard
              label="Total Users"
              value={globalUserCount}
              sublabel="All Pantry users"
            />
            <StatCard
              label="Segment Users"
              value={segmentUserCount}
              sublabel="Matching current filters"
            />
            <StatCard
              label="Daily Active Users"
              value={dau}
              sublabel="Segment, last 24h"
            />
            <StatCard
              label="Weekly Active Users"
              value={wau}
              sublabel="Segment, last 7d"
            />
            <StatCard
              label="Segment Events"
              value={segmentEventCount}
              sublabel={`Events in last ${dateRange === "30d" ? "30" : "7"} days`}
            />
          </section>

          <section className="layout-row">
            <div className="layout-col">
              <EventsPerDayChart data={eventsPerDayData} />
            </div>
            <div className="layout-col">
              <TopUsersTable users={topUsersForTable} />
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
