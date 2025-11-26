// src/hooks/useAuthListener.js
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";

export default function useAuthListener() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = no user

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
    });
    return () => unsub();
  }, []);

  return user;
}
