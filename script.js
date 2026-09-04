let currentPage = 1;
let isLoading = false;
let currentList = [];

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

function renderPage(page) {
  return loadPage(page).then((pokemon) => {
    return preloadImages(pokemon).then(() => {
      document.body.classList.remove("is-search");
      setPaginationVisible(true);
      showMessage("");
      renderCards(pokemon);
    });
  });
}

function renderLoadError() {
  document.querySelector('[data-id="pokemon-list"]').innerHTML = "";
  showMessage(errorTemplate());
}

function buildTypeIcons(types) {
  return types.map((type) => typeIconTemplate(type)).join("");
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
  return renderPage(page)
    .catch(() => renderLoadError())
    .finally(() => finishPageChange());
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
    .catch(() => renderLoadError())
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
initDialog();
goToPage(getPageFromUrl(), false);
