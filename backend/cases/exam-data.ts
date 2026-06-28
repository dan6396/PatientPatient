// 증례별 신체진찰 소견 데이터.
// 각 ExamPartId에 대해 finding(소견 텍스트) + animationKey(placeholder)를 정의한다.
// animationKey는 나중에 실제 미디어로 교체될 placeholder 키다.

import type { CaseExamData, ExamPartId } from "./case-types";

export const EXAM_PART_LABELS: Record<ExamPartId, string> = {
  vital_signs: "활력징후",
  eyes: "눈(결막)",
  mouth: "입(구강)",
  lymph_nodes: "림프절",
  skin_nails: "피부·손톱",
  lung_auscultation: "호흡음 청진",
  joint_inspection: "관절 시진",
  joint_palpation: "관절 이진(이개·압통)",
  joint_rom: "관절 이동범위(ROM)",
};

export const ALL_EXAM_PARTS: ExamPartId[] = [
  "vital_signs",
  "eyes",
  "mouth",
  "lymph_nodes",
  "skin_nails",
  "lung_auscultation",
  "joint_inspection",
  "joint_palpation",
  "joint_rom",
];

// ── 급성 복통(췌장염) — 기본값 + TODO ──
const pancreatitisExamData: CaseExamData = {
  caseId: "pancreatitis",
  findings: {
    vital_signs: {
      partId: "vital_signs",
      label: "활력징후",
      finding:
        "혈압 110/70 mmHg, 맥박 90회/분, 호흡 16회/분, 체온 37.5℃ — 경미한 빈맥과 미열이 있습니다.",
      animationKey: "anim_vital_signs",
    },
    eyes: {
      partId: "eyes",
      label: "눈(결막)",
      // TODO: 췌장염 증례 결막 소견 추가
      finding: "결막 창백·충혈 이상 없습니다.",
      animationKey: "anim_eyes_conjunctiva",
    },
    mouth: {
      partId: "mouth",
      label: "입(구강)",
      // TODO: 췌장염 증례 구강 소견 추가 (구강 건조 등)
      finding: "구강 점막 건조 소견이 있습니다. 인두는 정상입니다.",
      animationKey: "anim_mouth",
    },
    lymph_nodes: {
      partId: "lymph_nodes",
      label: "림프절",
      // TODO: 췌장염 증례 림프절 소견 추가
      finding: "경부·쇄골상 림프절 비대 없습니다.",
      animationKey: "anim_lymph_nodes",
    },
    skin_nails: {
      partId: "skin_nails",
      label: "피부·손톱",
      // TODO: 췌장염 증례 피부 소견 추가 (황달, 반상출혈 등)
      finding: "피부 발진 없습니다. 손톱 변화 없습니다.",
      animationKey: "anim_skin_nails",
    },
    lung_auscultation: {
      partId: "lung_auscultation",
      label: "호흡음 청진",
      // TODO: 췌장염 증례 호흡음 소견 추가
      finding: "양측 호흡음 깨끗하며 이상 소견 없습니다.",
      animationKey: "anim_lung_auscultation",
    },
    joint_inspection: {
      partId: "joint_inspection",
      label: "관절 시진",
      finding: "이상 없습니다.",
      animationKey: "anim_joint_inspection",
    },
    joint_palpation: {
      partId: "joint_palpation",
      label: "관절 이진(이개·압통)",
      finding: "이상 없습니다.",
      animationKey: "anim_joint_palpation",
    },
    joint_rom: {
      partId: "joint_rom",
      label: "관절 이동범위(ROM)",
      finding: "이상 없습니다.",
      animationKey: "anim_joint_rom",
    },
  },
};

