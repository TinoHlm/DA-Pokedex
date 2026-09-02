function pokemonTypeTemplate(types) {
  return types
    .map((type) => `<span class="type-badge">${type}</span>`)
    .join("");
}

function pokemonCardTemplate(pokemon) {
  return `
    <li class="pokemon-card">
      <button class="pokemon-card-button type-${pokemon.types[0]}" type="button" data-id="card" aria-label="Show details for ${pokemon.name}">
        <span class="card-id">#${pokemon.id}</span>
        <img data-id="card-image" src="${pokemon.image}" alt="${pokemon.name}" />
        <span class="card-name">${pokemon.name}</span>
        <span class="card-types">${pokemonTypeTemplate(pokemon.types)}</span>
      </button>
    </li>
  `;
}

function paginationTemplate(page, pages) {
  const prevDisabled = page <= 1 ? "disabled" : "";
  const nextDisabled = page >= pages ? "disabled" : "";

  return `
    <button type="button" class="page-button" aria-label="Previous page" data-page="${page - 1}" ${prevDisabled}>Previous</button>
    <span class="page-status">Page ${page} of ${pages}</span>
    <button type="button" class="page-button" aria-label="Next page" data-id="load-more-button" data-page="${page + 1}" ${nextDisabled}>Next</button>
  `;
}

function notFoundTemplate() {
  return `
    <div class="not-found">
      <img class="not-found-image" src="./assets/imgs/unknown-pokemon.png" alt="" />
      <div>
        <p class="not-found-title" data-id="not-found">No match found.</p>
        <p class="not-found-hint">Try another name.</p>
      </div>
    </div>
  `;
}