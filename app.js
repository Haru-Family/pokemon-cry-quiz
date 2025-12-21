const GEN1_MIN = 1;
const GEN1_MAX = 251;

const $btnNext = document.getElementById("btnNext");
const $btnReplay = document.getElementById("btnReplay");
const $status = document.getElementById("status");
const $choices = document.getElementById("choices");
const $reveal = document.getElementById("reveal");
const $pokeImg = document.getElementById("pokeImg");
const $pokeName = document.getElementById("pokeName");
const $resultBadge = document.getElementById("resultBadge");

let current = null;     // 현재 문제 정보
let wrongCount = 0;     // ❗ 오답 횟수(재도전용)

const nameCache = new Map();   // id -> 한글명
const imageCache = new Map();  // id -> 이미지 URL

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 🔊 울음소리 URL (OGG)
function cryUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
}

// 한글명 (species)
async function fetchKoName(id) {
  if (nameCache.has(id)) return nameCache.get(id);

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  const data = await res.json();

  const ko = data.names?.find(n => n.language?.name === "ko")?.name;
  const name = ko || data.name || `#${id}`;

  nameCache.set(id, name);
  return name;
}

// 이미지 (official artwork)
async function fetchImage(id) {
  if (imageCache.has(id)) return imageCache.get(id);

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  const data = await res.json();

  const img =
    data.sprites?.other?.["official-artwork"]?.front_default ||
    data.sprites?.front_default ||
    "";

  imageCache.set(id, img);
  return img;
}

function setStatus(msg) {
  $status.textContent = msg;
}

function clearChoices() {
  $choices.innerHTML = "";
}

function hideReveal() {
  $reveal.classList.add("hidden");
  $pokeImg.src = "";
  $pokeName.textContent = "";
}

function showReveal(nameKo, imageUrl, correct) {
  $resultBadge.textContent = correct ? "정답! 🎉" : "정답은 이 친구예요 🙂";
  $reveal.classList.remove("hidden");
  $pokeName.textContent = nameKo;
  $pokeImg.src = imageUrl;
}

function disableChoiceButtons(disabled) {
  [...$choices.querySelectorAll("button")].forEach(b => (b.disabled = disabled));
}

async function playCry() {
  if (!current?.cryAudio) return;
  try {
    current.cryAudio.currentTime = 0;
    await current.cryAudio.play();
  } catch {
    setStatus("🔊 소리를 재생할 수 없어요. 다시 듣기를 눌러주세요.");
  }
}

function setButtonsForQuestion() {
  $btnNext.textContent = "다음 문제";
  $btnReplay.disabled = false;
}

// 🧠 새 문제 생성
async function newQuestion() {
  wrongCount = 0; // ❗ 재도전 횟수 초기화
  hideReveal();
  clearChoices();
  disableChoiceButtons(false);
  setStatus("문제 준비 중...");

  // 랜덤 3마리 (1~151)
  const ids = new Set();
  while (ids.size < 3) ids.add(randInt(GEN1_MIN, GEN1_MAX));
  const idList = [...ids];

  const answerId = idList[randInt(0, 2)];

  const options = await Promise.all(
    idList.map(async (id) => {
      const [nameKo, image] = await Promise.all([
        fetchKoName(id),
        fetchImage(id)
      ]);
      return { id, nameKo, image };
    })
  );

  const audio = new Audio(cryUrl(answerId));
  audio.preload = "auto";

  current = {
    answerId,
    options: shuffle(options),
    cryAudio: audio,
  };

  // 버튼 생성
  for (const opt of current.options) {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = opt.nameKo;
    btn.addEventListener("click", () => onChoose(opt.id, btn));
    $choices.appendChild(btn);
  }

  setButtonsForQuestion();
  setStatus("🔊 울음소리를 듣고 맞는 포켓몬을 골라보세요!");
  await playCry();
}

// 🎯 선택 처리 (재도전 1회)
function onChoose(chosenId, clickedBtn) {
  if (!current) return;

  const answer = current.options.find(o => o.id === current.answerId);
  if (!answer) return;

  // ✅ 정답
  if (chosenId === current.answerId) {
    disableChoiceButtons(true);
    setStatus("정답이에요! 포켓몬 등장! ✨");
    showReveal(answer.nameKo, answer.image, true);
    return;
  }

  // ❌ 오답
  wrongCount += 1;
  clickedBtn.disabled = true; // 같은 선택 반복 방지

  if (wrongCount === 1) {
    setStatus("아쉬워요! 한 번 더 골라볼까요? 🙂");
    playCry(); // 다시 울음소리
    return;
  }

  // ❌❌ 두 번째 오답 → 정답 공개
  disableChoiceButtons(true);
  setStatus("이번엔 정답을 보여줄게요 🙂");
  showReveal(answer.nameKo, answer.image, false);
}

// 이벤트 바인딩
$btnNext.addEventListener("click", newQuestion);
$btnReplay.addEventListener("click", playCry);

// 초기 상태
setStatus("시작하기를 눌러주세요.");
