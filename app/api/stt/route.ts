import { STT_MODEL, STT_PROMPT } from "@/backend/models";

export const runtime = "nodejs";
export const maxDuration = 30;

// OpenAI는 파일 "확장자"로 오디오 포맷을 판단한다. 실제 포맷과 다른 확장자를 붙이면
// (예: Safari/iOS의 mp4 를 webm 으로) 디코딩이 깨져 엉뚱한 텍스트가 나온다.
// 그래서 들어온 파일의 실제 이름/타입에서 올바른 확장자를 그대로 보존한다.
function audioFilename(file: Blob): string {
  const name = file instanceof File ? file.name : "";
  if (name && /\.[a-z0-9]+$/i.test(name)) return name; // 클라이언트가 붙인 실제 확장자 사용
  const map: Record<string, string> = {
    "audio/webm": "audio.webm",
    "audio/mp4": "audio.mp4",
    "audio/mpeg": "audio.mp3",
    "audio/mpga": "audio.mp3",
    "audio/wav": "audio.wav",
    "audio/x-wav": "audio.wav",
    "audio/ogg": "audio.ogg",
  };
  const base = (file.type || "").split(";")[0].trim();
  return map[base] ?? "audio.webm";
}

// 오디오 blob(multipart) -> 텍스트. OpenAI 로만 보내고 저장하지 않는다.
export async function POST(req: Request) {
  try {
    const inForm = await req.formData();
    const file = inForm.get("audio");
    if (!(file instanceof Blob) || file.size === 0) {
      return Response.json({ error: "오디오가 비어 있습니다." }, { status: 400 });
    }

    const oa = new FormData();
    oa.append("file", file, audioFilename(file));
    oa.append("model", STT_MODEL);
    oa.append("language", "ko"); // 한국어 인식 정확도 향상
    oa.append("prompt", STT_PROMPT); // 의료 도메인 용어 bias

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: oa,
    });

    if (!r.ok) {
      console.error("[/api/stt]", await r.text());
      return Response.json({ error: "음성 인식에 실패했습니다." }, { status: 502 });
    }

    const data = (await r.json()) as { text?: string };
    return Response.json({ text: (data.text ?? "").trim() });
  } catch (err) {
    console.error("[/api/stt]", err);
    return Response.json({ error: "음성 인식 중 오류가 발생했습니다." }, { status: 500 });
  }
}
