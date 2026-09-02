const apiBaseUrl = "https://pokeapi.co/api/v2/pokemon";
const pageSize = 20; // Number of Pokemon per page
const placeholderImage = "./assets/imgs/unknown-pokemon.png"; // Image when the Pokemon doesnt have an Image Linked

let totalPages = 0; // Number of available pages (set after first fetch)
let currentPage = 1; // Current page
let isLoading = false; // Blocks further page loads while one is running
let allPokemonNames = null; // Cached name list for the search

const pageCache = new Map(); // Caches pages that have been already loaded
const pokemonCache = new Map(); // Caches single Pokemon models by url
const searchLimit = 30; // Maximum number of search results to load

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

function toCardModel(details) {
  return {
    id: details.id,
    name: details.name,
    types: details.types.map((entry) => entry.type.name),
    image: getPokemonImage(details),
  };
}

function loadPage(page) {
  if (pageCache.has(page)) return Promise.resolve(pageCache.get(page));

  return fetchPageDetails(page).then((details) => {
    const pokemon = details.map((detail) => toCardModel(detail));
    pageCache.set(page, pokemon);
    return pokemon;
  });
}

function loadPokemon(pokemon) {
  if (pokemonCache.has(pokemon.url)) {
    return Promise.resolve(pokemonCache.get(pokemon.url));
  }

  return fetchPokemonDetails(pokemon).then((details) => {
    const model = toCardModel(details);
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

function renderCards(pokemon) {
  const cards = pokemon.map((entry) => pokemonCardTemplate(entry));
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
  paginationElement.innerHTML = paginationTemplate(currentPage, totalPages);
}

function goToPage(page, pushUrl = true) {
  if (isLoading) return;
  if (page < 1) return;
  if (totalPages > 0 && page > totalPages) return;

  currentPage = page;
  if (pushUrl) history.pushState({ page }, "", `?page=${page}`);

  setLoading(true);
  return renderPage(page).finally(() => {
    setLoading(false);
    renderPagination();
  });
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
  setPaginationVisible(true);
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

window.addEventListener("popstate", () => {
  goToPage(getPageFromUrl(), false);
});

initPagination();
initSearch();
goToPage(getPageFromUrl(), false);
