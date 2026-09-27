
const MODELS = ["gemini-3.8-flash", "gemini-3.6-flash"];

const BUILDINGS = {
  klaus: "Klaus Building (also called Klaus, Klaus Advanced Computing)",
  clough: "Clough Commons (also called Clough, CULC, Clough Undergraduate Learning Commons)",
  library: "Price Gilbert Library (also called the library, Price Gilbert)",
  student_center: "Student Center (also called John Lewis Student Center)",
  coda: "Coda (also called the Coda building, Tech Square Coda)",
  other: "Somewhere else on campus that isn't listed",
};

const FACILITY_OPTIONS = {
  water: {
    label: "Water fountain or bottle filler",
    issues: {
      working: "Working (only if the student says so)",
      not_working: "Not working, no water, or out of order",
      unfiltered: "Filter needs replacing (e.g. filter light is red or says replace)",
      low_pressure: "Water flow is very weak",
      too_high: "Too high for a wheelchair user to reach",
      dirty: "Dirty or clogged",
      other: "Some other problem",
    },
  },
  elevator: {
    label: "Elevator",
    issues: {
      working: "Working (only if the student says so)",
      out_of_service: "Out of service or broken",
      doors: "Doors stuck, blocked, or not closing properly",
      buttons: "Call buttons or braille labels broken or missing",
      slow: "Very slow",
      other: "Some other problem",
    },
  },
  toilet: {
    label: "Restroom",
    issues: {
      clean: "Clean and working (only if the student says so)",
      dirty: "Dirty",
      out_of_supplies: "Out of paper, soap, or other supplies",
      stall_blocked: "Accessible stall blocked or unusable",
      grab_bar: "Grab bar broken or missing",
      door: "Door or lock broken",
      closed: "Closed",
      other: "Some other problem",
    },
  },
};

// Turn the lists above into readable text for the prompt
const buildingsText = Object.entries(BUILDINGS)
  .map(([id, name]) => `- ${id}: ${name}`)
  .join("\n");

const facilitiesText = Object.entries(FACILITY_OPTIONS)
  .map(([facilityId, facility]) => {
    const issueLines = Object.entries(facility.issues)
      .map(([issueId, meaning]) => `    - ${issueId}: ${meaning}`)
      .join("\n");
    return `- ${facilityId} (${facility.label}). Problems:\n${issueLines}`;
  })
  .join("\n");

const SYSTEM_PROMPT = `You help Georgia Tech students report problems with campus accessibility facilities.

A student describes a problem in their own words, and may include a photo. Turn their report into form fields.

Facilities and their possible problems (use these exact ids):
${facilitiesText}

Buildings (use these exact ids):
${buildingsText}

Where each answer should come from:
- The problem (issue) comes mainly from the student's WORDS. Many problems, like a fountain with no water or a broken elevator, cannot be seen in a photo.
- From a photo, only use visible evidence: an "out of order" sign, caution tape or barriers, an indicator light, visible dirt or damage, or a readable building sign.
- Never choose "working" or "clean" unless the student says it works.
- If the student's words and the photo disagree, trust the words.
- If you can't tell the problem, use issue "unclear". If you can't tell the facility, use facility "unclear".
- The issue must be one of the problems listed under the facility you chose.
- Building: only if the student names it (including nicknames) or it's on a readable sign. Otherwise "unknown".
- Floor: copy any floor or spot the student mentions, like "2nd floor" or "by the east stairs". Otherwise an empty string.

Writing the summary:
- One short, neutral sentence a facilities worker could act on, like "Water fountain on the 2nd floor of Klaus is not dispensing water."
- Only include details the student gave or the photo clearly shows. Do not invent anything.
- If people appear in the photo, do not describe them.

Follow-up question:
- If you can tell the facility but NOT the problem (common with photo-only reports), write one short question that would identify the problem, with 2 to 4 short answer options. Example: "Is water coming out of the fountain?" with options "Yes", "No, nothing", "Just a trickle".
- The student will answer by tapping an option, so options must be short and cover the likely problems.
- If the problem is already clear, or the facility is unclear, set follow_up_question to "" and follow_up_options to [].
- If the student already answered a follow-up question (shown in their report), use their answer to choose the problem, and do not ask another question.

Confidence is your own estimate from 0 to 1 of how sure you are about the facility and problem together.`;


const allIssueIds = [
  ...new Set(Object.values(FACILITY_OPTIONS).flatMap((f) => Object.keys(f.issues))),
];

