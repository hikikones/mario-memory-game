/////////////////////
// Global variables
/////////////////////
const gameTitle = "Mario Memory Game";
const imagesPath = "images/";
const imagesName = "card";
const imagesFiletype = ".png";
const minImageSize = "24px";
const maxImageSize = "80px";
const amountOfImages = 128; // Number of card images in folder, must be set manually
const audioPath = "audio/";

const flipAnimationTime = 800; // Milliseconds
const flipImageSwapTime = 0.3 * flipAnimationTime;

var players;
var playerTurn = 0;
var cards;
var flipCounter;
var jukebox;
var timer;

/////////////////////
// Prototypes
/////////////////////
function Player(name) {
    this.name = name;
    this.score = 0;
    this.hasBonusRound = false;
    this.element = $("<div></div>").addClass("player");
    this.nameElement = $("<h4></h4>").text(name + ": ").addClass("player-name").appendTo(this.element);
    this.scoreElement = $("<span></span>").text(this.score).addClass("score").appendTo(this.element);
    this.updateScore = function () {
        this.scoreElement.text(this.score);
    }
    this.increaseScore = function () {
        this.scoreElement.toggleClass("score-scale");
        this.score++;
        var root = this;
        setTimeout(function () {
            root.updateScore();
            root.scoreElement.toggleClass("score-scale");
            jukebox.playScoreSound();
        }, 200);
    }
    this.toggleBonusRound = function () {
        this.hasBonusRound = !this.hasBonusRound;
    }
    this.toggleHighlight = function () {
        this.element.toggleClass("player-highlight");
    }
}

function Card(imageName) {
    this.imageFront = imageName + imagesFiletype;
    this.imageBack = imagesPath + "card_back.png";
    this.isFlipped = false;
    this.element = $("<img />").attr("src", this.imageBack);
    this.flip = function () {
        if (this.isFlipped) return;

        // I experienced a lot of strange bugs if you flip cards too fast,
        // so I opted for just disabling it until card has been flipped halfways.
        disableCardFlipping();
        this.isFlipped = true;
        flipCounter.increaseCount();
        this.doFlip();
    }
    this.doFlip = function () {
        this.element.toggleClass("card-flip");
        var root = this;
        // Image choice is reversed, since 'isFlipped' flag is set before evaluation
        var image = root.isFlipped ? root.imageFront : root.imageBack;
        setTimeout(function () {
            root.element.attr("src", image);
            if (twoCardsHasBeenFlipped())
                checkForMatchingPair();
            else
                enableCardFlipping();
        }, flipImageSwapTime); // Swap image when it 'disappears'. Value is found experimentally.
    }
    this.remove = function () {
        this.element.off("click");
        this.element.animate({
            opacity: 0
        })
        cards.splice(cards.indexOf(this), 1);
    }
    this.element.css({
        "max-width": "100%",
        "max-height": "100%",
        "transition": "transform " + flipAnimationTime + "ms"
    });
}

function FlipCounter() {
    this.count = 0;
    this.element = $("<span></span>").text("Flips: " + this.count).addClass("flip-counter");
    this.increaseCount = function () {
        this.count++;
        this.element.text("Flips: " + this.count);
    }
}

function Jukebox() {
    this.music = new Audio(audioPath + "smb_overworld.mp3");
    this.scoreAudio = new Audio(audioPath + "smb_coin.wav");
    this.winnerAudio = new Audio(audioPath + "smb_stage_clear.wav");
    this.drawAudio = new Audio(audioPath + "smb_gameover.wav");
    this.playMusic = function () {
        this.music.play();
    }
    this.stopMusic = function () {
        this.music.pause();
    }
    this.playScoreSound = function () {
        this.scoreAudio.play();
    }
    this.playWinnerSound = function () {
        this.winnerAudio.play();
    }
    this.playDrawSound = function () {
        this.drawAudio.play();
    }
    this.music.volume = 0.5;
}

function Timer() {
    this.seconds = 0;
    this.minutes = 0;
    this.element = $("<span></span>").text("00:00").addClass("timer");
    this.interval;
    this.start = function () {
        var root = this;
        this.interval = setInterval(function () {
            root.seconds++;
            root.minutes = Math.floor(root.seconds / 60);
            root.element.text(root.getTime());
        }, 1000);
    }
    this.stop = function () {
        clearInterval(this.interval);
    }
    this.getTime = function () {
        var sec = this.seconds % 60;
        sec = sec < 10 ? "0" + sec : sec;
        var min = this.minutes < 10 ? "0" + this.minutes : this.minutes;
        return min + ":" + sec;
    }
}

/////////////////////
// Functions
/////////////////////
function startGame(player1Name, player2Name) {
    // Create players and display header (title, names and stats)
    createPlayers(player1Name, player2Name);
    displayHeader();

    // Create simple array containing numbers 0 to N-1 where N is 'amountOfImages' (128) in folder
    var imageIndexes = createImageIndexes();
    imageIndexes = shuffle(imageIndexes);

    // Create and display cards based on selected images and grid size
    var gridSize = $("#grid-size").val();
    createCards(imageIndexes, gridSize);
    cards = shuffle(cards);
    displayCards(gridSize);

    jukebox = new Jukebox();

    // Enable interactivity, music and highlight current player
    enableCardFlipping();
    getCurrentPlayer().toggleHighlight();
    jukebox.playMusic();
}

