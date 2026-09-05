import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachStore } from "../store";
import { CsvStep } from "./AssignProgram";
import type { CoachProgram } from "../types";

/** Importing a program into your own library, rather than onto a specific client.
 *
 * This screen used to be a mockup on a live route: "Choose files" was a plain div with no handler, "Scan
 * pages" and "Photo library" were buttons with no onClick, the three attached files and their confidence
 * percentages were typed into the source, and "Read 3 files" only advanced to a second mock with invented
 * totals. Nothing was ever read and nothing was ever created -- which is exactly how it behaved when
 * someone tried to use it.
 *
 * The working importer already existed; it was just buried in the assign-to-a-client flow. This screen is
 * now that same component, creating a standalone program instead of one pending for a client. */
export default function ImportProgram() {
  const nav = useNavigate();
  const { dispatch } = useCoachStore();
  const [error, setError] = useState<string | null>(null);

  function create(program: CoachProgram) {
    try {
      dispatch({ type: "ADD_PROGRAM", program });
      // Straight into the builder, same as importing while assigning does -- an import is a starting point
      // to check and edit, not a finished program.
      nav(`/coach/programs/${program.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create that program.");
    }
  }

  return (
    <CsvStep
      defaultName="Imported program"
      kicker="Your library"
      busy={false}
      error={error}
      onBack={() => nav("/coach/programs")}
      onCreate={create}
    />
  );
}
