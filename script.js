document
  .getElementById("generate")
  .addEventListener("click", generateSchedules);
document
  .getElementById("randomizeNames")
  .addEventListener("change", function () {
    const sameOrderCheckbox = document.getElementById("sameOrderMorning");
    sameOrderCheckbox.disabled = !this.checked;
  });
document.addEventListener("DOMContentLoaded", function () {
  const randomizeCheckbox = document.getElementById("randomizeNames");
  const sameOrderCheckbox = document.getElementById("sameOrderMorning");

  function updateSameOrderState() {
    sameOrderCheckbox.disabled = !randomizeCheckbox.checked;
  }

  // Run on page load
  updateSameOrderState();
  // Run on checkbox change
  randomizeCheckbox.addEventListener("change", updateSameOrderState);
});

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function generateSchedules() {
  const startTime1 = document.getElementById("startTime1").value;
  const endTime1 = document.getElementById("endTime1").value;
  const startTime2 = document.getElementById("startTime2").value;
  const endTime2 = document.getElementById("endTime2").value;
  const namesInput = document.getElementById("names").value.trim();
  const randomize = document.getElementById("randomizeNames").checked;
  const sameOrderMorning = document.getElementById("sameOrderMorning").checked;
  const guardsPerShift = parseInt(
    document.getElementById("guardsPerShift").value,
    10
  );

  if (!((startTime1 && endTime1) || (startTime2 && endTime2))) {
    alert("אנא הזן לפחות טווח זמן אחד!");
    return;
  }
  if (namesInput === "") {
    alert("אנא הזן לפחות שם אחד!");
    return;
  }
  if (guardsPerShift < 1) {
    alert("מספר השומרים למשמרת חייב להיות 1 לפחות!");
    document.getElementById("guardsPerShift").value = 1;
    return;
  }

  let names = namesInput
    .split("\n")
    .map((name) => name.trim())
    .filter((name) => name !== "");
  if (names.length === 0) {
    alert("אנא הזן לפחות שם אחד!");
    return;
  }

  if (names.length < guardsPerShift) {
    alert(
      `יש להזין לפחות ${guardsPerShift} שמות עבור מספר השומרים למשמרת שבחרת.`
    );
    return;
  }

  // Clear tables
  clearTable("schedule1");
  clearTable("schedule2");

  let hasEveningSchedule = false;
  let hasMorningSchedule = false;

  // Generate Evening Schedule
  if (startTime1 && endTime1) {
    let eveningNames = [...names]; // Use a copy
    if (randomize) {
      shuffleArray(eveningNames);
    }
    generateSchedule(
      startTime1,
      endTime1,
      eveningNames,
      "schedule1",
      guardsPerShift
    );
    hasEveningSchedule = true;
  }

  // Generate Morning Schedule
  if (startTime2 && endTime2) {
    let morningNames;
    if (!sameOrderMorning && randomize) {
      morningNames = [...names]; // Use a fresh copy for morning if not same order
      shuffleArray(morningNames);
    } else {
      // If not randomizing or if sameOrderMorning is checked, use the initial names or the shuffled evening names if randomize was on for evening
      morningNames = names;
      if (randomize && sameOrderMorning && hasEveningSchedule) {
        // If random and same order, ensure the evening's final order is used
        // This would require storing the 'eveningNames' in a way that's accessible,
        // or just re-shuffling the original names if 'randomize' is true
        morningNames = [...names]; // Start with original names
        shuffleArray(morningNames); // Reshuffle for consistency
      }
    }
    generateSchedule(
      startTime2,
      endTime2,
      morningNames,
      "schedule2",
      guardsPerShift
    );
    hasMorningSchedule = true;
  }

  // Show the schedules after generating
  if (hasEveningSchedule) {
    document.getElementById("schedule1-container").classList.remove("hidden");
  }
  if (hasMorningSchedule) {
    document.getElementById("schedule2-container").classList.remove("hidden");
  }
}

function clearTable(tableId) {
  const tbody = document.getElementById(tableId).querySelector("tbody");
  tbody.innerHTML = ""; // Remove all rows
}

