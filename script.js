// 📚 Word list for dictation (can be replaced or expanded later)
//const words = ['diktat', 'huset', 'venner', 'morgenmad', 'skole', 'øl', 'varmepumpefirma'];
// 🧩 Current word that is being tested
let currentWord = '';

// 🚦 Flag: waiting for the user to type "ja" to start
let waitingForYes = true;

// 🎯 Flag: we are currently checking the user's input against the word
let checkingAnswer = false;

// 🔗 DOM elements
const userInput = document.getElementById('userInput');         // Text input field
const output = document.getElementById('output');               // Feedback message container
const voiceSelect = document.getElementById('voiceSelect');     // Voice dropdown menu
const autoToggle = document.getElementById('autoModeToggle');   // Checkbox to enable/disable auto-mode
const progressEl = document.getElementById('progress');         // Shows current progress: ✔ 2 / 5

// 🔊 Voice management
let danishVoices = [];       // All Danish voices loaded from browser
let selectedVoice = null;    // The currently selected Danish voice

// ❌ List of words the user got wrong (retried at the end)
let failedWords = [];

// 📊 Progress tracking
let totalWords = 0;          // Total number of words for current session
let completed = 0;           // How many words the user has completed
let originalFails = 0; // Track how many total fails happened

let words = []; // ← This is the correct global setup
// 🌀 Word pool used in the current round (gets emptied as user answers)
let wordPool = [...words];   // Copy of words array, to prevent direct mutation

const categories = {
    huse: 'huse',
    skole: 'skole',
    mad: 'mad',
    combo_1:'combo_1',
  };

const categorySelect = document.getElementById('categorySelect');
const categoryLabel = document.getElementById('categoryLabel');

// Slider Speed Voice
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
let voiceRate = 1.0;


function initCategoryDropdown() {
  for (const name in categories) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    categorySelect.appendChild(option);
  }

  categorySelect.addEventListener('change', () => {
    loadCategory(categorySelect.value);
  });
}

async function loadCategory(name) {
  try {
    const module = await import(`/category/${name}.js`);
    words = module.words;
    wordPool = [...words];
    totalWords = wordPool.length;
    completed = 0;
    failedWords = [];
    originalFails = 0;

    categoryLabel.textContent = `Aktiv: ${name}`;
    speak(`Kategori ${name} er valgt.`, 0);
    startDictation();
  } catch (e) {
    alert("Kunne ikke indlæse kategori: " + name);
  }
}
initCategoryDropdown();
categorySelect.value = 'huse'; // Default category key
//loadCategory('huse'); // 👈 force trigger manually

// Connect the slider to speech synthesis
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
let voiceVolume = 0.2;

volumeSlider.addEventListener('input', () => {
    voiceVolume = parseFloat(volumeSlider.value);
    volumeValue.textContent = voiceVolume.toFixed(1);
});


// 🆕 Load Danish voices into the dropdown
// 🆕 Henter danske stemmer og tilføjer dem til dropdown-menuen
function loadVoices() {
    // 🔊 Få fat i alle stemmer som browseren understøtter
    const allVoices = speechSynthesis.getVoices();
    console.log(allVoices);

    // 🧹 Filtrér kun stemmer der starter med 'da' (dansk)
    danishVoices = allVoices.filter(v => v.lang.startsWith('da'));

    // 🚨 Hvis der ikke findes nogen danske stemmer, vis en advarsel
    if (danishVoices.length === 0) {
        alert("Ingen danske stemmer fundet! Prøv Edge-browser eller installer dansk sprogpakke.");
        return; // 🛑 Stop her hvis ingen danske stemmer er fundet
    }

    // 🗑️ Ryd dropdown-menuen før vi tilføjer nye valgmuligheder
    voiceSelect.innerHTML = '';

    // 🔁 Tilføj hver dansk stemme som en mulighed i dropdown'en
    danishVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index; // 📌 Gem index'et som værdi
        option.textContent = `${voice.name} (${voice.lang})`; // 📋 Vis navn og sprogkode
        voiceSelect.appendChild(option); // ➕ Tilføj til select-elementet
    });

    // 🧠 Vælg automatisk den første stemme som standard
    selectedVoice = danishVoices[0];
}

