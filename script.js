const suits = {
    p: { folder: "picas", symbol: "♠" },
    t: { folder: "treboles", symbol: "♣" },
    c: { folder: "corazones", symbol: "♥" },
    d: { folder: "diamantes", symbol: "♦" }
};

let deck = [];
let playerHand = [];
let dealerHand = [];
let selectedDifficulty = null;
let pendingAction = null;
let mathAnswer = null;
let gameOver = false;

const instructions = document.getElementById("instructions");
const start = document.getElementById("start");
const game = document.getElementById("game");
const result = document.getElementById("result");
const mathModal = document.getElementById("mathModal");
const crateModal = document.getElementById("crateModal");

const countdown = document.getElementById("countdown");
const understoodBtn = document.getElementById("understoodBtn");
const playBtn = document.getElementById("playBtn");
const selectedDifficultyText = document.getElementById("selectedDifficulty");

const dealerCards = document.getElementById("dealerCards");
const playerCards = document.getElementById("playerCards");
const dealerScore = document.getElementById("dealerScore");
const playerScore = document.getElementById("playerScore");
const playerScoreTable = document.getElementById("playerScoreTable");
const message = document.getElementById("message");
const difficultyTitle = document.getElementById("difficultyTitle");

const hitBtn = document.getElementById("hitBtn");
const standBtn = document.getElementById("standBtn");

const mathQuestion = document.getElementById("mathQuestion");
const mathAnswerInput = document.getElementById("mathAnswer");
const mathSubmit = document.getElementById("mathSubmit");
const mathFeedback = document.getElementById("mathFeedback");

const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const rewardBox = document.getElementById("rewardBox");
const againBtn = document.getElementById("againBtn");


function showScreen(screen) {
    [instructions, start, game, result].forEach(s => {
        s.classList.remove("active");
    });

    screen.classList.add("active");
}


let seconds = 10;

const timer = setInterval(() => {
    seconds--;

    countdown.textContent = seconds;

    if (seconds <= 0) {
        clearInterval(timer);

        countdown.textContent = "0";
        understoodBtn.disabled = false;
        understoodBtn.textContent = "ENTENDIDO";
    }
}, 1000);


understoodBtn.addEventListener("click", () => {
    showScreen(start);
});


document.querySelectorAll(".difficulty").forEach(button => {

    button.addEventListener("click", () => {

        document.querySelectorAll(".difficulty").forEach(b => {
            b.classList.remove("selected");
        });

        button.classList.add("selected");

        selectedDifficulty = button.dataset.difficulty;

        const names = {
            facil: "Fácil — sin recompensa",
            medio: "Medio — x1–2 Dulces",
            dificil: "Difícil — x1–4 Décimas"
        };

        selectedDifficultyText.textContent =
            names[selectedDifficulty];

        playBtn.disabled = false;
    });

});


playBtn.addEventListener("click", startGame);


againBtn.addEventListener("click", () => {

    showScreen(start);

    document.querySelectorAll(".difficulty").forEach(b => {
        b.classList.remove("selected");
    });

    selectedDifficulty = null;

    selectedDifficultyText.textContent =
        "Selecciona una dificultad";

    playBtn.disabled = true;
});


function createDeck() {

    const newDeck = [];

    for (const code of Object.keys(suits)) {

        for (let value = 1; value <= 13; value++) {

            newDeck.push({
                value,
                code,
                image: `cartas/${suits[code].folder}/${value}${code}.png`
            });

        }
    }

    return newDeck;
}


function shuffle(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] =
            [array[j], array[i]];
    }
}


function cardValue(card) {

    if (card.value >= 10) {
        return 10;
    }

    return card.value === 1
        ? 11
        : card.value;
}


