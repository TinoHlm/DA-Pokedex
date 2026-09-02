function pokemonTypeTemplate(types) {
  return types
    .map((type) => `<span class="type-badge">${type}</span>`)
    .join("");
}

function pokemonCardTemplate(pokemon, index) {
  return `
    <li class="pokemon-card">
      <button
        class="pokemon-card-button type-${pokemon.types[0]}"
        type="button"
        data-id="card"
        data-index="${index}"
        aria-label="Show details for ${pokemon.name}"
      >
        <span class="card-id">#${pokemon.id}</span>
        <img
          data-id="card-image"
          src="${pokemon.image}"
          alt="${pokemon.name}"
        />
        <span class="card-name">${pokemon.name}</span>
        <span class="card-types">
          ${pokemonTypeIconsTemplate(pokemon.types)}
        </span>
      </button>
    </li>
  `;
}

function typeIconTemplate(type) {
  return `
    <span class="type-icon type-${type}" title="${type}">
      <img src="./assets/icons/${type}.svg" alt="${type}" />
    </span>
  `;
}

function pokemonTypeIconsTemplate(types) {
  return types.map((type) => typeIconTemplate(type)).join("");
}

function dialogTemplate(pokemon) {
  return `
    ${dialogHeadTemplate(pokemon)}
    <div class="dialog-body">
      ${dialogTabsTemplate()}
      ${dialogAboutTemplate(pokemon)}
      ${dialogStatsTemplate(pokemon)}
      <div class="dialog-panel" data-panel="evolution" hidden></div>
    </div>
  `;
}

function dialogHeadTemplate(pokemon) {
  return `
    <div class="dialog-head type-${pokemon.types[0]}">
      <div class="dialog-head-text">
        <span class="dialog-id">#${String(pokemon.id).padStart(3, "0")}</span>
        <h2 class="dialog-name">${pokemon.name}</h2>
        <span class="dialog-types">
          ${pokemonTypeTemplate(pokemon.types)}
        </span>
      </div>
      <img
        class="dialog-image"
        data-id="dialog-image"
        src="${pokemon.image}"
        alt="${pokemon.name}"
      />
    </div>
  `;
}

function dialogTabsTemplate() {
  return `
    <div class="dialog-tabs">
      <button
        class="dialog-tab is-active"
        type="button"
        data-tab="about"
        aria-label="About"
      >
        About
      </button>
      <button
        class="dialog-tab"
        type="button"
        data-tab="stats"
        aria-label="Base stats"
      >
        Base Stats
      </button>
      <button
        class="dialog-tab"
        type="button"
        data-tab="evolution"
        aria-label="Evolution"
      >
        Evolution
      </button>
    </div>
  `;
}

function dialogAboutTemplate(pokemon) {
  return `
    <div class="dialog-panel" data-panel="about">
      <div class="dialog-row">
        <span>Height</span>
        <span>${pokemon.height} m</span>
      </div>
      <div class="dialog-row">
        <span>Weight</span>
        <span>${pokemon.weight} kg</span>
      </div>
      <div class="dialog-row">
        <span>Abilities</span>
        <span class="dialog-abilities">${pokemon.abilities.join(", ")}</span>
      </div>
    </div>
  `;
}

function dialogStatsTemplate(pokemon) {
  const rows = Object.entries(pokemon.stats)
    .map(([name, value]) => statRowTemplate(name, value))
    .join("");

  return `<div class="dialog-panel" data-panel="stats" hidden>${rows}</div>`;
}

function statRowTemplate(name, value) {
  const percent = Math.min(100, (value / 255) * 100);

  return `
    <div class="stat-row">
      <span class="stat-name">${name.replace("-", " ")}</span>
      <span class="stat-value">${value}</span>
      <span class="stat-bar">
        <span class="stat-fill" style="width: ${percent}%"></span>
      </span>
    </div>
  `;
}

function paginationTemplate(page, pages) {
  const prevDisabled = page <= 1 ? "disabled" : "";
  const nextDisabled = page >= pages ? "disabled" : "";

  return `
    <button
      type="button"
      class="page-button"
      aria-label="Previous page"
      data-page="${page - 1}"
      ${prevDisabled}
    >
      Previous
    </button>
    <span class="page-status">Page ${page} of ${pages}</span>
    <button
      type="button"
      class="page-button"
      aria-label="Next page"
      data-id="load-more-button"
      data-page="${page + 1}"
      ${nextDisabled}
    >
      Next
    </button>
  `;
}

function evolutionStatusTemplate(text) {
  return `<p class="evolution-status">${text}</p>`;
}

function evolutionStageTemplate(pokemon) {
  return `
    <div class="evolution-stage">
      <img
        class="evolution-stage-image"
        src="${pokemon.image}"
        alt="${pokemon.name}"
      />
      <span class="evolution-stage-name">${pokemon.name}</span>
      <span class="evolution-stage-id">
        #${String(pokemon.id).padStart(3, "0")}
      </span>
    </div>
  `;
}

function evolutionLevelTemplate(level) {
  const stages = level.map((pokemon) => evolutionStageTemplate(pokemon));

  return `<div class="evolution-level">${stages.join("")}</div>`;
}

function evolutionChainTemplate(levels) {
  const arrow = `<span class="evolution-arrow" aria-hidden="true">&gt;</span>`;
  const parts = levels.map((level) => evolutionLevelTemplate(level));
  const isBranching = levels.some((level) => level.length > 1);
  const layout = isBranching ? "is-branching" : "is-linear";

  return `<div class="evolution-chain ${layout}">${parts.join(arrow)}</div>`;
}

function notFoundTemplate() {
  return `
    <div class="not-found">
      <img
        class="not-found-image"
        src="./assets/imgs/unknown-pokemon.png"
        alt=""
      />
      <div>
        <p class="not-found-title" data-id="not-found">No match found.</p>
        <p class="not-found-hint">Try another name.</p>
      </div>
    </div>
  `;
}
