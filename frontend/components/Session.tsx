"use client";

import { useState } from "react";
import CasePicker from "./CasePicker";
import Encounter from "./Encounter";

export default function Session() {
  const [caseId, setCaseId] = useState<string | null>(null);

  if (!caseId) return <CasePicker onSelect={setCaseId} />;
  return <Encounter caseId={caseId} onExit={() => setCaseId(null)} />;
}