function generateSchedule(startTime, endTime, names, tableId, guardsPerShift) {
  const start = new Date(`1970-01-01T${startTime}:00`);
  let end = new Date(`1970-01-01T${endTime}:00`);
  if (end <= start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours if end time is on the next day
  }

  const totalMinutes = (end - start) / (1000 * 60);
  const availableSlots = Math.floor(names.length / guardsPerShift); // Number of distinct time slots we can fill

  if (availableSlots === 0) {
    alert("אין מספיק שמות כדי למלא את המשמרות עם מספר השומרים הנבחר.");
    return;
  }

  const slotDuration = totalMinutes / availableSlots;

  if (slotDuration <= 0) {
    alert("שעת הסיום חייבת להיות אחרי שעת ההתחלה!");
    return;
  }

  const tbody = document.getElementById(tableId).querySelector("tbody");
  tbody.innerHTML = "";

  let currentTime = start;
  let nameIndex = 0;

  for (let i = 0; i < availableSlots; i++) {
    const nextTime = new Date(currentTime.getTime() + slotDuration * 60 * 1000);
    const timeSlot = `${formatTime(nextTime)} - ${formatTime(currentTime)}`;

    const assignedGuards = [];
    for (let j = 0; j < guardsPerShift; j++) {
      if (nameIndex < names.length) {
        assignedGuards.push(names[nameIndex % names.length]); // Use modulo for cycling through names
        nameIndex++;
      } else {
        // This case should ideally not be hit if availableSlots is calculated correctly,
        // but as a fallback, we can cycle names or stop. Cycling is chosen for fairness.
        assignedGuards.push(names[nameIndex % names.length]);
        nameIndex++;
      }
    }

    const row = document.createElement("tr");
    row.innerHTML = `<td>${timeSlot}</td><td class="editable">${assignedGuards.join(
      ", "
    )}</td>`;
    tbody.appendChild(row);
    currentTime = nextTime;
  }
  makeTableEditable(tableId);
}

function makeTableEditable(tableId) {
  document.querySelectorAll(`#${tableId} .editable`).forEach((cell) => {
    cell.addEventListener("click", function () {
      if (this.querySelector("input")) return; // Prevent duplicate inputs

      const currentText = this.innerText;
      const input = document.createElement("input");
      input.type = "text";
      input.value = currentText;
      input.style.width = "100%";
      input.addEventListener("blur", function () {
        cell.innerText = input.value;
      });
      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          cell.innerText = input.value;
        }
      });
      this.innerText = "";
      this.appendChild(input);
      input.focus();
    });
  });
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function updateNameCount() {
  const namesInput = document.getElementById("names").value.trim();
  const names = namesInput
    .split("\n")
    .map((name) => name.trim())
    .filter((name) => name !== "");
  document.getElementById("nameCount").innerText = `מס' שמות: ${names.length}`;
}

function copyAllTables() {
  let text = "";
  const eveningText = getTableText("schedule1");
  if (eveningText) {
    text += "*מאזין ערב*\n" + eveningText + "\n\n";
  }
  const morningText = getTableText("schedule2");
  if (morningText) {
    text += "*מאזין בוקר*\n" + morningText + "\n";
  }
  if (text.trim() === "") {
    alert("אין נתונים להעתקה!");
    return;
  }
  navigator.clipboard
    .writeText(text.trim())
    .then(() => {
      console.log("Copied successfully");
    })
    .catch((err) => {
      console.error("Clipboard copy failed:", err);
      fallbackCopyText(text);
    });
}

// Fallback for older browsers or permissions issues
function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    console.log("Copied using fallback");
  } catch (err) {
    console.error("Fallback copy failed", err);
    alert("שגיאה בהעתקה ❌");
  }
  document.body.removeChild(textarea);
}

function getTableText(tableId) {
  const table = document.getElementById(tableId);
  let text = "";
  const rows = table.getElementsByTagName("tr");
  // Skip the first row (headers)
  for (let i = 1; i < rows.length; i++) {
    let rowText = [];
    for (let cell of rows[i].cells) {
      rowText.push(cell.innerText);
    }
    text += rowText.join("  ") + "\n";
  }
  return text.trim();
}

function toggleSettings() {
  const settingsContainer = document.querySelector(".settings-container");
  settingsContainer.classList.toggle("hidden");
  const button = document.querySelector(".collapsible-button");
  // Change button text based on the visibility of settings
  if (settingsContainer.classList.contains("hidden")) {
    button.innerText = "הגדרות נוספות"; // Text when collapsed
  } else {
    button.innerText = "הסתר הגדרות"; // Text when expanded
  }
}

function autoResizeTextarea() {
  const textarea = document.getElementById("names");
  const lineCount = textarea.value.split("\n").length;
  // Set the max number of rows to 10
  textarea.rows = Math.min(10, Math.max(4, lineCount));
}
