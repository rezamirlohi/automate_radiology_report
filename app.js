const templates = {
  abdomen: {
    title: "Abdominopelvic Ultrasonography",
    terms: ["fatty liver", "focal lesion", "CBD", "gallstone", "hydronephrosis", "free fluid", "splenomegaly"],
    sections: [
      ["Liver", "Normal size. Mild increased parenchymal echogenicity, suggestive of grade I fatty liver. No focal lesion is seen."],
      ["Gallbladder & Biliary Tree", "Gallbladder is normally distended. No stone or wall thickening. CBD is not dilated."],
      ["Pancreas", "Visualized portions are unremarkable."],
      ["Spleen", "Normal size and echotexture."],
      ["Kidneys", "Both kidneys are normal in size and cortical thickness. No hydronephrosis or stone."],
      ["Urinary Bladder", "Normal wall thickness. No intraluminal lesion."],
      ["Pelvis", "No significant free fluid is detected."]
    ],
    impression: "Mild fatty liver. Otherwise unremarkable abdominopelvic ultrasonography."
  },
  thyroid: {
    title: "Thyroid Ultrasonography",
    terms: ["nodule", "TI-RADS", "microcalcification", "cystic change", "vascularity", "lymph node"],
    sections: [
      ["Right Thyroid Lobe", "Normal size and homogeneous echotexture. No suspicious nodule."],
      ["Left Thyroid Lobe", "Normal size and homogeneous echotexture. No suspicious nodule."],
      ["Isthmus", "Normal thickness."],
      ["Cervical Lymph Nodes", "No suspicious cervical lymphadenopathy is seen."]
    ],
    impression: "No suspicious thyroid nodule or cervical lymphadenopathy."
  },
  breast: {
    title: "Breast Ultrasonography",
    terms: ["BI-RADS", "mass", "cyst", "fibroadenoma", "duct ectasia", "axillary lymph node"],
    sections: [
      ["Right Breast", "No suspicious solid or cystic mass is seen."],
      ["Left Breast", "No suspicious solid or cystic mass is seen."],
      ["Axillae", "No suspicious axillary lymphadenopathy."]
    ],
    impression: "No suspicious sonographic abnormality. BI-RADS 1."
  },
  obgyn: {
    title: "Obstetric / Gynecologic Ultrasonography",
    terms: ["gestational sac", "CRL", "FHR", "endometrium", "ovary", "adnexal mass", "free fluid"],
    sections: [
      ["Uterus", "Normal size and myometrial echotexture."],
      ["Endometrium", "Endometrial thickness is within expected range."],
      ["Right Ovary", "Normal size and morphology."],
      ["Left Ovary", "Normal size and morphology."],
      ["Adnexa / Cul-de-sac", "No adnexal mass or significant free fluid."]
    ],
    impression: "Unremarkable pelvic ultrasonography."
  },
  renal: {
    title: "Renal and Urinary Tract Ultrasonography",
    terms: ["hydronephrosis", "renal stone", "cortical thickness", "simple cyst", "PVR", "prostate volume"],
    sections: [
      ["Right Kidney", "Normal size and cortical thickness. No hydronephrosis or stone."],
      ["Left Kidney", "Normal size and cortical thickness. No hydronephrosis or stone."],
      ["Urinary Bladder", "Normal wall thickness. No stone or intraluminal mass."],
      ["Post Void Residual", "No significant PVR."],
      ["Prostate", "Normal estimated volume."]
    ],
    impression: "Unremarkable renal and urinary tract ultrasonography."
  }
};

const synonymMap = [
  [/کبد چرب|fatty/i, "fatty liver"],
  [/سنگ کیسه صفرا|gallstone|سنگ صفرا/i, "gallstone"],
  [/هیدرونفروز|hydronephrosis/i, "hydronephrosis"],
  [/ضایعه فوکال|focal lesion|توده/i, "focal lesion"],
  [/مایع آزاد|free fluid/i, "free fluid"],
  [/طحال بزرگ|splenomegaly/i, "splenomegaly"],
  [/ندول|nodule/i, "nodule"],
  [/لنف نود|lymph node|لنفادنوپاتی/i, "lymph node"],
  [/کیست|cyst/i, "cyst"],
  [/سنگ کلیه|renal stone|\bstone\b/i, "renal stone"]
];

const severityMap = [
  [/خفیف|mild/i, "mild"],
  [/متوسط|moderate/i, "moderate"],
  [/شدید|severe/i, "severe"],
  [/گرید ?۱|grade ?i\b|grade ?1\b/i, "grade I"],
  [/گرید ?۲|grade ?ii\b|grade ?2\b/i, "grade II"],
  [/گرید ?۳|grade ?iii\b|grade ?3\b/i, "grade III"]
];