// When browser loads voices (async)
speechSynthesis.onvoiceschanged = loadVoices;

function speak(text, delay = 0) {
    // 🕓 Wait for optional delay before speaking
    setTimeout(() => {

        // 🔊 Create a new speech request with the given text
        const utterance = new SpeechSynthesisUtterance(text);

        // 🧠 If a Danish voice is selected, assign it to the utterance
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.rate = voiceRate; // slider speech voice
        utterance.volume = voiceVolume; // ← set volume here
        // 📢 Let the browser speak the text
        speechSynthesis.speak(utterance);

    }, delay); // delay is in milliseconds (e.g., 500 = half a second)
}
// function triggerReadAloudHotkey() {
//     const event = new KeyboardEvent('keydown', {
//         key: 'p',
//         code: 'KeyP',
//         altKey: true,
//         bubbles: true,
//     });
//     document.dispatchEvent(event);
// }

// function speak(text, delay = 0) {
//     setTimeout(() => {
//         //speakWithReadAloud(text);
//         triggerReadAloudHotkey();
//     }, delay);
// }

speedSlider.addEventListener('input', () => {
    voiceRate = parseFloat(speedSlider.value);
    speedValue.textContent = voiceRate.toFixed(1);
});
  
function startDictation() {
    if (wordPool.length === 0) {
        // ✅ Just show the menu always
        showEndMenu();
        return;
    }

    // ✅ Only set totalWords once (we don't want to reset it on every word)
    if (totalWords === 0) {
        totalWords = wordPool.length;  // Store how many words we have for progress bar
    }

    // 👉 Randomly pick a word from remaining pool
    const randomIndex = Math.floor(Math.random() * wordPool.length);
    currentWord = wordPool.splice(randomIndex, 1)[0];  // Remove word from pool so no repeats

    // 🎧 Say the word out loud
    speak(currentWord, 0);  // You hear the word before typing it

    // 📊 Update progress display
    completed += 1;  // Increase how many you've attempted
    progressEl.textContent = `✔ ${completed} / ${totalWords}`;  // Show like: ✔ 2 / 5

    // 📝 Prep the input field for next answer
    checkingAnswer = true;  // App is now waiting for your input
    output.innerHTML = "Skriv det ord du hørte:";  // Instruction to user
    output.innerHTML = "Tryk <strong>Alt + P</strong> for at høre ordet med Read Aloud";

    userInput.value = '';  // Clear the input box

}
function showEndMenu() {
    const menu = document.getElementById('endMenu');
    const summary = document.getElementById('resultSummary');

    const failedCount = failedWords.length;
    const allCorrect = completed === totalWords && failedCount === 0;

    // 1️⃣ User made no mistakes at all (clean round)
    if (allCorrect && originalFails === 0) {
        summary.innerHTML = `📊 Du har bestået med ${completed} / ${totalWords}`;
        speak(`Du har bestået alt ${completed} / ${totalWords}`, 0);
    }

    // 2️⃣ User made some errors but fixed them all later
    else if (allCorrect && originalFails > 0) {
        const fixedCount = originalFails;
        summary.innerHTML = `🎉 Nu har du bestået alt uden fejl!<br>` +
            `🛠️ Du rettede ${fixedCount} fejl undervejs.`;
        speak("Nu har du bestået alt uden fejl!", 0);
    }


    // 3️⃣ User has some remaining errors
    else {
        const correctWithoutRetries = totalWords - originalFails;
    
        if (correctWithoutRetries < totalWords / 2) {
            summary.innerHTML = `
                🟥❌ Du har dumpet med ${correctWithoutRetries} / ${totalWords}<br>
                💡 Det er bedre at prøve den øvelse igen.
            `;
            speak("Du har dumpet. Prøv igen.", 0);
        }
    
        else if (correctWithoutRetries === totalWords / 2) {
            summary.innerHTML = `
                🟨😅 Heldigt at bestå med halvdelen<br>
                📊 Resultat: ${correctWithoutRetries} / ${totalWords}
            `;
            speak("Du klarede halvdelen. Prøv igen for at forbedre dig.", 0);
        }
    
        else {
            summary.innerHTML = `
                🟩📊 <strong>Du har gennemgået det hele</strong><br>
                ❌ Fejl: ${originalFails} · Resultat: ${correctWithoutRetries} / ${totalWords}
            `;
            speak("Du har gennemgået hele øvelsen.", 0);
            speak("Du har bestået.", 500);
        }
    }
    
    // Hide RedoBtn
    const redoBtn = document.querySelector('#menuOptions button[onclick="redoFailed()"]');
    redoBtn.style.display = failedCount > 0 ? 'inline-block' : 'none';

    menu.style.display = 'block';
}

