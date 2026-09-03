import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { supabase } from "./lib/supabase";
import "./lib/viewportHeight";
import "./styles.css";

// Let Supabase finish parsing/clearing any auth tokens out of the URL fragment before HashRouter's
// first render reads window.location.hash for routing — otherwise the two can race over the same hash.
supabase.auth.getSession().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