const examType = document.querySelector("#examType");
const patientName = document.querySelector("#patientName");
const patientAge = document.querySelector("#patientAge");
const clinicalData = document.querySelector("#clinicalData");
const rawInput = document.querySelector("#rawInput");
const reportOutput = document.querySelector("#reportOutput");
const termChips = document.querySelector("#termChips");
const findingRows = document.querySelector("#findingRows");
const speechStatus = document.querySelector("#speechStatus");
const qualityBadge = document.querySelector("#qualityBadge");
const micBtn = document.querySelector("#micBtn");

let recognition;
let isListening = false;

function currentTemplate() {
  return templates[examType.value];
}

function renderTerms() {
  termChips.innerHTML = "";
  currentTemplate().terms.forEach((term) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = term;
    button.addEventListener("click", () => insertAtCursor(rawInput, term));
    termChips.appendChild(button);
  });
}

function renderFindingRows() {
  findingRows.innerHTML = "";
  currentTemplate().sections.forEach(([label, value]) => addFindingRow(label, value));
}

function addFindingRow(label = "", value = "") {
  const row = document.createElement("div");
  row.className = "finding-row";
  row.innerHTML = `
    <input type="text" class="finding-label" value="${escapeHtml(label)}" aria-label="Finding label" />
    <input type="text" class="finding-value" value="${escapeHtml(value)}" aria-label="Finding value" />
    <button class="delete-row" type="button" title="Remove">×</button>
  `;
  row.querySelector(".delete-row").addEventListener("click", () => row.remove());
  row.querySelectorAll("input").forEach((input) => input.addEventListener("input", buildReport));
  findingRows.appendChild(row);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = `${before}${before ? " " : ""}${text}${after ? " " : ""}${after}`;
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = `${before}${before ? " " : ""}${text}`.length;
}

function extractStructuredFindings(input) {
  const normalizedTerms = synonymMap
    .filter(([pattern]) => pattern.test(input))
    .map(([, term]) => term);
  const severity = severityMap.find(([pattern]) => pattern.test(input))?.[1] || "";
  const uniqueTerms = [...new Set(normalizedTerms)];
  const statements = [];

  if (uniqueTerms.includes("fatty liver")) {
    statements.push(["Liver", `Normal size. ${capitalize([severity, "fatty liver"].filter(Boolean).join(" "))} changes are noted. No focal lesion is seen.`]);
  }
  if (uniqueTerms.includes("gallstone")) {
    statements.push(["Gallbladder & Biliary Tree", "Gallstone is seen. No sonographic evidence of acute cholecystitis. CBD is not dilated."]);
  }
  if (uniqueTerms.includes("hydronephrosis")) {
    statements.push(["Kidneys", `${capitalize(severity || "mild")} hydronephrosis is detected. Correlation with clinical and laboratory data is recommended.`]);
  }
  if (uniqueTerms.includes("focal lesion")) {
    statements.push(["Target Organ", "A focal lesion is mentioned in dictation. Please specify organ, size, echogenicity, vascularity, and exact location."]);
  }
  if (uniqueTerms.includes("free fluid")) {
    statements.push(["Peritoneal Cavity / Pelvis", "Free fluid is detected. Please grade the amount and clinical context."]);
  }
  if (uniqueTerms.includes("nodule")) {
    statements.push(["Nodule", "Thyroid nodule is mentioned. Please add size, composition, echogenicity, margins, echogenic foci, and TI-RADS category."]);
  }
  if (uniqueTerms.includes("cyst")) {
    statements.push(["Cystic Lesion", "Simple cystic lesion is mentioned. Please add organ, size, and location."]);
  }
  if (uniqueTerms.includes("renal stone")) {
    statements.push(["Renal Stone", "Renal stone is mentioned. Please add side, size, location, and presence or absence of hydronephrosis."]);
  }

  return statements;
}

function applyDictationToRows() {
  const extracted = extractStructuredFindings(rawInput.value);
  if (!extracted.length) {
    buildReport();
    return;
  }

  extracted.forEach(([label, value]) => {
    const existing = [...findingRows.querySelectorAll(".finding-row")].find((row) => {
      return row.querySelector(".finding-label").value.toLowerCase() === label.toLowerCase();
    });
    if (existing) {
      existing.querySelector(".finding-value").value = value;
    } else {
      addFindingRow(label, value);
    }
  });
  buildReport();
}