function createPlayers(player1Name, player2Name) {
    players = new Array(2);
    players[0] = new Player(player1Name);
    players[1] = new Player(player2Name);
}

function displayHeader() {
    var header = $("header");
    header.empty(); // Empty header in case rematch
    var title = $("<h1></h1>").text(gameTitle);
    title.appendTo(header);
    players[0].element.appendTo(header);
    players[0].element.css("float", "left");
    players[1].element.appendTo(header);
    players[1].element.css("float", "right");
    flipCounter = new FlipCounter();
    flipCounter.element.appendTo(header);
    timer = new Timer();
    timer.element.appendTo(header);
    timer.start();
    header.animate({
        opacity: 1
    })
}

function createImageIndexes() {
    var imageIndexes = new Array(amountOfImages);
    for (var i = 0; i < imageIndexes.length; i++) {
        imageIndexes[i] = i;
    }
    return imageIndexes;
}

function shuffle(array) {
    for (var currentIndex = array.length - 1; currentIndex > 0; currentIndex--) {
        newIndex = Math.floor(Math.random() * (currentIndex + 1));
        var temp = array[currentIndex];
        array[currentIndex] = array[newIndex];
        array[newIndex] = temp;
    }
    return array;
}

function createCards(imageIndexes, gridSize) {
    var amountOfUniqueCards = (gridSize * gridSize) / 2;
    cards = new Array(amountOfUniqueCards * 2);
    for (var i = 0; i < cards.length; i++) {
        cards[i] = new Card(imagesPath + imagesName + imageIndexes[i % amountOfUniqueCards]);
    }
}

function displayCards(gridSize) {
    var cardsWrapper = $(".cards-wrapper");
    cardsWrapper.empty();
    cardsWrapper.css("grid-template-columns",
        "repeat(" + gridSize + ", " + "minmax(" + minImageSize + ", " + maxImageSize + "))");
    cards.forEach(card => {
        card.element.appendTo(cardsWrapper);
    });
}

function checkForMatchingPair() {
    var flippedCards = getFlippedCards();
    if (flippedCards.length === 0) return;
    setTimeout(function () {
        if (isMatchingPair(flippedCards[0], flippedCards[1])) {
            removeMatchingCards(flippedCards);
            getCurrentPlayer().increaseScore();
            getCurrentPlayer().toggleBonusRound();
            if (noCardsRemaining()) {
                displayWinner();
            }
        } else {
            flippedCards.forEach(card => {
                card.isFlipped = false;
                card.doFlip();
            });
            if (getCurrentPlayer().hasBonusRound)
                getCurrentPlayer().toggleBonusRound();
        }
        switchPlayerTurn();
        setTimeout(enableCardFlipping, flipImageSwapTime);
    }, flipAnimationTime - flipImageSwapTime);
}

function removeMatchingCards(matchingCards) {
    matchingCards.forEach(card => {
        card.remove();
    });
}

function displayWinner() {
    jukebox.stopMusic();
    timer.stop();
    var modal = $("#modal");
    $("#modal-title").text(determineWinner());
    $("#modal-message").text("Looking for a rematch?");
    modal.css("visibility", "visible");
    modal.animate({
        opacity: 1
    });
}

function determineWinner() {
    if (players[0].score > players[1].score) {
        jukebox.playWinnerSound();
        return players[0].name + " wins!";
    } else if (players[1].score > players[0].score) {
        jukebox.playWinnerSound();
        return players[1].name + " wins!";
    } else {
        jukebox.playDrawSound();
        return "It's a draw!";
    }
}

function switchPlayerTurn() {
    if (getCurrentPlayer().hasBonusRound) {
        // Do nothing
        return;
    }
    getCurrentPlayer().toggleHighlight();
    playerTurn++;
    getCurrentPlayer().toggleHighlight();
}

function enableCardFlipping() {
    cards.forEach(card => {
        card.element.on("click", function () {
            card.flip();
        });
    });
}

function disableCardFlipping() {
    cards.forEach(card => {
        card.element.off("click");
    });
}

function getCurrentPlayer() {
    return players[playerTurn % players.length];
}

function getFlippedCards() {
    return cards.filter(card => card.isFlipped);
}

function noCardsRemaining() {
    return cards.length === 0;
}

function isMatchingPair(card1, card2) {
    return card1.imageFront === card2.imageFront;
}

function twoCardsHasBeenFlipped() {
    if (flipCounter.count === 0) return false;
    else return flipCounter.count % players.length === 0;
}

function init() {
    var playButton = $("#play-button");
    playButton.on("click", function () {
        var player1Name = $("#player1").val();
        var player2Name = $("#player2").val();

        // Can't play game unless both name fields have been filled
        if (player1Name === "" || player2Name === "")
            return;

        // Disable play button immediately after clicked,
        // otherwise startGame() can be initiated multiple times while fading out
        playButton.attr("disabled", true);
        var modal = $("#modal");
        modal.animate({
            opacity: 0
        }, function () {
            modal.css("visibility", "hidden");
            startGame(player1Name, player2Name);
            // Enable button again after fade out so it works when modal window is displayed again
            playButton.attr("disabled", false);
        });
    });
}

$(document).ready(
    init()
);