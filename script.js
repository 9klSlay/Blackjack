const suits = {
    p: { folder: "picas", symbol: "♠" },
    t: { folder: "treboles", symbol: "♣" },
    c: { folder: "corazones", symbol: "♥" },
    d: { folder: "diamantes", symbol: "♦" }
};

const difficulties = {
    facil: { name: "FÁCIL", mathTime: 0 },
    medio: { name: "MEDIO", mathTime: 30 },
    dificil: { name: "DIFÍCIL", mathTime: 45 },
    extrema: { name: "EXTREMA", mathTime: 60 }
};

let selectedDifficulty = null;

let playerHand = [];
let dealerHand = [];

let splitHands = [];
let splitScores = [];
let currentHand = 0;

let gameOver = false;

let currentMathAnswer = null;
let mathTimer = null;
let mathTimeLeft = 0;
let pendingAction = null;

let deck = [];


/* ELEMENTOS */

const instructions = document.getElementById("instructions");
const start = document.getElementById("start");
const game = document.getElementById("game");
const result = document.getElementById("result");
const mathModal = document.getElementById("mathModal");
const understoodBtn = document.getElementById("understoodBtn");
const playBtn = document.getElementById("playBtn");
const countdown = document.getElementById("countdown");
const selectedDifficultyText = document.getElementById("selectedDifficulty");
const difficultyTitle = document.getElementById("difficultyTitle");
const playerScore = document.getElementById("playerScore");
const playerScoreTable = document.getElementById("playerScoreTable");
const dealerScore = document.getElementById("dealerScore");
const playerCards = document.getElementById("playerCards");
const dealerCards = document.getElementById("dealerCards");
const message = document.getElementById("message");
const hitBtn = document.getElementById("hitBtn");
const standBtn = document.getElementById("standBtn");
const splitBtn = document.getElementById("splitBtn");
const handIndicator = document.getElementById("handIndicator");
const splitHandsContainer = document.getElementById("splitHands");
const mathQuestion = document.getElementById("mathQuestion");
const mathAnswer = document.getElementById("mathAnswer");
const mathFeedback = document.getElementById("mathFeedback");
const mathSubmit = document.getElementById("mathSubmit");
const mathTime = document.getElementById("mathTime");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const finalScores = document.getElementById("finalScores");
const finalPlayerScore = document.getElementById("finalPlayerScore");
const finalDealerScore = document.getElementById("finalDealerScore");
const rewardBox = document.getElementById("rewardBox");
const againBtn = document.getElementById("againBtn");


/* CAJA */

const crateModal = document.getElementById("crateModal");
const crateVisual = document.getElementById("crateVisual");
const crateTitle = document.getElementById("crateTitle");
const crateSubtitle = document.getElementById("crateSubtitle");
const openCrateBtn = document.getElementById("openCrateBtn");
const rouletteArea = document.getElementById("rouletteArea");
const roulette = document.getElementById("roulette");
const crateResult = document.getElementById("crateResult");


/* SONIDOS */

const openingSound = new Audio("sonidos/sonidoapertura1.mp3");
openingSound.preload = "auto";

const rewardSound = new Audio("sonidos/sonidoruleta3.mp3");
rewardSound.preload = "auto";


/*
    MÚSICA DE FONDO
    MUSIC_VOLUME: volumen normal (0 a 1).
    MUSIC_DUCK: fracción del volumen normal mientras suena la ruleta (0.1 = 10%).
*/

const MUSIC_VOLUME = 0.5;
const MUSIC_DUCK = 0.1;

const bgMusic = new Audio("sonidos/musicaambiente.mp3");
bgMusic.loop = true;
bgMusic.preload = "auto";
bgMusic.volume = MUSIC_VOLUME;

let musicFade = null;


function startMusic() {

    if (!bgMusic.paused) {
        return;
    }

    bgMusic.volume = MUSIC_VOLUME;

    bgMusic.play().catch(() => {
        console.log("No se pudo reproducir musicaambiente.");
    });
}


function fadeMusicTo(target, duration = 400) {

    clearInterval(musicFade);

    const from = bgMusic.volume;
    const startTime = performance.now();

    musicFade = setInterval(() => {

        const t = Math.min((performance.now() - startTime) / duration, 1);

        bgMusic.volume = Math.max(0, Math.min(1, from + (target - from) * t));

        if (t >= 1) {
            clearInterval(musicFade);
        }

    }, 30);
}


