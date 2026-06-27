"use client";

import { useState } from "react";
import CasePicker from "./CasePicker";
import Chat from "./Chat";

export default function Session() {
  const [caseId, setCaseId] = useState<string | null>(null);

  if (!caseId) return <CasePicker onSelect={setCaseId} />;
  return <Chat caseId={caseId} onExit={() => setCaseId(null)} />;
}
