import { Router } from "~/components/router/Router";
import { setupFirebase, getAuth } from "~/lib/firebase";
import { useEffect } from "react";

function Main() {
  useEffect(() => {
    setupFirebase();

    // cache auth
    getAuth();
  }, []);

  return (
    <main>
      <Router />
    </main>
  );
}

export default Main;