const RESULT_SCHEMA = {
  type: "OBJECT",
  properties: {
    facility: { type: "STRING", enum: [...Object.keys(FACILITY_OPTIONS), "unclear"] },
    issue: { type: "STRING", enum: [...allIssueIds, "unclear"] },
    building: { type: "STRING", enum: [...Object.keys(BUILDINGS), "unknown"] },
    floor: { type: "STRING" },
    confidence: { type: "NUMBER" },
    summary: { type: "STRING" },
    follow_up_question: { type: "STRING" },                          // "" when nothing is unclear
    follow_up_options: { type: "ARRAY", items: { type: "STRING" } }, // [] when there's no question
  },
  required: [
    "facility", "issue", "building", "floor", "confidence", "summary",
    "follow_up_question", "follow_up_options",
  ],
  propertyOrdering: [
    "facility", "issue", "building", "floor", "confidence", "summary",
    "follow_up_question", "follow_up_options",
  ],
};

// Wait for a number of milliseconds
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Ask Gemini, retrying once and then trying backup models if one is busy
async function askGemini(requestBody) {
  let lastError = null;

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();
      if (response.ok) return data; // pass

      console.error(`Gemini error (${model}, attempt ${attempt}):`, JSON.stringify(data, null, 2));
      lastError = { status: response.status };

      if (response.status === 503 && attempt === 1) {
        await wait(1500); // overloaded
        continue;
      }
      if (response.status === 503 || response.status === 429 || response.status === 404) {
        break; // move onto next model
      }
      throw lastError;
    }
  }

  throw lastError; // every model failed
}

export default async function handler(req, res) {
    console.log("GEMINI key loaded:", Boolean(process.env.GEMINI_API_KEY), "| Supabase URL loaded:", Boolean(process.env.VITE_SUPABASE_URL));
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "The server is missing GEMINI_API_KEY." });
  }

  const { text, image, followUpQuestion, followUpAnswer } = req.body || {};
  const studentText = typeof text === "string" ? text.trim().slice(0, 1000) : "";
  const hasImage = typeof image === "string" && image.startsWith("data:image/");

  // The AI needs at least one thing to work with
  if (!studentText && !hasImage) {
    return res.status(400).json({ error: "Describe the problem or add a photo first." });
  }

  // Build the import
  const parts = [
    { text: `Student's report: ${studentText || "(No text. Use the photo only.)"}` },
  ];

  // If the student answered a follow-up question, include it in AI import
  const hasAnswer = typeof followUpQuestion === "string" && typeof followUpAnswer === "string";
  if (hasAnswer) {
    parts.push({
      text: `Follow-up question: ${followUpQuestion.slice(0, 200)}\nStudent's answer: ${followUpAnswer.slice(0, 100)}`,
    });
  }

  if (hasImage) {
    // aggregating import pieces
    const [header, base64Data] = image.split(",");
    const mimeType = header.slice("data:".length, header.indexOf(";"));
    parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
  }

  const requestBody = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESULT_SCHEMA,
    },
  };

  try {
    const data = await askGemini(requestBody);

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) {
      console.error("Gemini returned no text:", JSON.stringify(data, null, 2));
      return res.status(502).json({ error: "The AI didn't return a result. Try again." });
    }

    const result = JSON.parse(replyText);

    // Keep confidence between 0 and 1
    result.confidence = Math.min(1, Math.max(0, Number(result.confidence) || 0));

    //statement must belong to issue
    const facility = FACILITY_OPTIONS[result.facility];
    if (!facility || !(result.issue in facility.issues)) {
      result.issue = "unclear";
    }

    // 3. If the AI isn't confident, treat the problem as unconfident
    if (result.confidence < 0.5 && !hasAnswer) {
      result.issue = "unclear";
    }

    const needsQuestion = result.facility !== "unclear" && result.issue === "unclear" && !hasAnswer;

    if (!needsQuestion) {
      result.follow_up_question = "";
      result.follow_up_options = [];
    } else {
      // At most 4 follow up questions
      const options = Array.isArray(result.follow_up_options) ? result.follow_up_options : [];
      result.follow_up_options = options.slice(0, 4);

      // If AI can't generate follow up question
      if (!result.follow_up_question || result.follow_up_options.length < 2) {
        result.follow_up_question = "Is it working right now?";
        result.follow_up_options = ["Yes, it works", "No, it's broken", "Not sure"];
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    if (error.status === 503 || error.status === 429) {
      return res.status(503).json({ error: "The AI is busy right now. Wait a minute and try again." });
    }
    if (error.status) {
      return res.status(502).json({ error: "The AI service returned an error. Check the server logs." });
    }
    console.error("Analyze failed:", error);
    return res.status(500).json({ error: "Something went wrong while reading the report." });
  }
}