function calculateScore(hand) {

    let score = 0;
    let aces = 0;

    hand.forEach(card => {

        score += cardValue(card);

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


function drawCard(hand) {

    const card = deck.pop();

    hand.push(card);

    return card;
}


function renderCards() {

    playerCards.innerHTML = "";
    dealerCards.innerHTML = "";


    playerHand.forEach(card => {

        const img = document.createElement("img");

        img.src = card.image;
        img.className = "card";

        img.alt =
            `${card.value} de ${suits[card.code].folder}`;

        playerCards.appendChild(img);
    });


    dealerHand.forEach((card, index) => {

        const img = document.createElement("img");

        img.className = "card";

        if (index === 1 && !gameOver) {

            img.src = "cartas/back_black.png";
            img.alt = "Carta oculta";

        } else {

            img.src = card.image;

            img.alt =
                `${card.value} de ${suits[card.code].folder}`;
        }

        dealerCards.appendChild(img);
    });


    const pScore = calculateScore(playerHand);

    playerScore.textContent = pScore;
    playerScoreTable.textContent = pScore;


    if (gameOver) {
        dealerScore.textContent =
            calculateScore(dealerHand);
    } else {
        dealerScore.textContent = "?";
    }
}


function startGame() {

    if (!selectedDifficulty) {
        return;
    }

    showScreen(game);

    difficultyTitle.textContent =
        selectedDifficulty.toUpperCase();


    deck = createDeck();
    shuffle(deck);

    playerHand = [];
    dealerHand = [];

    gameOver = false;

    hitBtn.disabled = false;
    standBtn.disabled = false;


    drawCard(playerHand);
    drawCard(dealerHand);
    drawCard(playerHand);
    drawCard(dealerHand);


    renderCards();

    message.textContent =
        "Tu turno. Antes de cada decisión tendrás que resolver un ejercicio.";


    if (calculateScore(playerHand) === 21) {

        setTimeout(() => {
            finishPlayerTurn();
        }, 500);
    }
}


hitBtn.addEventListener("click", () => {
    requestMath("hit");
});


standBtn.addEventListener("click", () => {
    requestMath("stand");
});


function requestMath(action) {

    if (gameOver) {
        return;
    }

    pendingAction = action;

    generateMathProblem();

    mathModal.classList.add("active");

    mathAnswerInput.value = "";
    mathFeedback.textContent = "";

    setTimeout(() => {
        mathAnswerInput.focus();
    }, 50);
}


function generateMathProblem() {

    let a;
    let b;
    let op;

    const difficulty = selectedDifficulty;


    if (difficulty === "facil") {

        a = randomInt(2, 15);
        b = randomInt(2, 15);

        op = Math.random() < 0.5
            ? "+"
            : "-";

    } else if (difficulty === "medio") {

        a = randomInt(5, 30);
        b = randomInt(2, 20);

        op = ["+", "-", "×"]
            [randomInt(0, 2)];

    } else {

        a = randomInt(8, 50);
        b = randomInt(2, 30);

        op = ["+", "-", "×"]
            [randomInt(0, 2)];
    }


    if (op === "-" && b > a) {
        [a, b] = [b, a];
    }


    if (op === "+") {
        mathAnswer = a + b;
    }

    if (op === "-") {
        mathAnswer = a - b;
    }

    if (op === "×") {
        mathAnswer = a * b;
    }


    mathQuestion.textContent =
        `${a} ${op} ${b} = ?`;
}


mathSubmit.addEventListener("click", checkMath);


mathAnswerInput.addEventListener("keydown", event => {

    if (event.key === "Enter") {
        checkMath();
    }
});


function checkMath() {

    const answer =
        Number(mathAnswerInput.value);


    if (answer === mathAnswer) {

        mathFeedback.textContent =
            "✓ Correcto";

        mathFeedback.style.color =
            "var(--green)";


        setTimeout(() => {

            mathModal.classList.remove("active");

            executeAction(pendingAction);

        }, 450);


    } else {

        mathFeedback.textContent =
            "✗ Incorrecto. Inténtalo de nuevo.";

        mathFeedback.style.color =
            "var(--red)";

        mathAnswerInput.value = "";

        generateMathProblem();

        mathAnswerInput.focus();
    }
}


function executeAction(action) {

    if (action === "hit") {

        drawCard(playerHand);

        renderCards();


        const score =
            calculateScore(playerHand);


        if (score > 21) {

            finishGame(
                false,
                "Te pasaste de 21."
            );

        } else if (score === 21) {

            finishPlayerTurn();

        } else {

            message.textContent =
                "Carta recibida. ¿Qué quieres hacer ahora?";
        }
    }


    if (action === "stand") {

        finishPlayerTurn();
    }
}


function finishPlayerTurn() {

    if (gameOver) {
        return;
    }


    gameOver = true;

    hitBtn.disabled = true;
    standBtn.disabled = true;


    while (calculateScore(dealerHand) < 17) {

        drawCard(dealerHand);
    }


    renderCards();


    const player =
        calculateScore(playerHand);

    const dealer =
        calculateScore(dealerHand);


    setTimeout(() => {

        if (player > 21) {

            finishGame(
                false,
                "Te pasaste de 21."
            );

        } else if (
            dealer > 21 ||
            player > dealer
        ) {

            finishGame(
                true,
                "Tu mano fue mejor que la del dealer."
            );

        } else if (player === dealer) {

            finishGame(
                false,
                "Empate. El dealer tuvo la misma puntuación."
            );

        } else {

            finishGame(
                false,
                "El dealer tuvo una mano superior."
            );
        }

    }, 700);
}


function finishGame(won, reason) {

    gameOver = true;

    hitBtn.disabled = true;
    standBtn.disabled = true;


    const player =
        calculateScore(playerHand);

    const dealer =
        calculateScore(dealerHand);


    resultTitle.textContent = won
        ? `Felicidades, has vencido la dificultad ${capitalize(selectedDifficulty)}`
        : "Has perdido";


    resultText.textContent =
        `${reason} El dealer sacó ${dealer}. Tú sacaste ${player}.`;


    if (won) {

        if (selectedDifficulty === "facil") {

            rewardBox.textContent =
                "Recompensa: Ninguna";

            rewardBox.style.display =
                "block";


        } else if (selectedDifficulty === "medio") {

            const reward =
                randomInt(1, 2);

            rewardBox.textContent =
                `Recompensa: x${reward} Dulces`;

            rewardBox.style.display =
                "block";


        } else {

            rewardBox.style.display =
                "none";

            showScreen(result);


            setTimeout(() => {
                openCrate();
            }, 900);

            return;
        }


    } else {

        rewardBox.textContent =
            "Recompensa: Ninguna";

        rewardBox.style.display =
            "block";
    }


    showScreen(result);
}


function openCrate() {

    crateModal.classList.add("active");


    const roulette =
        document.getElementById("roulette");

    const crateResult =
        document.getElementById("crateResult");


    roulette.innerHTML = "";
    crateResult.textContent = "";


    const finalPrize =
        randomInt(1, 4);


    const sequence = [];


    for (let i = 0; i < 30; i++) {

        sequence.push(
            randomInt(1, 4)
        );
    }


    sequence.push(finalPrize);


    sequence.forEach(number => {

        const item =
            document.createElement("div");

        item.className = "skin";

        item.textContent = number;

        roulette.appendChild(item);
    });


    roulette.style.transition = "none";
    roulette.style.transform =
        "translateX(0)";


    requestAnimationFrame(() => {

        const itemWidth = 140;

        const targetOffset =
            -(sequence.length - 1) * itemWidth + 180;


        roulette.style.transition =
            "transform 5s cubic-bezier(.08,.75,.15,1)";

        roulette.style.transform =
            `translateX(${targetOffset}px)`;
    });


    setTimeout(() => {

        crateResult.textContent =
            `¡Obtuviste la recompensa ${finalPrize}!`;


        setTimeout(() => {

            crateModal.classList.remove("active");


            resultTitle.textContent =
                "Felicidades, has vencido la dificultad Difícil";


            resultText.textContent =
                "Completaste la apertura de recompensa.";


            rewardBox.style.display =
                "block";


            rewardBox.textContent =
                `Recompensa: x${finalPrize} Décimas`;

        }, 1800);

    }, 5200);
}


function randomInt(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}


function capitalize(text) {

    return text.charAt(0).toUpperCase()
        + text.slice(1);
}
