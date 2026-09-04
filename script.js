const apiBaseUrl = "https://pokeapi.co/api/v2/pokemon";
const pageSize = 20;
const placeholderImage = "./assets/imgs/unknown-pokemon.png";

let totalPages = 0;
let currentPage = 1;
let isLoading = false;
let allPokemonNames = null;
let currentList = [];
let currentIndex = 0;
let isDialogBusy = false;

const pageCache = new Map();
const pokemonCache = new Map();
const evolutionCache = new Map();
const searchLimit = 30;

function getPageOffset(page) {
  return (page - 1) * pageSize;
}

function getPageUrl(page) {
  const offset = getPageOffset(page);
  return `${apiBaseUrl}?offset=${offset}&limit=${pageSize}`;
}

function fetchPokemonPage(page) {
  const pageUrl = getPageUrl(page);

  return fetch(pageUrl).then((response) => {
    return response.json();
  });
}

function fetchPokemonDetails(pokemon) {
  const pokemonDetailsUrl = pokemon.url;

  return fetch(pokemonDetailsUrl).then((response) => {
    return response.json();
  });
}

function fetchPageDetails(page) {
  return fetchPokemonPage(page).then((pageData) => {
    totalPages = Math.ceil(pageData.count / pageSize);
    const detailPromises = pageData.results.map((pokemon) =>
      fetchPokemonDetails(pokemon),
    );
    return Promise.all(detailPromises);
  });
}

function fetchAllPokemonNames() {
  if (allPokemonNames) return Promise.resolve(allPokemonNames);

  return fetch(`${apiBaseUrl}?limit=100000&offset=0`)
    .then((response) => response.json())
    .then((pageData) => {
      allPokemonNames = pageData.results;
      return allPokemonNames;
    });
}

function findPokemonByName(term) {
  const cleanTerm = term.trim().toLowerCase();

  return fetchAllPokemonNames().then((names) => {
    return names
      .filter((entry) => entry.name.includes(cleanTerm))
      .slice(0, searchLimit);
  });
}

function getPokemonImage(details) {
  const sprites = details.sprites;
  const sources = [
    sprites.other?.["official-artwork"]?.front_default,
    sprites.other?.home?.front_default,
    sprites.front_default,
    sprites.versions?.["generation-ix"]?.["scarlet-violet"]?.front_default,
  ];

  return sources.find((url) => url) ?? placeholderImage;
}

function preloadImages(pokemon) {
  const loads = pokemon.map((entry) => {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = resolve;
      setTimeout(resolve, 5000);
      image.src = entry.image;
    });
  });

  return Promise.all(loads);
}

function toStatsModel(stats) {
  const result = {};

  stats.forEach((entry) => {
    result[entry.stat.name] = entry.base_stat;
  });

  return result;
}

function toPokemonModel(details) {
  return {
    id: details.id,
    name: details.name,
    types: details.types.map((entry) => entry.type.name),
    image: getPokemonImage(details),
    height: details.height / 10,
    weight: details.weight / 10,
    abilities: details.abilities.map((entry) => entry.ability.name).join(", "),
    stats: toStatsModel(details.stats),
    speciesUrl: details.species.url,
  };
}

function loadPage(page) {
  if (pageCache.has(page)) return Promise.resolve(pageCache.get(page));

  return fetchPageDetails(page).then((details) => {
    const pokemon = details.map((detail) => toPokemonModel(detail));
    pageCache.set(page, pokemon);
    return pokemon;
  });
}

function loadPokemon(pokemon) {
  if (pokemonCache.has(pokemon.url)) {
    return Promise.resolve(pokemonCache.get(pokemon.url));
  }

  return fetchPokemonDetails(pokemon).then((details) => {
    const model = toPokemonModel(details);
    pokemonCache.set(pokemon.url, model);
    return model;
  });
}

function renderPage(page) {
  return loadPage(page).then((pokemon) => {
    return preloadImages(pokemon).then(() => {
      document.body.classList.remove("is-search");
      setPaginationVisible(true);
      renderCards(pokemon);
    });
  });
}

function buildTypeIcons(types) {
  return types.map((type) => typeIconTemplate(type)).join("");
}

function buildTypeBadges(types) {
  return types.map((type) => typeBadgeTemplate(type)).join("");
}

function renderCards(pokemon) {
  currentList = pokemon;
  const cards = pokemon.map((entry, index) =>
    pokemonCardTemplate(entry, index, buildTypeIcons(entry.types)),
  );
  document.querySelector('[data-id="pokemon-list"]').innerHTML = cards.join("");
}

