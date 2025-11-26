// src/utils/backfillEvents.js
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

function subtractDays(days) {
  const now = new Date();
  const start = new Date();
  start.setDate(now.getDate() - days + 1); // include today
  return { start, end: now };
}

/**
 * One-time backfill: create events for activity that already happened
 * in the last 7 days.
 *
 * Adjust collection names + userId field names to match your real schema.
 */
export async function backfillLast7DaysEvents() {
  const { start, end } = subtractDays(7);
  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);

  let createdCount = 0;

  // --- 1) Backfill posts -> "post_uploaded" events ---
  try {
    const postsQuery = query(
      collection(db, "posts"),                  // 🔁 CHANGE if your collection name is different
      where("createdAt", ">=", startTs),
      where("createdAt", "<=", endTs)
    );

    const postsSnap = await getDocs(postsQuery);
    for (const docSnap of postsSnap.docs) {
      const post = docSnap.data();
      const userId = post.userId || post.authorId; // 🔁 tweak if needed
      if (!userId) continue;

      await addDoc(collection(db, "events"), {
        userId,
        type: "post_uploaded",
        timestamp: post.createdAt || Timestamp.now(),
        metadata: {
          postId: docSnap.id,
        },
      });
      createdCount++;
    }
  } catch (err) {
    console.error("Error backfilling posts:", err);
  }

  // --- 2) Backfill journal entries / meals -> "journal_entry_created" events ---
  try {
    const journalQuery = query(
      collection(db, "journalEntries"),         // 🔁 CHANGE if needed
      where("createdAt", ">=", startTs),
      where("createdAt", "<=", endTs)
    );

    const journalSnap = await getDocs(journalQuery);
    for (const docSnap of journalSnap.docs) {
      const entry = docSnap.data();
      const userId = entry.userId || entry.ownerId; // 🔁 tweak if needed
      if (!userId) continue;

      await addDoc(collection(db, "events"), {
        userId,
        type: "journal_entry_created",
        timestamp: entry.createdAt || Timestamp.now(),
        metadata: {
          entryId: docSnap.id,
          // you could add calories or tags here if you have them
        },
      });
      createdCount++;
    }
  } catch (err) {
    console.error("Error backfilling journal entries:", err);
  }

  // --- 3) Backfill habit check-ins -> "habit_checkin" events (optional) ---
  try {
    const checkinsQuery = query(
      collection(db, "checkIns"),               // 🔁 CHANGE if your collection name is different
      where("createdAt", ">=", startTs),
      where("createdAt", "<=", endTs)
    );

    const checkinsSnap = await getDocs(checkinsQuery);
    for (const docSnap of checkinsSnap.docs) {
      const checkin = docSnap.data();
      const userId = checkin.userId || checkin.ownerId; // 🔁 tweak if needed
      if (!userId) continue;

      await addDoc(collection(db, "events"), {
        userId,
        type: "habit_checkin",
        timestamp: checkin.createdAt || Timestamp.now(),
        metadata: {
          checkInId: docSnap.id,
          habitId: checkin.habitId || null,
        },
      });
      createdCount++;
    }
  } catch (err) {
    console.error("Error backfilling check-ins:", err);
  }

  console.log(`Backfill complete. Created ${createdCount} events.`);
  return createdCount;
}