function buildReport() {
  const template = currentTemplate();
  const patientLine = [
    patientName.value && `Patient: ${patientName.value}`,
    patientAge.value && `Age: ${patientAge.value}`
  ].filter(Boolean).join(" | ");
  const clinical = clinicalData.value.trim() || "Not provided";
  const rows = [...findingRows.querySelectorAll(".finding-row")]
    .map((row) => [
      row.querySelector(".finding-label").value.trim(),
      row.querySelector(".finding-value").value.trim()
    ])
    .filter(([label, value]) => label || value);

  const body = rows.map(([label, value]) => `${label || "Finding"}:\n${value || "Please complete."}`).join("\n\n");
  const impression = inferImpression(rows, template.impression);
  reportOutput.value = [
    template.title.toUpperCase(),
    patientLine,
    `Clinical data: ${clinical}`,
    "",
    "FINDINGS:",
    body,
    "",
    "IMPRESSION:",
    impression
  ].filter((line) => line !== "").join("\n");

  qualityBadge.textContent = rows.some(([, value]) => /please|specify|complete/i.test(value)) ? "Needs detail" : "Structured";
}

function inferImpression(rows, fallback) {
  const text = rows.map(([, value]) => value).join(" ").toLowerCase();
  const impressions = [];
  if (text.includes("fatty liver")) impressions.push("Fatty liver changes.");
  if (text.includes("gallstone")) impressions.push("Cholelithiasis without sonographic evidence of acute cholecystitis.");
  if (text.includes("hydronephrosis")) impressions.push("Hydronephrosis as described above.");
  if (text.includes("focal lesion")) impressions.push("Focal lesion requires complete characterization.");
  if (text.includes("free fluid")) impressions.push("Free fluid as described above.");
  if (text.includes("nodule")) impressions.push("Thyroid nodule; TI-RADS assessment should be completed.");
  if (text.includes("renal stone")) impressions.push("Renal stone as described above.");
  return impressions.length ? impressions.join("\n") : fallback;
}

function polishRadiologyVoice() {
  const replacements = [
    [/\bnormal\b/gi, "within normal limits"],
    [/\bnot seen\b/gi, "not detected"],
    [/\bhas\b/gi, "demonstrates"],
    [/\bbig\b/gi, "enlarged"],
    [/\bsmall\b/gi, "reduced in size"],
    [/مشاهده نمی شود/g, "not detected"],
    [/طبیعی/g, "within normal limits"]
  ];
  let text = reportOutput.value || "";
  replacements.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  reportOutput.value = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([^\n.])\n([A-Z][A-Za-z &/]+:)/g, "$1.\n$2");
  qualityBadge.textContent = "Polished";
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function loadNormalTemplate() {
  renderFindingRows();
  rawInput.value = "";
  buildReport();
}

function clearFindings() {
  findingRows.innerHTML = "";
  reportOutput.value = "";
  qualityBadge.textContent = "Draft";
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.disabled = true;
    speechStatus.textContent = "Speech API unavailable";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "fa-IR";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening = true;
    micBtn.querySelector("span:last-child").textContent = "Listening";
    speechStatus.textContent = "در حال شنیدن";
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.querySelector("span:last-child").textContent = "Dictate fa-IR";
    speechStatus.textContent = "آماده";
  };

  recognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;
      if (event.results[index].isFinal) {
        finalText += `${transcript} `;
      } else {
        interimText += transcript;
      }
    }
    if (finalText) rawInput.value = `${rawInput.value} ${finalText}`.trim();
    speechStatus.textContent = interimText || "در حال شنیدن";
  };
}

examType.addEventListener("change", () => {
  renderTerms();
  renderFindingRows();
  buildReport();
});

document.querySelector("[data-action='normal']").addEventListener("click", loadNormalTemplate);
document.querySelector("[data-action='clear']").addEventListener("click", clearFindings);
document.querySelector("#formatBtn").addEventListener("click", applyDictationToRows);
document.querySelector("#polishBtn").addEventListener("click", polishRadiologyVoice);
document.querySelector("#addFindingBtn").addEventListener("click", () => addFindingRow());
document.querySelector("#copyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(reportOutput.value);
  } catch {
    reportOutput.focus();
    reportOutput.select();
    document.execCommand("copy");
  }
  qualityBadge.textContent = "Copied";
});
document.querySelector("#downloadBtn").addEventListener("click", () => {
  const blob = new Blob([reportOutput.value], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${currentTemplate().title.replaceAll(" ", "_")}_report.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
});

micBtn.addEventListener("click", () => {
  if (!recognition) return;
  if (isListening) recognition.stop();
  else recognition.start();
});

[patientName, patientAge, clinicalData].forEach((field) => field.addEventListener("input", buildReport));

setupSpeechRecognition();
renderTerms();
renderFindingRows();
buildReport();