function duckMusic() {
    fadeMusicTo(MUSIC_VOLUME * MUSIC_DUCK);
}


function restoreMusic() {
    fadeMusicTo(MUSIC_VOLUME);
}

/*
    AJUSTES DE LA RULETA
    --------------------
    POINTER_OFFSET:
        Ajuste fino en píxeles de dónde está "la flecha".
        Si el brillo/sonido salta ANTES de que la flecha llegue
        al premio, pon un valor positivo (ej. 10).
        Si salta DESPUÉS, pon uno negativo (ej. -10).

    ROULETTE_DURATION:
        Duración total en milisegundos.

    ROULETTE_EASE_POWER:
        Qué tan brusco es el frenado.
        2 = suave, 3.2 = estilo CS, 5 = frena muy temprano.
*/

const POINTER_OFFSET = 0;
const ROULETTE_DURATION = 9000;
const ROULETTE_EASE_POWER = 3.2;


/*
    SONIDO DE CADA PREMIO
    Web Audio (casi sin latencia). Si no se puede cargar
    (por ejemplo con file://), usa un grupo de Audio() de respaldo.
*/

const TICK_SRC = "sonidos/sonidoapertura2.mp3";

const tickPool = Array.from({ length: 10 }, () => {
    const audio = new Audio(TICK_SRC);
    audio.preload = "auto";
    audio.volume = 0.8;
    return audio;
});

let tickPoolIndex = 0;
let audioCtx = null;
let tickBuffer = null;


async function prepareTickSound() {

    if (tickBuffer) {
        return;
    }

    try {

        const Ctx = window.AudioContext || window.webkitAudioContext;

        if (!audioCtx) {
            audioCtx = new Ctx({ latencyHint: "interactive" });
        }

        if (audioCtx.state === "suspended") {
            await audioCtx.resume();
        }

        const response = await fetch(TICK_SRC);
        const data = await response.arrayBuffer();

        tickBuffer = await audioCtx.decodeAudioData(data);

    } catch (error) {

        tickBuffer = null;
    }
}


function playTick() {

    if (tickBuffer && audioCtx) {

        const source = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();

        source.buffer = tickBuffer;
        gain.gain.value = 0.8;

        source.connect(gain);
        gain.connect(audioCtx.destination);

        source.start(0);

        return;
    }

    const audio = tickPool[tickPoolIndex];

    tickPoolIndex = (tickPoolIndex + 1) % tickPool.length;

    audio.currentTime = 0;

    audio.play().catch(() => {});
}


/* RECOMPENSAS */

const rewards = [
    "x1 Dulce",
    "x2 Dulces",
    "x3 Dulces",
    "x4 Dulces"
];


/* CAMBIAR PANTALLA */

function showScreen(screen) {

    document
        .querySelectorAll(".screen")
        .forEach(element => {
            element.classList.remove("active");
        });

    screen.classList.add("active");
}


/* CUENTA REGRESIVA INICIAL */

let instructionTime = 10;

const instructionInterval = setInterval(() => {

    instructionTime--;

    countdown.textContent = instructionTime;

    if (instructionTime <= 0) {

        clearInterval(instructionInterval);

        countdown.textContent = "✓";

        understoodBtn.disabled = false;
    }

}, 1000);


understoodBtn.addEventListener("click", () => {

    startMusic();

    showScreen(start);
});


/* DIFICULTADES */

document
    .querySelectorAll(".difficulty")
    .forEach(button => {

        button.addEventListener("click", () => {

            document
                .querySelectorAll(".difficulty")
                .forEach(btn => {
                    btn.classList.remove("selected");
                });

            button.classList.add("selected");

            selectedDifficulty = button.dataset.difficulty;

            selectedDifficultyText.textContent =
                `${difficulties[selectedDifficulty].name} seleccionado`;

            playBtn.disabled = false;
        });
    });


playBtn.addEventListener("click", startGame);


/* MAZO */

function createDeck() {

    const newDeck = [];

    for (const code in suits) {

        for (let value = 1; value <= 13; value++) {

            newDeck.push({
                value,
                code,
                image: `Cartas/${suits[code].folder}/${value}${code}.png`
            });
        }
    }

    return newDeck;
}


function shuffle(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];
    }
}


function drawCard() {

    if (deck.length === 0) {

        deck = createDeck();

        shuffle(deck);
    }

    return deck.pop();
}


