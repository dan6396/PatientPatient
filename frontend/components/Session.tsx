"use client";

import { useState } from "react";
import type { PatientCase } from "@/backend/cases/case-types";
import CasePicker from "./CasePicker";
import Encounter from "./Encounter";
import RubricUpload from "./RubricUpload";

export default function Session() {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [customCase, setCustomCase] = useState<PatientCase | null>(null);
  const [uploading, setUploading] = useState(false);

  // 업로드/생성된 커스텀 증례로 면담
  if (customCase) {
    return (
      <Encounter
        caseId={customCase.id}
        caseData={customCase}
        onExit={() => setCustomCase(null)}
      />
    );
  }

  // 기존 정적 증례로 면담
  if (caseId) {
    return <Encounter caseId={caseId} onExit={() => setCaseId(null)} />;
  }

  // 채점표 업로드 화면
  if (uploading) {
    return (
      <RubricUpload
        onGenerated={(c) => {
          setUploading(false);
          setCustomCase(c);
        }}
        onCancel={() => setUploading(false)}
      />
    );
  }

  return <CasePicker onSelect={setCaseId} onUpload={() => setUploading(true)} />;
}
