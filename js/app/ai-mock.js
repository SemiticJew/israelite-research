const MODE_LABELS = {
  "verse-explainer": "Verse Explainer",
  "doctrine-detector": "Doctrine Detector",
  "lesson-builder": "Lesson Builder",
  "apologetics-mode": "Apologetics Mode"
};

function clean(value){
  return String(value || "").replace(/\s+/g, " ").trim();
}

function detectReference(question){
  const match = clean(question).match(/\b([1-3]?\s?[A-Z][a-z]+)\s+(\d{1,3})(?::(\d{1,3})(?:-(\d{1,3}))?)?/);
  return match ? match[0] : "";
}

function baseScriptures(question){
  const q = clean(question).toLowerCase();
  if (q.includes("paul") || q.includes("unclean") || q.includes("food")) {
    return ["Romans 3:31", "Acts 24:14", "1 Timothy 1:8", "Leviticus 11:46-47", "Acts 10:28"];
  }
  if (q.includes("law") || q.includes("abolish")) {
    return ["Matthew 5:17-19", "Romans 3:31", "1 John 5:3", "Psalm 119:160"];
  }
  if (q.includes("sabbath")) {
    return ["Exodus 20:8-11", "Deuteronomy 5:12-15", "Isaiah 58:13-14", "Mark 2:27"];
  }
  if (q.includes("matthew 24:31")) {
    return ["Matthew 24:31", "Deuteronomy 30:4", "Isaiah 11:12", "Zechariah 2:6"];
  }
  return ["Isaiah 8:20", "2 Timothy 2:15", "Acts 17:11", "1 Thessalonians 5:21"];
}

function caution(){
  return "Verify each passage in context. This mock study aid does not retrieve full Bible text and should not be treated as authority over Scripture.";
}

function verseExplainer(question){
  const reference = detectReference(question) || "the passage";
  const scriptures = baseScriptures(question);
  return {
    title: `Study aid for ${reference}`,
    sections: [
      ["Plain reading", `Start with what ${reference} actually says before importing a system. Identify the speaker, audience, action, and promised result.`],
      ["Context", "Read the surrounding chapter and ask what problem or prophecy is being addressed. Do not isolate a phrase from the covenant storyline."],
      ["Cross-references", scriptures],
      ["Israelite frame", "Ask how the passage relates to covenant, scattering, remembrance, obedience, judgment, or restoration."],
      ["Common misreadings", "A common error is using one line to erase the broader witness of the Law, prophets, Messiah, or apostles."],
      ["Logic check", "If an interpretation makes Scripture contradict itself, the interpretation needs correction."],
      ["Application", "Write one concrete act of obedience or study that follows from the passage."],
      ["Guardrail", caution()]
    ]
  };
}

function doctrineDetector(question){
  const scriptures = baseScriptures(question);
  return {
    title: "Doctrine test",
    sections: [
      ["Claim being tested", clean(question) || "No claim supplied."],
      ["Scripture witnesses", scriptures],
      ["Context", "Define the claim clearly, then read each witness in its chapter and covenant setting."],
      ["False doctrine warning", "Do not accept a doctrine because it is common in church tradition, camp culture, or social media. Require Scriptural witnesses."],
      ["Logical fallacy if present", "Watch for false dichotomy, straw man arguments, equivocation, and appeals to tradition."],
      ["Conclusion", "The claim should remain provisional until it survives the full Scriptural witness without contradiction."],
      ["Guardrail", caution()]
    ]
  };
}

function lessonBuilder(question){
  const scriptures = baseScriptures(question);
  const topic = clean(question).replace(/^build a\s*/i, "") || "Scripture-first obedience";
  return {
    title: `Lesson plan: ${topic}`,
    sections: [
      ["Title", topic],
      ["Objective", "Help the listener test the topic by Scripture, reason clearly, and identify one act of obedience."],
      ["Opening", "Begin with the problem: inherited religion often gives claims before it teaches people how to verify them."],
      ["Scriptures", scriptures],
      ["Teaching outline", [
        "Define the key terms.",
        "Read the strongest Scripture witnesses in context.",
        "Identify the common misreading.",
        "Run a logic check for contradiction or false assumptions.",
        "End with practice, not argument culture."
      ]],
      ["Discussion questions", [
        "What does the text plainly say?",
        "What assumption did you bring to the text?",
        "What would obedience look like this week?"
      ]],
      ["Closing charge", "Study soberly, verify everything, and practice the truth you already understand."],
      ["Guardrail", caution()]
    ]
  };
}

function apologeticsMode(question){
  const scriptures = baseScriptures(question);
  return {
    title: "Clean rebuttal framework",
    sections: [
      ["Opponent’s claim", clean(question) || "No claim supplied."],
      ["Hidden assumption", "The claim may assume church tradition has authority to redefine biblical categories."],
      ["Fallacy", "Likely fallacies include false dichotomy, appeal to tradition, or reading one disputed text against many clear witnesses."],
      ["Scriptural correction", scriptures],
      ["Clean rebuttal", "Your interpretation cannot make Scripture overthrow itself. Define the claim, read the context, and let multiple witnesses establish the matter."],
      ["Short social-media version", "Do not use Paul, tradition, or slogans to erase what Scripture repeatedly establishes. Prove the claim in context."],
      ["Guardrail", caution()]
    ]
  };
}

export async function getStudyCompanionResponse({ mode, question, reference = "", userContext = {} } = {}){
  // TODO: Replace this mock with an authenticated OpenAI API call from a server-side endpoint.
  // TODO: Add retrieval from approved Semitic Jew articles, transcripts, Bible data, and doctrine notes.
  // TODO: Add article transcript ingestion, Bible data indexing, user notes, and saved questions.
  const normalizedMode = MODE_LABELS[mode] ? mode : "verse-explainer";
  const prompt = [reference, question, userContext.focus].filter(Boolean).join(" ");

  if (normalizedMode === "doctrine-detector") return doctrineDetector(prompt);
  if (normalizedMode === "lesson-builder") return lessonBuilder(prompt);
  if (normalizedMode === "apologetics-mode") return apologeticsMode(prompt);
  return verseExplainer(prompt);
}

export { MODE_LABELS };
