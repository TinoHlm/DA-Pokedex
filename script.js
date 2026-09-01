const apiBaseUrl = "https://pokeapi.co/api/v2/pokemon";
const pageSize = 20; // Number of Pokemon per page
const placeholderImage = "./assets/imgs/unknown-pokemon.png"; // Image when the Pokemon doesnt have an Image Linked

let totalPages = 0; // Number of available pages (set after first fetch)
let currentPage = 1; // Current page
let bufferSize = 0; // Number of preloaded page per direction
let isLoading = false; // Blocks further page loads while one is running

const pageCache = new Map(); // Caches pages that have been already loaded

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

function toCardModel(details) {
  return {
    id: details.id,
    name: details.name,
    types: details.types.map((entry) => entry.type.name),
    image: getPokemonImage(details),
  };
}

function renderPage(page) {
  return fetchPageDetails(page).then((details) => {
    const cards = details.map((detail) =>
      pokemonCardTemplate(toCardModel(detail)),
    );
    const listElement = document.querySelector('[data-id="pokemon-list"]');
    listElement.innerHTML = cards.join("");
  });
}

function renderPagination() {
  const paginationElement = document.querySelector('[data-id="pagination"]');
  paginationElement.innerHTML = paginationTemplate(currentPage, totalPages);
}

function goToPage(page) {
  if (page < 1) return;
  if (totalPages > 0 && page > totalPages) return;

  currentPage = page;
  return renderPage(page).then(() => {
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

window.addEventListener("popstate", () => {
  goToPage(getPageFromUrl(), false);
});

goToPage(getPageFromUrl(), false);