// ── 팔다리 근력저하(TIA) — 기본값 + TODO ──
const tiaExamData: CaseExamData = {
  caseId: "tia",
  findings: {
    vital_signs: {
      partId: "vital_signs",
      label: "활력징후",
      finding:
        "혈압 160/90 mmHg, 맥박 80회/분, 호흡 20회/분, 체온 36.7℃ — 혈압이 높습니다.",
      animationKey: "anim_vital_signs",
    },
    eyes: {
      partId: "eyes",
      label: "눈(결막)",
      // TODO: TIA 증례 결막·안구운동 소견 추가
      finding: "결막 이상 없습니다.",
      animationKey: "anim_eyes_conjunctiva",
    },
    mouth: {
      partId: "mouth",
      label: "입(구강)",
      // TODO: TIA 증례 구강 소견 추가
      finding: "이상 없습니다.",
      animationKey: "anim_mouth",
    },
    lymph_nodes: {
      partId: "lymph_nodes",
      label: "림프절",
      finding: "이상 없습니다.",
      animationKey: "anim_lymph_nodes",
    },
    skin_nails: {
      partId: "skin_nails",
      label: "피부·손톱",
      finding: "이상 없습니다.",
      animationKey: "anim_skin_nails",
    },
    lung_auscultation: {
      partId: "lung_auscultation",
      label: "호흡음 청진",
      // TODO: TIA 증례 폐음 소견 추가
      finding: "이상 없습니다.",
      animationKey: "anim_lung_auscultation",
    },
    joint_inspection: {
      partId: "joint_inspection",
      label: "관절 시진",
      finding: "이상 없습니다.",
      animationKey: "anim_joint_inspection",
    },
    joint_palpation: {
      partId: "joint_palpation",
      label: "관절 이진(이개·압통)",
      finding: "이상 없습니다.",
      animationKey: "anim_joint_palpation",
    },
    joint_rom: {
      partId: "joint_rom",
      label: "관절 이동범위(ROM)",
      finding: "이상 없습니다.",
      animationKey: "anim_joint_rom",
    },
  },
};