/* PUNTUACIONES */

function getCardValue(card) {

    if (card.value >= 10) {
        return 10;
    }

    if (card.value === 1) {
        return 11;
    }

    return card.value;
}


function calculateScore(hand) {

    let score = 0;
    let aces = 0;

    hand.forEach(card => {

        score += getCardValue(card);

        if (card.value === 1) {
            aces++;
        }
    });

    while (score > 21 && aces > 0) {

        score -= 10;
        aces--;
    }

    return score;
}


function canSplit() {

    if (playerHand.length !== 2) {
        return false;
    }

    return getCardValue(playerHand[0]) === getCardValue(playerHand[1]);
}


function getCurrentHand() {

    if (splitHands.length === 0) {
        return playerHand;
    }

    return splitHands[currentHand];
}


/* CARTAS EN PANTALLA */

function renderCards(revealDealer = false) {

    dealerCards.innerHTML = "";

    dealerHand.forEach((card, index) => {

        const img = document.createElement("img");

        if (index === 1 && !revealDealer) {
            img.src = "Cartas/Back_Black.png";
        } else {
            img.src = card.image;
        }

        dealerCards.appendChild(img);
    });


    playerCards.innerHTML = "";

    const activeHand = getCurrentHand();

    activeHand.forEach(card => {

        const img = document.createElement("img");

        img.src = card.image;

        playerCards.appendChild(img);
    });


    const player = calculateScore(activeHand);

    playerScore.textContent = player;
    playerScoreTable.textContent = player;


    if (revealDealer) {
        dealerScore.textContent = calculateScore(dealerHand);
    } else {
        dealerScore.textContent = "?";
    }


    updateSplitDisplay();
}


/* INICIAR PARTIDA */

function startGame() {

    deck = createDeck();

    shuffle(deck);

    playerHand = [];
    dealerHand = [];

    splitHands = [];
    splitScores = [];

    currentHand = 0;

    gameOver = false;

    rewardBox.innerHTML = "";

    finalScores.style.display = "none";

    splitHandsContainer.style.display = "none";


    difficultyTitle.textContent = difficulties[selectedDifficulty].name;


    playerHand.push(drawCard());
    playerHand.push(drawCard());

    dealerHand.push(drawCard());
    dealerHand.push(drawCard());


    showScreen(game);

    renderCards(false);

    updateButtons();

    message.textContent = "Tu turno. Resuelve el ejercicio para jugar.";
}


/* BOTONES */

hitBtn.addEventListener("click", () => {

    if (gameOver) {
        return;
    }

    askMath("hit");
});


standBtn.addEventListener("click", () => {

    if (gameOver) {
        return;
    }

    askMath("stand");
});


splitBtn.addEventListener("click", () => {

    if (gameOver || !canSplit()) {
        return;
    }

    askMath("split");
});


/* MATEMÁTICAS */

function askMath(action) {

    if (debugMode) {

        executeAction(action);

        return;
    }

    pendingAction = action;

    generateMathQuestion();

    mathModal.classList.add("active");

    mathAnswer.value = "";

    mathFeedback.textContent = "";

    mathAnswer.focus();
}


