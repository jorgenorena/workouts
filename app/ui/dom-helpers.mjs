export function createButton(label, options = {}) {
  const button = document.createElement("button");
  button.type = options.type ?? "button";
  button.className = options.className ?? "button button-secondary";
  button.textContent = label;
  button.disabled = options.disabled === true;

  if (typeof options.onClick === "function") {
    button.addEventListener("click", options.onClick);
  }

  return button;
}

export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text) {
    element.textContent = options.text;
  }

  if (options.html) {
    element.innerHTML = options.html;
  }

  if (options.attributes) {
    for (const [name, value] of Object.entries(options.attributes)) {
      element.setAttribute(name, value);
    }
  }

  return element;
}

export function createStatusBanner(message, tone) {
  return createElement("p", {
    className: `status-banner status-${tone}`,
    text: message,
  });
}

export function createMetricGrid(entries) {
  const grid = createElement("dl", { className: "summary-grid" });

  for (const [label, value] of entries) {
    const card = createElement("div", { className: "metric-card" });
    const term = createElement("dt", { text: label });
    const description = createElement("dd", { text: value });

    card.append(term, description);
    grid.append(card);
  }

  return grid;
}