// ── 관절통증(류마티스 관절염) — 참조 예시 데이터 ──
// rheumatoid 증례 PatientCase는 추후 추가 예정. 현재는 exam 데이터만 등록.
const rheumatoidExamData: CaseExamData = {
  caseId: "rheumatoid",
  findings: {
    vital_signs: {
      partId: "vital_signs",
      label: "활력징후",
      finding:
        "혈압 118/76 mmHg, 맥박 78회/분, 호흡 16회/분, 체온 37.1℃ — 정상 범위입니다.",
      animationKey: "anim_vital_signs",
    },
    eyes: {
      partId: "eyes",
      label: "눈(결막)",
      finding: "결막 창백·충혈 이상 없습니다.",
      animationKey: "anim_eyes_conjunctiva",
    },
    mouth: {
      partId: "mouth",
      label: "입(구강)",
      finding: "구강 궤양 없고, 혀·습윤 이상 없습니다.",
      animationKey: "anim_mouth",
    },
    lymph_nodes: {
      partId: "lymph_nodes",
      label: "림프절",
      finding: "경부·쇄골상 림프절 비대 없습니다.",
      animationKey: "anim_lymph_nodes",
    },
    skin_nails: {
      partId: "skin_nails",
      label: "피부·손톱",
      finding: "피부 발진 없습니다. 손톱 변화 없습니다.",
      animationKey: "anim_skin_nails",
    },
    lung_auscultation: {
      partId: "lung_auscultation",
      label: "호흡음 청진",
      finding: "양측 호흡음 깨끗하며 악설음·천명음 없습니다.",
      animationKey: "anim_lung_auscultation",
    },
    joint_inspection: {
      partId: "joint_inspection",
      label: "관절 시진",
      finding:
        "양손 MCP·PIP 관절의 대칭적인 부종이 관찰됩니다. 발적·결절·변형은 뚜렷하지 않습니다.",
      animationKey: "anim_joint_inspection",
      affectedRegions: ["손가락", "손목"],
      normalFinding: "해당 부위 관절의 부종·발적·변형·결절은 관찰되지 않습니다.",
      byRegion: {
        손가락: {
          finding:
            "양손 손가락 MCP·PIP 관절의 대칭적 부종이 관찰됩니다. 발적·결절·변형은 없습니다.",
          animationKey: "anim_joint_inspection_finger",
        },
        손목: {
          finding:
            "양 손목 관절의 경한 부종이 관찰됩니다. 발적·변형은 뚜렷하지 않습니다.",
          animationKey: "anim_joint_inspection_wrist",
        },
      },
    },
    joint_palpation: {
      partId: "joint_palpation",
      label: "관절 이진(이개·압통)",
      finding:
        "양손 MCP·PIP 관절에 압통이 있으며 경한 이개가 느껴집니다.",
      animationKey: "anim_joint_palpation",
      affectedRegions: ["손가락", "손목"],
      normalFinding: "해당 부위 관절에 압통·열감은 없습니다.",
      byRegion: {
        손가락: {
          finding:
            "양손 손가락 MCP·PIP 관절에 압통이 있으며 경한 이개(열감)가 느껴집니다.",
          animationKey: "anim_joint_palpation_finger",
          variants: {
            이개: {
              finding: "양손 손가락 MCP·PIP 관절에 경한 이개(열감)가 만져집니다.",
              animationKey: "anim_joint_palpation_finger_heat",
            },
            압통: {
              finding: "양손 손가락 MCP·PIP 관절에 압통이 있습니다.",
              animationKey: "anim_joint_palpation_finger_tender",
            },
          },
        },
        손목: {
          finding:
            "양 손목 관절에 경한 압통이 있습니다. 이개는 뚜렷하지 않습니다.",
          animationKey: "anim_joint_palpation_wrist",
          variants: {
            이개: {
              finding: "양 손목 관절에 뚜렷한 이개는 없습니다.",
              animationKey: "anim_joint_palpation_wrist_heat",
            },
            압통: {
              finding: "양 손목 관절에 경한 압통이 있습니다.",
              animationKey: "anim_joint_palpation_wrist_tender",
            },
          },
        },
      },
    },
    joint_rom: {
      partId: "joint_rom",
      label: "관절 이동범위(ROM)",
      finding:
        "능동·수동 이동 모두 손가락 굴곡 시 경한 제한과 통증이 있습니다. 손목 굴신은 비교적 유지됩니다.",
      animationKey: "anim_joint_rom",
      affectedRegions: ["손가락", "손목"],
      normalFinding: "해당 부위 관절의 능동·수동 운동범위는 정상이며 통증·제한 없습니다.",
      byRegion: {
        손가락: {
          finding:
            "손가락 굴곡 시 능동·수동 이동 모두 경한 제한과 통증이 있습니다.",
          animationKey: "anim_joint_rom_finger",
          variants: {
            능동: {
              finding: "능동 굴곡 시 손가락에서 통증·경한 제한이 있습니다.",
              animationKey: "anim_joint_rom_finger_active",
            },
            수동: {
              finding:
                "수동 굴곡에서도 손가락 제한이 있습니다(관절 자체 병변 시사).",
              animationKey: "anim_joint_rom_finger_passive",
            },
          },
        },
        손목: {
          finding:
            "손목 굴신은 비교적 유지되나 끝범위에서 경한 통증이 있습니다.",
          animationKey: "anim_joint_rom_wrist",
          variants: {
            능동: {
              finding: "능동 손목 굴신 끝범위에서 경한 통증이 있습니다.",
              animationKey: "anim_joint_rom_wrist_active",
            },
            수동: {
              finding: "수동 손목 굴신은 범위가 유지되며 통증은 경합니다.",
              animationKey: "anim_joint_rom_wrist_passive",
            },
          },
        },
      },
    },
  },
};

// ── 레지스트리 ──
const examDataMap: Record<string, CaseExamData> = {
  pancreatitis: pancreatitisExamData,
  tia: tiaExamData,
  rheumatoid: rheumatoidExamData,
};

export function getExamData(caseId?: string): CaseExamData | undefined {
  return caseId ? examDataMap[caseId] : undefined;
}