function renderNotFound() {
  document.querySelector('[data-id="pokemon-list"]').innerHTML = "";
  showMessage(notFoundTemplate());
  return Promise.resolve();
}

function renderSearchResults(matches) {
  document.body.classList.add("is-search");
  if (matches.length === 0) return renderNotFound();

  showMessage("");
  const loads = matches.map((pokemon) => loadPokemon(pokemon));
  return Promise.all(loads).then((pokemon) => renderCards(pokemon));
}

function setSearchHint(visible) {
  document.querySelector('[data-id="search-hint"]').hidden = !visible;
}

function renderPagination() {
  const paginationElement = document.querySelector('[data-id="pagination"]');
  const prevDisabled = currentPage <= 1 ? "disabled" : "";
  const nextDisabled = currentPage >= totalPages ? "disabled" : "";

  paginationElement.innerHTML = paginationTemplate(
    currentPage,
    totalPages,
    prevDisabled,
    nextDisabled,
  );
}

function goToPage(page, pushUrl = true) {
  if (isLoading) return;
  if (page < 1) return;
  if (totalPages > 0 && page > totalPages) return;

  currentPage = page;
  if (pushUrl) history.pushState({ page }, "", `?page=${page}`);

  setLoading(true);
  return renderPage(page).finally(() => finishPageChange());
}

function finishPageChange() {
  setLoading(false);
  renderPagination();
  window.scrollTo(0, 0);
}

function initPagination() {
  const paginationElement = document.querySelector('[data-id="pagination"]');

  paginationElement.addEventListener("click", (event) => {
    const button = event.target.closest(".page-button");
    if (!button) return;
    goToPage(Number(button.dataset.page));
  });
}

function getPageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get("page"));

  if (page > 0) return page;
  return 1;
}

function setLoading(state) {
  isLoading = state;
  const pagination = document.querySelector('[data-id="pagination"]');

  document.querySelector('[data-id="loader"]').hidden = !state;
  pagination.classList.toggle("is-loading", state);
  pagination.querySelectorAll(".page-button").forEach((button) => {
    button.disabled = state;
  });
}

function showMessage(html) {
  document.querySelector('[data-id="message"]').innerHTML = html;
}

function setPaginationVisible(visible) {
  document.querySelector('[data-id="pagination"]').hidden = !visible;
}

function showPokemonList() {
  showMessage("");
  return goToPage(currentPage, false);
}

function runSearch() {
  if (isLoading) return;
  const term = document.querySelector('[data-id="search-input"]').value.trim();
  if (term.length < 3) return setSearchHint(true);

  setSearchHint(false);
  setLoading(true);
  setPaginationVisible(false);

  return findPokemonByName(term)
    .then((matches) => renderSearchResults(matches))
    .finally(() => setLoading(false));
}

function initSearch() {
  const button = document.querySelector('[data-id="search-button"]');

  button.addEventListener("click", runSearch);
  initSearchInput();
}

function initSearchInput() {
  const input = document.querySelector('[data-id="search-input"]');

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runSearch();
  });

  input.addEventListener("input", () => {
    setSearchHint(false);
    if (input.value.trim().length === 0) showPokemonList();
  });
}

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

function idFromUrl(url) {
  return Number(url.split("/").filter(Boolean).pop());
}

function getEvolutionLevels(chain) {
  const levels = [];
  let current = [chain];

  while (current.length > 0) {
    levels.push(current.map((node) => node.species.url));
    current = current.flatMap((node) => node.evolves_to);
  }

  return levels;
}

function fetchChainData(speciesUrl) {
  return fetch(speciesUrl)
    .then((response) => response.json())
    .then((species) => fetch(species.evolution_chain.url))
    .then((response) => response.json());
}

function fetchEvolutionChain(speciesUrl) {
  if (evolutionCache.has(speciesUrl)) {
    return Promise.resolve(evolutionCache.get(speciesUrl));
  }

  return fetchChainData(speciesUrl).then((data) => {
    const levels = getEvolutionLevels(data.chain);
    evolutionCache.set(speciesUrl, levels);
    return levels;
  });
}

function loadEvolutionStages(speciesUrls) {
  const loads = speciesUrls.map((url) =>
    loadPokemon({ url: `${apiBaseUrl}/${idFromUrl(url)}/` }),
  );

  return Promise.all(loads);
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

window.addEventListener("popstate", () => {
  goToPage(getPageFromUrl(), false);
});

initPagination();
initSearch();
initDialog();
goToPage(getPageFromUrl(), false);
