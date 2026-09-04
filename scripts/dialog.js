let currentIndex = 0;
let isDialogBusy = false;

function getStatPercent(value) {
  return Math.min(100, (value / 255) * 100);
}

function buildStatRows(stats) {
  return Object.entries(stats)
    .map(([name, value]) =>
      statRowTemplate(name.replace("-", " "), value, getStatPercent(value)),
    )
    .join("");
}

function buildTypeBadges(types) {
  return types.map((type) => typeBadgeTemplate(type)).join("");
}

function renderDialog() {
  const pokemon = currentList[currentIndex];
  const content = document.querySelector('[data-id="overlay-pokemon-name"]');
  const typeBadges = buildTypeBadges(pokemon.types);
  const statRows = buildStatRows(pokemon.stats);

  content.innerHTML = dialogTemplate(pokemon, typeBadges, statRows);
  updateDialogNav();
}

function openDialog(index) {
  currentIndex = index;
  renderDialog();
  document.querySelector('[data-id="dialog"]').showModal();
}

function closeDialog() {
  document.querySelector('[data-id="dialog"]').close();
}

function isSearchMode() {
  return document.body.classList.contains("is-search");
}

function hasPreviousPokemon() {
  if (currentIndex > 0) return true;
  return !isSearchMode() && currentPage > 1;
}

function hasNextPokemon() {
  if (currentIndex < currentList.length - 1) return true;
  return !isSearchMode() && totalPages > 0 && currentPage < totalPages;
}

function updateDialogNav() {
  document.querySelector('[data-id="prev-button"]').disabled =
    !hasPreviousPokemon();
  document.querySelector('[data-id="next-button"]').disabled = !hasNextPokemon();
}

function setDialogBusy(state) {
  isDialogBusy = state;

  if (state) {
    document.querySelector('[data-id="prev-button"]').disabled = true;
    document.querySelector('[data-id="next-button"]').disabled = true;
    return;
  }

  updateDialogNav();
}

function applyDialogPage(page, pokemon, direction) {
  currentPage = page;
  history.replaceState({ page }, "", `?page=${page}`);
  renderCards(pokemon);
  currentIndex = direction > 0 ? 0 : currentList.length - 1;
  renderPagination();
  renderDialog();
}

function navigateDialogPage(direction) {
  const page = currentPage + direction;
  if (page < 1) return;
  if (totalPages > 0 && page > totalPages) return;

  setDialogBusy(true);

  return loadPage(page)
    .then((pokemon) => applyDialogPage(page, pokemon, direction))
    .catch(() => {})
    .finally(() => setDialogBusy(false));
}

function navigateDialog(direction) {
  if (isDialogBusy) return;

  const target = currentIndex + direction;

  if (target >= 0 && target < currentList.length) {
    currentIndex = target;
    renderDialog();
    return;
  }

  if (isSearchMode()) return;
  return navigateDialogPage(direction);
}

function initDialogNav() {
  document
    .querySelector('[data-id="prev-button"]')
    .addEventListener("click", () => navigateDialog(-1));

  document
    .querySelector('[data-id="next-button"]')
    .addEventListener("click", () => navigateDialog(1));
}

function initDialogKeys() {
  document.addEventListener("keydown", (event) => {
    if (!document.querySelector('[data-id="dialog"]').open) return;
    if (event.key === "ArrowLeft") navigateDialog(-1);
    if (event.key === "ArrowRight") navigateDialog(1);
  });
}

function initDialogClose() {
  const dialog = document.querySelector('[data-id="dialog"]');

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  document
    .querySelector('[data-id="close-dialog-button"]')
    .addEventListener("click", closeDialog);
}

function initDialog() {
  initDialogClose();
  initCardClicks();
  initDialogTabs();
  initDialogNav();
  initDialogKeys();
}

function initCardClicks() {
  const listElement = document.querySelector('[data-id="pokemon-list"]');

  listElement.addEventListener("click", (event) => {
    const card = event.target.closest('[data-id="card"]');
    if (!card) return;
    openDialog(Number(card.dataset.index));
  });
}

function showDialogTab(name) {
  const content = document.querySelector('[data-id="overlay-pokemon-name"]');

  content.querySelectorAll(".dialog-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === name);
  });

  content.querySelectorAll(".dialog-panel").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
  });

  if (name === "evolution") renderEvolution();
}

function buildEvolutionStages(level) {
  return level.map((pokemon) => evolutionStageTemplate(pokemon)).join("");
}

function buildEvolutionChain(levels) {
  const parts = levels.map((level) =>
    evolutionLevelTemplate(buildEvolutionStages(level)),
  );
  const isBranching = levels.some((level) => level.length > 1);
  const layout = isBranching ? "is-branching" : "is-linear";

  return evolutionChainTemplate(parts.join(evolutionArrowTemplate()), layout);
}

function showEvolution(panel, levels) {
  panel.innerHTML = buildEvolutionChain(levels);
}

function renderEvolution() {
  const panel = document.querySelector('[data-panel="evolution"]');
  if (panel.dataset.loaded) return;

  panel.dataset.loaded = "yes";
  panel.innerHTML = evolutionStatusTemplate("Loading evolution chain...");

  return fetchEvolutionChain(currentList[currentIndex].speciesUrl)
    .then((levels) => Promise.all(levels.map(loadEvolutionStages)))
    .then((levels) => showEvolution(panel, levels))
    .catch(() => {
      panel.innerHTML = evolutionStatusTemplate("Evolution chain unavailable.");
    });
}

function initDialogTabs() {
  const content = document.querySelector('[data-id="overlay-pokemon-name"]');

  content.addEventListener("click", (event) => {
    const tab = event.target.closest(".dialog-tab");
    if (!tab) return;
    showDialogTab(tab.dataset.tab);
  });
}