function randomInt(min, max) {

    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function generateMathQuestion() {

    clearInterval(mathTimer);

    let question;

    if (selectedDifficulty === "facil") {
        question = generateEasyMath();
    } else if (selectedDifficulty === "medio") {
        question = generateMediumMath();
    } else if (selectedDifficulty === "extrema") {
        question = generateExtremeMath();
    } else {
        question = generateHardMath();
    }


    mathQuestion.textContent = question.text;

    mathQuestion.classList.toggle("long", question.text.length > 22);

    currentMathAnswer = question.answer;


    const time = difficulties[selectedDifficulty].mathTime;


    if (time === 0) {

        mathTime.textContent = "∞";

        return;
    }


    mathTimeLeft = time;

    mathTime.textContent = mathTimeLeft;


    mathTimer = setInterval(() => {

        mathTimeLeft--;

        mathTime.textContent = mathTimeLeft;


        if (mathTimeLeft <= 0) {

            clearInterval(mathTimer);

            mathFeedback.textContent = "Se acabó el tiempo.";


            setTimeout(() => {

                mathModal.classList.remove("active");

                finishGame(false, "No respondiste el ejercicio a tiempo.");

            }, 700);
        }

    }, 1000);
}


/* FÁCIL */

function generateEasyMath() {

    const operation = randomInt(1, 3);

    let a;
    let b;
    let answer;
    let text;


    if (operation === 1) {

        a = randomInt(1, 20);
        b = randomInt(1, 20);

        answer = a + b;
        text = `${a} + ${b}`;

    } else if (operation === 2) {

        a = randomInt(5, 25);
        b = randomInt(1, a);

        answer = a - b;
        text = `${a} - ${b}`;

    } else {

        a = randomInt(2, 10);
        b = randomInt(2, 10);

        answer = a * b;
        text = `${a} × ${b}`;
    }


    return { text, answer };
}


/* MEDIO */

function generateMediumMath() {

    const operation = randomInt(1, 4);

    let a;
    let b;
    let answer;
    let text;


    if (operation === 1) {

        a = randomInt(20, 100);
        b = randomInt(10, 100);

        answer = a + b;
        text = `${a} + ${b}`;

    } else if (operation === 2) {

        a = randomInt(30, 150);
        b = randomInt(10, a);

        answer = a - b;
        text = `${a} - ${b}`;

    } else if (operation === 3) {

        a = randomInt(6, 20);
        b = randomInt(3, 15);

        answer = a * b;
        text = `${a} × ${b}`;

    } else {

        b = randomInt(2, 12);
        answer = randomInt(2, 15);

        a = b * answer;
        text = `${a} ÷ ${b}`;
    }


    return { text, answer };
}


/* DIFÍCIL */

function generateHardMath() {

    const operation = randomInt(1, 6);

    let a;
    let b;
    let c;
    let answer;
    let text;


    if (operation === 1) {

        a = randomInt(100, 500);
        b = randomInt(100, 500);
        c = randomInt(10, 100);

        answer = a + b + c;
        text = `${a} + ${b} + ${c}`;

    } else if (operation === 2) {

        a = randomInt(200, 800);
        b = randomInt(50, a - 10);
        c = randomInt(10, b);

        answer = a - b - c;
        text = `${a} - ${b} - ${c}`;

    } else if (operation === 3) {

        a = randomInt(10, 30);
        b = randomInt(5, 20);

        answer = a * b;
        text = `${a} × ${b}`;

    } else if (operation === 4) {

        b = randomInt(5, 20);
        answer = randomInt(5, 30);

        a = b * answer;
        text = `${a} ÷ ${b}`;

    } else if (operation === 5) {

        a = randomInt(5, 30);
        b = randomInt(5, 30);
        c = randomInt(2, 10);

        answer = (a + b) * c;
        text = `(${a} + ${b}) × ${c}`;

    } else {

        a = randomInt(2, 9);
        b = randomInt(2, 4);

        answer = Math.pow(a, b);
        text = `${a} ^ ${b}`;
    }


    return { text, answer };
}


/* EXTREMA */

/*
    Genera expresiones de 2 a 6 operaciones mezclando:
    suma, resta, multiplicación, división, potencias,
    paréntesis, fracciones y números negativos.

    Se calcula con fracciones exactas y solo se acepta
    la expresión si el resultado final es un número entero.
*/

function gcd(a, b) {

    a = Math.abs(a);
    b = Math.abs(b);

    while (b) {
        [a, b] = [b, a % b];
    }

    return a || 1;
}


function makeFrac(n, d) {

    if (d < 0) {
        n = -n;
        d = -d;
    }

    const g = gcd(n, d);

    return { n: n / g, d: d / g };
}


const EXTREME_PREC = { "+": 1, "-": 1, "×": 2, "÷": 2, "^": 3, leaf: 4 };

const EXTREME_LIMIT = 100000;


function extremeLeaf() {

    const roll = Math.random();

    if (roll < 0.55) {

        const v = randomInt(2, 20);

        return { text: String(v), value: makeFrac(v, 1), prec: 4 };
    }

    if (roll < 0.80) {

        const v = -randomInt(2, 15);

        return { text: `(${v})`, value: makeFrac(v, 1), prec: 4 };
    }

    const b = randomInt(2, 6);
    let a = randomInt(1, b * 2);

    /* evitar fracciones como 4/4 o 6/3 */

    while (a % b === 0) {
        a = randomInt(1, b * 2);
    }

    return { text: `(${a}/${b})`, value: makeFrac(a, b), prec: 4 };
}


function extremePower() {

    const negative = Math.random() < 0.3;

    let base = randomInt(2, 9);
    let exp = randomInt(2, 3);

    if (base <= 3 && Math.random() < 0.4) {
        exp = 4;
    }

    if (negative) {
        base = -randomInt(2, 5);
        exp = randomInt(2, 3);
    }

    const baseText = base < 0 ? `(${base})` : String(base);

    return {
        text: `${baseText} ^ ${exp}`,
        value: makeFrac(Math.pow(base, exp), 1),
        prec: 3
    };
}


function extremeNode(ops) {

    if (ops === 0) {
        return extremeLeaf();
    }

    if (ops === 1 && Math.random() < 0.3) {
        return extremePower();
    }

    const leftOps = randomInt(0, ops - 1);
    const rightOps = ops - 1 - leftOps;

    const left = extremeNode(leftOps);
    const right = extremeNode(rightOps);

    if (!left || !right) {
        return null;
    }

    const op = ["+", "-", "×", "÷"][randomInt(0, 3)];

    const a = left.value;
    const b = right.value;

    let value;

    if (op === "+") {
        value = makeFrac(a.n * b.d + b.n * a.d, a.d * b.d);
    } else if (op === "-") {
        value = makeFrac(a.n * b.d - b.n * a.d, a.d * b.d);
    } else if (op === "×") {
        value = makeFrac(a.n * b.n, a.d * b.d);
    } else {

        if (b.n === 0) {
            return null;
        }

        value = makeFrac(a.n * b.d, a.d * b.n);
    }

    if (
        Math.abs(value.n) > EXTREME_LIMIT * 100 ||
        value.d > 10000
    ) {
        return null;
    }

    const prec = EXTREME_PREC[op];

    const leftNeedsParens = left.prec < prec;

    const rightNeedsParens =
        right.prec < prec ||
        (right.prec === prec && (op === "-" || op === "÷"));

    const leftText = leftNeedsParens ? `(${left.text})` : left.text;
    const rightText = rightNeedsParens ? `(${right.text})` : right.text;

    return {
        text: `${leftText} ${op} ${rightText}`,
        value,
        prec
    };
}


function generateExtremeMath() {

    for (let attempt = 0; attempt < 5000; attempt++) {

        const node = extremeNode(randomInt(2, 6));

        if (!node) {
            continue;
        }

        const { n, d } = node.value;

        if (d === 1 && Math.abs(n) <= EXTREME_LIMIT) {
            return { text: node.text, answer: n };
        }
    }

    /* respaldo (casi nunca se usa) */

    const a = randomInt(100, 999);
    const b = randomInt(11, 35);
    const c = randomInt(11, 35);

    return { text: `${a} - ${b} × ${c}`, answer: a - b * c };
}


/* COMPROBAR */

mathSubmit.addEventListener("click", checkMath);


mathAnswer.addEventListener("keydown", event => {

    if (event.key === "Enter") {
        checkMath();
    }
});


function checkMath() {

    if (mathAnswer.value.trim() === "") {

        mathFeedback.textContent = "Escribe una respuesta.";

        return;
    }

    const answer = Number(mathAnswer.value);


    if (answer === currentMathAnswer) {

        clearInterval(mathTimer);

        mathModal.classList.remove("active");

        executeAction(pendingAction);

    } else {

        mathFeedback.textContent = "Respuesta incorrecta.";
    }
}


/* ACCIONES */

function executeAction(action) {

    if (gameOver) {
        return;
    }


    const hand = getCurrentHand();


    if (action === "hit") {

        hand.push(drawCard());

        renderCards(false);


        const score = calculateScore(hand);


        if (score > 21) {

            gameOver = true;

            finishGame(
                false,
                splitHands.length > 0
                    ? `La mano ${currentHand + 1} se pasó de 21.`
                    : "Te pasaste de 21."
            );

            return;
        }


        if (score === 21) {
            message.textContent = "¡21! Puedes mantenerte.";
        } else {
            message.textContent = "Carta añadida.";
        }


    } else if (action === "stand") {

        finishCurrentHand();

    } else if (action === "split") {

        performSplit();
    }


    updateButtons();
}


/* SPLIT */

function performSplit() {

    if (!canSplit()) {
        return;
    }


    const firstCard = playerHand[0];
    const secondCard = playerHand[1];


    splitHands = [
        [firstCard, drawCard()],
        [secondCard, drawCard()]
    ];


    playerHand = [];

    currentHand = 0;

    splitScores = [0, 0];


    message.textContent = "Mano 1. Tu turno.";


    renderCards(false);

    updateButtons();
}


/* TERMINAR MANO */

function finishCurrentHand() {

    if (splitHands.length === 0) {

        finishPlayerTurn();

        return;
    }


    splitScores[currentHand] = calculateScore(splitHands[currentHand]);


    if (currentHand === 0) {

        currentHand = 1;

        message.textContent = "Mano 2. Tu turno.";

        renderCards(false);

        updateButtons();

        return;
    }


    finishPlayerTurn();
}


/* TERMINAR TURNO */

function finishPlayerTurn() {

    gameOver = true;

    hitBtn.disabled = true;
    standBtn.disabled = true;
    splitBtn.disabled = true;


    while (calculateScore(dealerHand) < 17) {
        dealerHand.push(drawCard());
    }


    renderCards(true);


    let playerFinal;


    if (splitHands.length > 0) {

        splitScores[0] = calculateScore(splitHands[0]);
        splitScores[1] = calculateScore(splitHands[1]);

        playerFinal = Math.max(...splitScores);

    } else {

        playerFinal = calculateScore(playerHand);
    }


    const dealer = calculateScore(dealerHand);


    let won;


    if (splitHands.length > 0) {

        won = splitScores.some(score => {

            if (score > 21) {
                return false;
            }

            if (dealer > 21) {
                return true;
            }

            return score > dealer;
        });

    } else {

        won =
            playerFinal <= 21 &&
            (dealer > 21 || playerFinal > dealer);
    }


    let reason;


    if (won) {
        reason = "¡Tu mano fue mejor que la del dealer!";
    } else {
        reason = "El dealer tuvo una mejor mano.";
    }


    setTimeout(() => {

        finishGame(won, reason);

    }, 700);
}


/* BOTONES */

function updateButtons() {

    if (gameOver) {

        hitBtn.disabled = true;
        standBtn.disabled = true;
        splitBtn.disabled = true;

        return;
    }


    hitBtn.disabled = false;
    standBtn.disabled = false;


    if (splitHands.length === 0 && canSplit()) {
        splitBtn.disabled = false;
    } else {
        splitBtn.disabled = true;
    }
}


/* SPLIT DISPLAY */

function updateSplitDisplay() {

    if (splitHands.length === 0) {

        splitHandsContainer.style.display = "none";

        handIndicator.textContent = "";

        return;
    }


    splitHandsContainer.style.display = "flex";

    handIndicator.textContent = `Mano ${currentHand + 1} de 2`;

    splitHandsContainer.innerHTML = "";


    splitHands.forEach((hand, index) => {

        const box = document.createElement("div");

        box.className = "split-hand";


        if (index === currentHand) {
            box.classList.add("active");
        }


        const score = calculateScore(hand);


        box.innerHTML = `
            <p>MANO ${index + 1}</p>
            <strong>${score}</strong>
        `;


        splitHandsContainer.appendChild(box);
    });
}


/* FINAL */

function finishGame(won, reason) {

    gameOver = true;

    clearInterval(mathTimer);

    mathModal.classList.remove("active");


    renderCards(true);


    const player =
        splitHands.length > 0
            ? Math.max(...splitHands.map(hand => calculateScore(hand)))
            : calculateScore(playerHand);


    const dealer = calculateScore(dealerHand);


    resultTitle.textContent = won ? "¡Felicidades!" : "Has perdido";

    resultText.textContent = reason;

    finalPlayerScore.textContent = player;

    finalDealerScore.textContent = dealer;

    finalScores.style.display = "block";

    rewardBox.innerHTML = "";


    if (won) {

        if (selectedDifficulty === "facil") {

            rewardBox.innerHTML = "🏆 Victoria en Fácil";

        } else if (selectedDifficulty === "medio") {

            const tenths = randomInt(1, 2);

            rewardBox.innerHTML =
                `📈 Recompensa: +${tenths} ${tenths === 1 ? "décima" : "décimas"}`;

        } else if (selectedDifficulty === "dificil") {

            rewardBox.innerHTML = "🎁 Has desbloqueado una recompensa.";

            showCrate();

        } else {

            rewardBox.innerHTML = "🏅 Recompensa: Reconocimiento especial";
        }
    }


    showScreen(result);
}


/* MOSTRAR CAJA */

function showCrate() {

    setTimeout(() => {

        crateModal.classList.add("active");


        crateVisual.style.display = "block";

        crateVisual.textContent = "📦";

        crateVisual.classList.remove("opening");


        crateTitle.textContent = "Has conseguido una caja";

        crateSubtitle.textContent = "Ábrela para descubrir tu recompensa.";


        openCrateBtn.style.display = "inline-block";

        openCrateBtn.disabled = false;

        openCrateBtn.classList.remove("opening-button");


        rouletteArea.classList.remove("active");

        roulette.innerHTML = "";


        crateResult.textContent = "";

        crateResult.classList.remove("reveal");

    }, 900);
}


/* ABRIR CAJA */

openCrateBtn.addEventListener("click", openCrate);


async function openCrate() {

    /* preparar el sonido de la ruleta (dentro del clic del usuario) */
    prepareTickSound();


    duckMusic();

    openCrateBtn.disabled = true;

    openCrateBtn.classList.add("opening-button");


    crateTitle.textContent = "Abriendo...";

    crateSubtitle.textContent = "La recompensa está dentro.";


    crateVisual.classList.add("opening");


    openingSound.currentTime = 0;


    try {

        await openingSound.play();

    } catch (error) {

        console.log("No se pudo reproducir sonidoapertura1.");
    }


    await waitForAudio(openingSound);


    crateVisual.style.display = "none";

    openCrateBtn.style.display = "none";


    crateTitle.textContent = "¡A ver qué te toca!";

    crateSubtitle.textContent = "La recompensa está girando...";


    rouletteArea.classList.add("active");


    await startRoulette();
}


/* ESPERAR SONIDO */

function waitForAudio(audio) {

    return new Promise(resolve => {

        if (
            audio.readyState >= 2 &&
            audio.duration &&
            !isNaN(audio.duration)
        ) {

            if (audio.ended) {

                resolve();

                return;
            }
        }


        let resolved = false;


        const finish = () => {

            if (resolved) {
                return;
            }

            resolved = true;

            audio.removeEventListener("ended", finish);

            resolve();
        };


        audio.addEventListener("ended", finish);

        setTimeout(finish, 15000);
    });
}


/* =====================================================
   RULETA
===================================================== */

/*
    Posición real de la flecha (centro del símbolo),
    en coordenadas internas de la ventana de la ruleta.

    La caja aparece con una animación de escala (0.8 → 1);
    se divide por la escala actual para que la medida sea
    correcta aunque la animación siga en curso.
*/

function measurePointerX(container) {

    const rect = container.getBoundingClientRect();

    const scale = rect.width / container.offsetWidth || 1;

    let pointerClientX = rect.left + rect.width / 2;

    const pointer = document.querySelector(".roulette-pointer");

    if (pointer) {

        const range = document.createRange();

        range.selectNodeContents(pointer);

        const glyph = range.getBoundingClientRect();

        if (glyph.width > 0) {

            pointerClientX = glyph.left + glyph.width / 2;

        } else {

            const box = pointer.getBoundingClientRect();

            pointerClientX = box.left + box.width / 2;
        }
    }

    return (
        (pointerClientX - rect.left) / scale
        - container.clientLeft
        + POINTER_OFFSET
    );
}


/* Empieza muy rápido y frena lento (ease-out) */

function easeRoulette(t) {

    return 1 - Math.pow(1 - t, ROULETTE_EASE_POWER);
}


async function startRoulette() {

    roulette.innerHTML = "";

    roulette.style.transition = "none";
    roulette.style.transform = "translateX(0px)";

    crateResult.textContent = "";

    crateResult.classList.remove("reveal");


    const winningReward =
        rewards[Math.floor(Math.random() * rewards.length)];

    const totalItems = 50;
    const winningIndex = 43;

    const items = [];


    for (let i = 0; i < totalItems; i++) {

        const reward =
            i === winningIndex
                ? winningReward
                : rewards[Math.floor(Math.random() * rewards.length)];

        const item = document.createElement("div");

        item.className = "roulette-item";
        item.textContent = reward;

        roulette.appendChild(item);
        items.push(item);
    }


    /* esperar a que el navegador calcule el layout */

    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));


    const container = document.querySelector(".roulette-window");

    /* medidas de layout (no les afecta la animación de escala) */

    const itemWidth = items[0].offsetWidth;

    const step = items[1].offsetLeft - items[0].offsetLeft;

    const gap = step - itemWidth;

    const pointerX = measurePointerX(container);

    const winningCenter =
        items[winningIndex].offsetLeft + itemWidth / 2;

    const finalPosition = pointerX - winningCenter;


    /* premio que está exactamente bajo la flecha */

    function indexUnderPointer(position) {

        const x = pointerX - position;

        const index = Math.floor((x + gap / 2) / step);

        return Math.max(0, Math.min(items.length - 1, index));
    }


    let litIndex = indexUnderPointer(0);

    items[litIndex].classList.add("selected");


    function light(index) {

        items[litIndex].classList.remove("selected");

        items[index].classList.add("selected");

        litIndex = index;
    }


    /* ANIMACIÓN: brillo y sonido cambian EN EL MISMO FRAME */

    await new Promise(resolve => {

        const startTime = performance.now();

        function animate(time) {

            const progress = Math.min(
                Math.max((time - startTime) / ROULETTE_DURATION, 0),
                1
            );

            const position = finalPosition * easeRoulette(progress);

            roulette.style.transform = `translateX(${position}px)`;

            const index = indexUnderPointer(position);

            if (index !== litIndex) {

                light(index);

                playTick();
            }

            if (progress < 1) {

                requestAnimationFrame(animate);

            } else {

                roulette.style.transform = `translateX(${finalPosition}px)`;

                if (litIndex !== winningIndex) {
                    light(winningIndex);
                }

                resolve();
            }
        }

        requestAnimationFrame(animate);
    });


    await wait(400);


    crateTitle.textContent = "¡Recompensa obtenida!";

    crateSubtitle.textContent = "La caja ha sido abierta.";

    restoreMusic();

    rewardSound.currentTime = 0;

    rewardSound.play().catch(() => {
        console.log("No se pudo reproducir sonidoruleta3.");
    });

    crateResult.textContent = `🎁 ${winningReward}`;

    crateResult.classList.add("reveal");

    rewardBox.innerHTML = `🎁 Recompensa: ${winningReward}`;
}