function redoFailed() {
    wordPool = [...failedWords];              // Load only failed words
    totalWords = wordPool.length;
    completed = 0;
    failedWords = [];

    document.getElementById('endMenu').style.display = 'none';

    // 👇 Only speak the retry message here (not inside startDictation)
    speak("Lad os prøve det fejlslagne ord igen.", 0);

    setTimeout(() => {
        startDictation();
    }, 1200); // Let the message play before next word
}

function continueSameCategory() {
    wordPool = [...words];
    totalWords = wordPool.length;
    completed = 0;
    document.getElementById('endMenu').style.display = 'none';
    startDictation();
}

function exitApp() {
    location.reload(); // For now, just refresh the app
}

function handleInput() {
    const input = userInput.value.trim().toLowerCase();

    if (waitingForYes && input === 'ja') {
        waitingForYes = false;
        output.innerHTML = "Lyt godt efter...";
        startDictation();
        return;
    }

    if (checkingAnswer) {
        const isDirectAnswerMode = document.getElementById('autoModeToggleAnswer').checked;

        if (isDirectAnswerMode) {
            // 🟢 Skip checking, just store if wrong and go next
            if (input !== currentWord.toLowerCase()) {
                if (!failedWords.includes(currentWord)) {
                    failedWords.push(currentWord);
                    originalFails++;
                }
            }

            checkingAnswer = false;
            userInput.value = '';

            output.innerHTML = "↪️ Næste ord køres direkte...";

            setTimeout(() => {
                startDictation();
            }, 600);
            return;
        }

        // ✅ CORRECT
        if (input === currentWord.toLowerCase()) {
            checkingAnswer = false;
            userInput.value = '';
            output.innerHTML = "✅ Godt gået!";

            if (autoToggle.checked) {
                setTimeout(() => {
                    startDictation();
                }, 800);
            } else {
                speak("Godt gået!", 0);
                speak("Er du klar til næste ord? Skriv ja.", 500);
                output.innerHTML = "✅ Godt gået!<br>Er du klar til næste ord? Skriv <strong>ja</strong>.";
                waitingForYes = true;
            }
        }

        // ❌ WRONG
        else {
            if (!failedWords.includes(currentWord)) {
                failedWords.push(currentWord);
                originalFails++;
            }

            output.innerHTML = `❌ Hmm, prøv igen.<br>👂 Tryk <strong>Alt + Enter</strong> for at høre ordet igen.`;
        }
    }
}

// 🆕 Change selected voice when dropdown changes
voiceSelect.addEventListener('change', () => {
    const index = parseInt(voiceSelect.value);
    selectedVoice = danishVoices[index];
});

// Also allow Enter to submit
userInput.addEventListener('keydown', function (e) {
    // ALT + Enter to repeat the word
    if (e.key === 'Enter' && e.altKey) {
        speak(currentWord, 0);
        return; // Prevent it from also submitting
    }

    // Regular Enter to submit
    if (e.key === 'Enter') {
        handleInput();
    }
});


// First message
//speak("Er du klar til ordet? Skriv ja.", 500);


function toggleMenu() {
    const menu = document.getElementById('endMenu');
    const isVisible = menu.style.display === 'block' || menu.style.display === '';
    menu.style.display = isVisible ? 'none' : 'block';

    // Hide RedoBtn
    const redoBtn = document.querySelector('#menuOptions button[onclick="redoFailed()"]');
    redoBtn.style.display = 'none';
}
toggleMenu();


window.redoFailed = redoFailed;
window.continueSameCategory = continueSameCategory;
window.exitApp = exitApp;
window.toggleMenu = toggleMenu;
window.handleInput = handleInput;