/* ESPERAR */

function wait(ms) {

    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}


/* JUGAR DE NUEVO */

againBtn.addEventListener("click", () => {

    crateModal.classList.remove("active");

    restoreMusic();

    clearInterval(mathTimer);

    selectedDifficulty = null;

    document
        .querySelectorAll(".difficulty")
        .forEach(button => {
            button.classList.remove("selected");
        });

    selectedDifficultyText.textContent = "Selecciona una dificultad";

    playBtn.disabled = true;

    showScreen(start);
});


/* =====================================================
   DEBUG (truco tipo GTA: escribe "debug" en la página)
   - Salta las instrucciones y la cuenta regresiva
   - Salta los ejercicios matemáticos
   - Escríbelo otra vez para desactivarlo
===================================================== */

let debugMode = false;
let debugBuffer = "";
let debugToastTimeout = null;


function showDebugToast(text) {

    const old = document.querySelector(".debug-toast");

    if (old) {
        old.remove();
    }

    clearTimeout(debugToastTimeout);

    const toast = document.createElement("div");

    toast.className = "debug-toast";
    toast.textContent = text;

    document.body.appendChild(toast);

    debugToastTimeout = setTimeout(() => toast.remove(), 2500);
}


function activateDebug() {

    debugMode = !debugMode;

    if (!debugMode) {

        showDebugToast("🛠 Debug desactivado");

        return;
    }

    showDebugToast("🛠 Debug activado");

    /* saltar instrucciones */

    if (instructions.classList.contains("active")) {

        clearInterval(instructionInterval);

        countdown.textContent = "✓";

        understoodBtn.disabled = false;

        startMusic();

        showScreen(start);
    }

    /* si hay un ejercicio abierto, saltarlo */

    if (mathModal.classList.contains("active")) {

        clearInterval(mathTimer);

        mathModal.classList.remove("active");

        executeAction(pendingAction);
    }
}


document.addEventListener("keydown", event => {

    if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    if (event.key.length !== 1) {
        return;
    }

    debugBuffer = (debugBuffer + event.key.toLowerCase()).slice(-5);

    if (debugBuffer === "debug") {

        debugBuffer = "";

        activateDebug();
    }
});
