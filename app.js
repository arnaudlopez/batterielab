const ids = [
  "series",
  "parallel",
  "cellPreset",
  "cellAh",
  "cellLayout",
  "cellDiameter",
  "cellHeight",
  "spacing",
  "casePadding",
  "bmsEnabled",
  "bmsPosition",
  "bmsMount",
  "bmsRotation",
  "bmsThickness",
  "bmsLength",
  "bmsWidth",
  "caseLength",
  "caseWidth",
  "caseHeight",
  "cellCost",
  "bmsCost",
  "hardwareCost",
  "hourlyRate",
  "laborHours",
  "markup",
];

const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

const outputs = Object.fromEntries(
  [
    "metricArchitecture",
    "metricCells",
    "metricVoltage",
    "metricEnergy",
    "metricCost",
    "metricGain",
    "topScale",
    "sideDimensions",
    "widthDimensions",
    "packDims",
    "caseDims",
    "clearance",
    "fitStatus",
    "cellsSubtotal",
    "laborSubtotal",
    "totalCost",
    "salePrice",
  ].map((id) => [id, document.getElementById(id)]),
);

const svgs = {
  top: document.getElementById("topView"),
  side: document.getElementById("sideView"),
  width: document.getElementById("widthView"),
};

const presets = {
  "18650": { diameter: 18.4, height: 65, ah: 3.2 },
  "21700": { diameter: 21.2, height: 70, ah: 5 },
};

const initialState = readState();

function num(input, fallback = 0) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function money(value) {
  return `${Math.round(value).toLocaleString("fr-FR")} EUR`;
}

function fixed(value, digits = 1) {
  return Number(value).toLocaleString("fr-FR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: value % 1 === 0 ? 0 : digits,
  });
}

function readState() {
  return {
    series: Math.max(1, Math.round(num(el.series, 13))),
    parallel: Math.max(1, Math.round(num(el.parallel, 8))),
    cellPreset: el.cellPreset.value,
    cellAh: Math.max(0.1, num(el.cellAh, 5)),
    cellLayout: el.cellLayout.value,
    cellDiameter: Math.max(1, num(el.cellDiameter, 21.2)),
    cellHeight: Math.max(1, num(el.cellHeight, 70)),
    spacing: Math.max(0, num(el.spacing, 1.8)),
    casePadding: Math.max(0, num(el.casePadding, 6)),
    bmsEnabled: el.bmsEnabled.checked,
    bmsPosition: el.bmsPosition.value,
    bmsMount: el.bmsMount.value,
    bmsRotation: el.bmsRotation.value,
    bmsThickness: Math.max(0, num(el.bmsThickness, 10)),
    bmsLength: Math.max(1, num(el.bmsLength, 120)),
    bmsWidth: Math.max(1, num(el.bmsWidth, 55)),
    caseLength: Math.max(1, num(el.caseLength, 330)),
    caseWidth: Math.max(1, num(el.caseWidth, 270)),
    caseHeight: Math.max(1, num(el.caseHeight, 95)),
    cellCost: Math.max(0, num(el.cellCost, 4.2)),
    bmsCost: Math.max(0, num(el.bmsCost, 65)),
    hardwareCost: Math.max(0, num(el.hardwareCost, 45)),
    hourlyRate: Math.max(0, num(el.hourlyRate, 45)),
    laborHours: Math.max(0, num(el.laborHours, 3.5)),
    markup: Math.max(0, num(el.markup, 30)),
  };
}

function bmsGeometry(state) {
  const baseLength = state.bmsLength;
  const baseWidth = state.bmsMount === "edge" ? state.bmsThickness : state.bmsWidth;
  const height = state.bmsMount === "edge" ? state.bmsWidth : state.bmsThickness;
  const rotated = state.bmsRotation === "90";

  return {
    footprintLength: rotated ? baseWidth : baseLength,
    footprintWidth: rotated ? baseLength : baseWidth,
    height,
    label: "BMS",
  };
}

function derive(state) {
  const cellPitch = state.cellDiameter + state.spacing;
  const staggered = state.cellLayout === "staggered";
  const rowPitch = staggered ? cellPitch * Math.sqrt(3) / 2 : cellPitch;
  const rowOffset = staggered ? cellPitch / 2 : 0;
  const maxRowOffset = state.parallel > 1 ? rowOffset : 0;
  const cellBlockLength = state.series * state.cellDiameter + Math.max(0, state.series - 1) * state.spacing + maxRowOffset;
  const cellBlockWidth = state.cellDiameter + Math.max(0, state.parallel - 1) * rowPitch;
  const pad = state.casePadding * 2;
  const bms = bmsGeometry(state);

  let packLength = cellBlockLength + pad;
  let packWidth = cellBlockWidth + pad;
  let packHeight = state.cellHeight + pad;

  if (state.bmsEnabled) {
    if (state.bmsPosition === "side") {
      packWidth += bms.footprintWidth + state.spacing;
      packLength = Math.max(packLength, bms.footprintLength + pad);
      packHeight = Math.max(packHeight, bms.height + pad);
    }
    if (state.bmsPosition === "top") {
      packHeight += bms.height + state.spacing;
      packLength = Math.max(packLength, bms.footprintLength + pad);
      packWidth = Math.max(packWidth, bms.footprintWidth + pad);
    }
    if (state.bmsPosition === "end") {
      packLength += bms.footprintLength + state.spacing;
      packWidth = Math.max(packWidth, bms.footprintWidth + pad);
      packHeight = Math.max(packHeight, bms.height + pad);
    }
  }

  const cellCount = state.series * state.parallel;
  const nominalVoltage = state.series * 3.6;
  const maxVoltage = state.series * 4.2;
  const capacityAh = state.parallel * state.cellAh;
  const energyWh = nominalVoltage * capacityAh;
  const cellsSubtotal = cellCount * state.cellCost;
  const laborSubtotal = state.hourlyRate * state.laborHours;
  const totalCost = cellsSubtotal + laborSubtotal + state.hardwareCost + (state.bmsEnabled ? state.bmsCost : 0);
  const salePrice = totalCost * (1 + state.markup / 100);
  const gain = salePrice - totalCost;

  const clearance = {
    length: state.caseLength - packLength,
    width: state.caseWidth - packWidth,
    height: state.caseHeight - packHeight,
  };
  const minClearance = Math.min(clearance.length, clearance.width, clearance.height);

  return {
    cellPitch,
    cellBlockLength,
    cellBlockWidth,
    cellCount,
    nominalVoltage,
    maxVoltage,
    capacityAh,
    energyWh,
    cellsSubtotal,
    laborSubtotal,
    totalCost,
    salePrice,
    gain,
    bms,
    staggered,
    packLength,
    packWidth,
    packHeight,
    rowPitch,
    rowOffset,
    maxRowOffset,
    clearance,
    minClearance,
  };
}

function svgEl(tag, attrs = {}, text = "") {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (text) node.textContent = text;
  return node;
}

function clearSvg(svg, width, height) {
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
}

function makeScaler(svg, modelWidth, modelHeight, margin = 28) {
  const box = svg.getBoundingClientRect();
  const width = Math.max(280, box.width || 800);
  const height = Math.max(220, box.height || 500);
  clearSvg(svg, width, height);
  const scale = Math.min((width - margin * 2) / modelWidth, (height - margin * 2) / modelHeight);
  const offsetX = (width - modelWidth * scale) / 2;
  const offsetY = (height - modelHeight * scale) / 2;
  return {
    width,
    height,
    scale,
    x: (value) => offsetX + value * scale,
    y: (value) => offsetY + value * scale,
    d: (value) => value * scale,
  };
}

function drawTop(state, data) {
  const modelWidth = Math.max(state.caseLength, data.packLength);
  const modelHeight = Math.max(state.caseWidth, data.packWidth);
  const s = makeScaler(svgs.top, modelWidth, modelHeight, 34);
  outputs.topScale.textContent = `1 px = ${fixed(1 / s.scale, 1)} mm`;

  svgs.top.append(
    svgEl("rect", {
      x: s.x((modelWidth - state.caseLength) / 2),
      y: s.y((modelHeight - state.caseWidth) / 2),
      width: s.d(state.caseLength),
      height: s.d(state.caseWidth),
      rx: 4,
      class: "case-outline",
    }),
  );

  const originX = (modelWidth - data.packLength) / 2 + state.casePadding;
  const originY = (modelHeight - data.packWidth) / 2 + state.casePadding;
  svgs.top.append(
    svgEl("rect", {
      x: s.x((modelWidth - data.packLength) / 2),
      y: s.y((modelHeight - data.packWidth) / 2),
      width: s.d(data.packLength),
      height: s.d(data.packWidth),
      rx: 4,
      class: "pack-shadow",
    }),
  );

  drawNickelAndCells(svgs.top, s, state, data, originX, originY, true);
  drawBmsTop(svgs.top, s, state, data, modelWidth, modelHeight, originX, originY);
  drawMainLeads(svgs.top, s, state, data, modelWidth, modelHeight, originX, originY);
}

function cellCenter(state, data, originX, originY, col, row) {
  const radius = state.cellDiameter / 2;
  return {
    x: originX + radius + col * data.cellPitch + (row % 2) * data.rowOffset,
    y: originY + radius + row * data.rowPitch,
  };
}

function drawNickelAndCells(svg, s, state, data, originX, originY, withLabels) {
  const radius = state.cellDiameter / 2;
  for (let col = 0; col < state.series; col += 1) {
    const points = [];
    for (let row = 0; row < state.parallel; row += 1) {
      points.push(cellCenter(state, data, originX, originY, col, row));
    }
    svg.append(
      svgEl("polyline", {
        points: points.map((point) => `${s.x(point.x)},${s.y(point.y)}`).join(" "),
        class: "nickel",
      }),
    );
  }

  for (let col = 0; col < state.series - 1; col += 1) {
    const row = col % 2 === 0 ? state.parallel - 1 : 0;
    const start = cellCenter(state, data, originX, originY, col, row);
    const end = cellCenter(state, data, originX, originY, col + 1, row);
    svg.append(
      svgEl("line", {
        x1: s.x(start.x),
        y1: s.y(start.y),
        x2: s.x(end.x),
        y2: s.y(end.y),
        class: "nickel",
      }),
    );
  }

  for (let col = 0; col < state.series; col += 1) {
    for (let row = 0; row < state.parallel; row += 1) {
      const { x, y } = cellCenter(state, data, originX, originY, col, row);
      const positive = (col + row) % 2 === 0;
      svg.append(
        svgEl("circle", {
          cx: s.x(x),
          cy: s.y(y),
          r: s.d(radius),
          fill: col % 2 === 0 ? "var(--cell-a)" : "var(--cell-b)",
          class: "cell-outline",
        }),
      );
      svg.append(
        svgEl("circle", {
          cx: s.x(x),
          cy: s.y(y),
          r: s.d(radius * 0.32),
          class: "cell-terminal",
        }),
      );
      svg.append(
        svgEl(
          "text",
          { x: s.x(x), y: s.y(y), class: "label-svg" },
          positive ? "+" : "-",
        ),
      );
    }
    if (withLabels) {
      const labelPoint = cellCenter(state, data, originX, originY, col, 0);
      svg.append(
        svgEl(
          "text",
          {
            x: s.x(labelPoint.x),
            y: s.y(originY - Math.max(5, state.spacing + 2)),
            class: "small-svg",
            "text-anchor": "middle",
          },
          `S${col + 1}`,
        ),
      );
    }
  }
}

function bmsRect(state, data, modelWidth, modelHeight) {
  const packX = (modelWidth - data.packLength) / 2;
  const packY = (modelHeight - data.packWidth) / 2;
  if (!state.bmsEnabled) return null;
  const bms = data.bms;

  if (state.bmsPosition === "side") {
    return {
      x: packX + state.casePadding,
      y: packY + state.casePadding + data.cellBlockWidth + state.spacing,
      w: Math.min(bms.footprintLength, data.cellBlockLength),
      h: bms.footprintWidth,
    };
  }

  if (state.bmsPosition === "end") {
    return {
      x: packX + state.casePadding + data.cellBlockLength + state.spacing,
      y: packY + state.casePadding,
      w: bms.footprintLength,
      h: Math.min(bms.footprintWidth, data.cellBlockWidth),
    };
  }

  return {
    x: packX + state.casePadding,
    y: packY + state.casePadding,
    w: Math.min(bms.footprintLength, data.cellBlockLength),
    h: Math.min(bms.footprintWidth, data.cellBlockWidth),
  };
}

function drawBmsLabel(svg, s, rect, label) {
  const cx = s.x(rect.x + rect.w / 2);
  const cy = s.y(rect.y + rect.h / 2);
  const attrs = { x: cx, y: cy, class: "label-svg bms-label" };
  if (rect.w < 24 && rect.h > rect.w * 1.8) {
    attrs.transform = `rotate(-90 ${cx} ${cy})`;
  }
  svg.append(svgEl("text", attrs, label));
}

function drawBmsTop(svg, s, state, data, modelWidth, modelHeight, originX, originY) {
  const rect = bmsRect(state, data, modelWidth, modelHeight);
  if (!rect) return;

  svg.append(
    svgEl("rect", {
      x: s.x(rect.x),
      y: s.y(rect.y),
      width: s.d(rect.w),
      height: s.d(rect.h),
      rx: 3,
      class: "bms",
    }),
  );

  for (let i = 0; i < 4; i += 1) {
    svg.append(
      svgEl("rect", {
        x: s.x(rect.x + 10 + i * 20),
        y: s.y(rect.y + rect.h * 0.28),
        width: s.d(Math.min(10, rect.w / 9)),
        height: s.d(Math.max(5, rect.h * 0.28)),
        rx: 1,
        class: "bms-chip",
      }),
    );
  }

  drawBmsLabel(svg, s, rect, data.bms.label);

  const connectorX = rect.x + rect.w * 0.12;
  const connectorY = rect.y + rect.h * 0.5;
  for (let col = 0; col <= state.series; col += 1) {
    const cellCol = Math.min(Math.max(col - 1, 0), state.series - 1);
    const row = col % 2 === 0 ? 0 : state.parallel - 1;
    const point = cellCenter(state, data, originX, originY, cellCol, row);
    const x = point.x;
    const y = point.y + (row === 0 ? -state.cellDiameter * 0.32 : state.cellDiameter * 0.32);
    const hue = Math.round((col / Math.max(1, state.series)) * 260);
    svg.append(
      svgEl("path", {
        d: `M ${s.x(x)} ${s.y(y)} C ${s.x(x)} ${s.y((y + connectorY) / 2)} ${s.x(connectorX)} ${s.y((y + connectorY) / 2)} ${s.x(connectorX)} ${s.y(connectorY)}`,
        class: "wire-balance",
        stroke: `hsl(${hue} 70% 44%)`,
      }),
    );
  }
}

function drawMainLeads(svg, s, state, data, modelWidth, modelHeight, originX, originY) {
  const negative = cellCenter(state, data, originX, originY, 0, 0);
  const positive = cellCenter(state, data, originX, originY, state.series - 1, state.parallel - 1);
  const exitX = (modelWidth + state.caseLength) / 2 - state.casePadding;
  const exitY = (modelHeight - state.caseWidth) / 2 + state.casePadding;

  svg.append(
    svgEl("path", {
      d: `M ${s.x(positive.x)} ${s.y(positive.y)} C ${s.x(exitX - 35)} ${s.y(positive.y)} ${s.x(exitX - 30)} ${s.y(exitY + 18)} ${s.x(exitX)} ${s.y(exitY + 18)}`,
      class: "wire-main",
      stroke: "var(--wire-red)",
    }),
  );
  svg.append(
    svgEl("path", {
      d: `M ${s.x(negative.x)} ${s.y(negative.y)} C ${s.x(exitX - 50)} ${s.y(negative.y)} ${s.x(exitX - 42)} ${s.y(exitY + 34)} ${s.x(exitX)} ${s.y(exitY + 34)}`,
      class: "wire-main",
      stroke: "var(--wire-black)",
    }),
  );
  svg.append(svgEl("circle", { cx: s.x(exitX), cy: s.y(exitY + 18), r: 4, fill: "var(--wire-red)" }));
  svg.append(svgEl("circle", { cx: s.x(exitX), cy: s.y(exitY + 34), r: 4, fill: "var(--wire-black)" }));
}

function drawSide(state, data) {
  const modelWidth = Math.max(state.caseLength, data.packLength);
  const modelHeight = Math.max(state.caseHeight, data.packHeight);
  const s = makeScaler(svgs.side, modelWidth, modelHeight, 28);
  outputs.sideDimensions.textContent = `${fixed(data.packLength)} x ${fixed(data.packHeight)} mm`;
  const bms = data.bms;

  const caseX = (modelWidth - state.caseLength) / 2;
  const caseY = (modelHeight - state.caseHeight) / 2;
  svgs.side.append(svgEl("rect", { x: s.x(caseX), y: s.y(caseY), width: s.d(state.caseLength), height: s.d(state.caseHeight), rx: 3, class: "case-outline" }));

  const packX = (modelWidth - data.packLength) / 2;
  const packY = (modelHeight - data.packHeight) / 2;
  svgs.side.append(svgEl("rect", { x: s.x(packX), y: s.y(packY), width: s.d(data.packLength), height: s.d(data.packHeight), rx: 3, class: "pack-shadow" }));

  const cellY = packY + state.casePadding + (state.bmsEnabled && state.bmsPosition === "top" ? bms.height + state.spacing : 0);
  const sideRows = data.staggered && state.parallel > 1 ? [1, 0] : [0];
  for (const row of sideRows) {
    for (let col = 0; col < state.series; col += 1) {
      const x = packX + state.casePadding + col * data.cellPitch + (row % 2) * data.rowOffset;
      svgs.side.append(svgEl("rect", {
        x: s.x(x),
        y: s.y(cellY + row * Math.min(4, state.spacing + 1)),
        width: s.d(state.cellDiameter),
        height: s.d(state.cellHeight),
        rx: s.d(state.cellDiameter / 2),
        fill: col % 2 === 0 ? "var(--cell-a)" : "var(--cell-b)",
        class: "cell-outline",
        opacity: row === 0 ? 1 : 0.62,
      }));
    }
  }

  if (state.bmsEnabled) {
    let rect = { x: packX + state.casePadding, y: packY + state.casePadding, w: bms.footprintLength, h: bms.height };
    if (state.bmsPosition === "end") rect = { x: packX + data.packLength - state.casePadding - bms.footprintLength, y: packY + state.casePadding, w: bms.footprintLength, h: bms.height };
    if (state.bmsPosition === "side") rect = { x: packX + state.casePadding, y: packY + data.packHeight - state.casePadding - bms.height, w: Math.min(bms.footprintLength, data.cellBlockLength), h: bms.height };
    svgs.side.append(svgEl("rect", { x: s.x(rect.x), y: s.y(rect.y), width: s.d(rect.w), height: s.d(rect.h), rx: 2, class: "bms" }));
    drawBmsLabel(svgs.side, s, rect, bms.label);
  }
}

function drawWidth(state, data) {
  const modelWidth = Math.max(state.caseWidth, data.packWidth);
  const modelHeight = Math.max(state.caseHeight, data.packHeight);
  const s = makeScaler(svgs.width, modelWidth, modelHeight, 28);
  outputs.widthDimensions.textContent = `${fixed(data.packWidth)} x ${fixed(data.packHeight)} mm`;
  const bms = data.bms;

  const caseX = (modelWidth - state.caseWidth) / 2;
  const caseY = (modelHeight - state.caseHeight) / 2;
  svgs.width.append(svgEl("rect", { x: s.x(caseX), y: s.y(caseY), width: s.d(state.caseWidth), height: s.d(state.caseHeight), rx: 3, class: "case-outline" }));

  const packX = (modelWidth - data.packWidth) / 2;
  const packY = (modelHeight - data.packHeight) / 2;
  svgs.width.append(svgEl("rect", { x: s.x(packX), y: s.y(packY), width: s.d(data.packWidth), height: s.d(data.packHeight), rx: 3, class: "pack-shadow" }));

  const cellY = packY + state.casePadding + (state.bmsEnabled && state.bmsPosition === "top" ? bms.height + state.spacing : 0);
  for (let row = 0; row < state.parallel; row += 1) {
    const x = packX + state.casePadding + row * data.rowPitch;
    svgs.width.append(svgEl("rect", { x: s.x(x), y: s.y(cellY), width: s.d(state.cellDiameter), height: s.d(state.cellHeight), rx: s.d(state.cellDiameter / 2), fill: row % 2 === 0 ? "var(--cell-a)" : "var(--cell-b)", class: "cell-outline" }));
  }

  if (state.bmsEnabled) {
    let rect = null;
    if (state.bmsPosition === "side") {
      rect = {
        x: packX + data.packWidth - state.casePadding - bms.footprintWidth,
        y: packY + state.casePadding,
        w: bms.footprintWidth,
        h: bms.height,
      };
    }
    if (state.bmsPosition === "top") {
      rect = {
        x: packX + state.casePadding,
        y: packY + state.casePadding,
        w: Math.min(bms.footprintWidth, data.cellBlockWidth),
        h: bms.height,
      };
    }
    if (state.bmsPosition === "end") {
      rect = {
        x: packX + state.casePadding,
        y: packY + state.casePadding,
        w: Math.min(bms.footprintWidth, data.cellBlockWidth),
        h: bms.height,
      };
    }
    if (rect) {
      svgs.width.append(svgEl("rect", { x: s.x(rect.x), y: s.y(rect.y), width: s.d(rect.w), height: s.d(rect.h), rx: 2, class: "bms" }));
      drawBmsLabel(svgs.width, s, rect, bms.label);
    }
  }
}

function render() {
  const state = readState();
  const data = derive(state);

  outputs.metricArchitecture.textContent = `${state.series}S${state.parallel}P`;
  outputs.metricCells.textContent = data.cellCount.toLocaleString("fr-FR");
  outputs.metricVoltage.textContent = `${fixed(data.nominalVoltage)} V`;
  outputs.metricEnergy.textContent = `${Math.round(data.energyWh).toLocaleString("fr-FR")} Wh`;
  outputs.metricCost.textContent = money(data.totalCost);
  outputs.metricGain.textContent = money(data.gain);

  outputs.packDims.textContent = `${fixed(data.packLength)} x ${fixed(data.packWidth)} x ${fixed(data.packHeight)} mm`;
  outputs.caseDims.textContent = `${fixed(state.caseLength)} x ${fixed(state.caseWidth)} x ${fixed(state.caseHeight)} mm`;
  outputs.clearance.textContent = `${fixed(data.clearance.length)} / ${fixed(data.clearance.width)} / ${fixed(data.clearance.height)} mm`;
  outputs.fitStatus.textContent = data.minClearance < 0 ? "Depasse" : data.minClearance < 5 ? "Serre" : "OK";
  outputs.fitStatus.className = `status-pill ${data.minClearance < 0 ? "danger" : data.minClearance < 5 ? "warning" : ""}`.trim();
  outputs.cellsSubtotal.textContent = money(data.cellsSubtotal);
  outputs.laborSubtotal.textContent = money(data.laborSubtotal);
  outputs.totalCost.textContent = money(data.totalCost);
  outputs.salePrice.textContent = money(data.salePrice);

  drawTop(state, data);
  drawSide(state, data);
  drawWidth(state, data);
}

function applyPreset() {
  const preset = presets[el.cellPreset.value];
  if (!preset) return;
  el.cellDiameter.value = preset.diameter;
  el.cellHeight.value = preset.height;
  el.cellAh.value = preset.ah;
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSvg() {
  const state = readState();
  const svg = svgs.top.cloneNode(true);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .join("\n");
  svg.prepend(style);
  download(`batterielab-${state.series}s${state.parallel}p.svg`, new XMLSerializer().serializeToString(svg), "image/svg+xml");
}

function exportJson() {
  const state = readState();
  const data = derive(state);
  download(
    `batterielab-${state.series}s${state.parallel}p.json`,
    JSON.stringify({ state, results: data }, null, 2),
    "application/json",
  );
}

ids.forEach((id) => {
  el[id].addEventListener("input", render);
  el[id].addEventListener("change", render);
});

el.cellPreset.addEventListener("change", () => {
  applyPreset();
  render();
});

document.getElementById("resetButton").addEventListener("click", () => {
  Object.entries(initialState).forEach(([key, value]) => {
    if (!el[key]) return;
    if (el[key].type === "checkbox") el[key].checked = value;
    else el[key].value = value;
  });
  render();
});

document.getElementById("downloadSvg").addEventListener("click", exportSvg);
document.getElementById("downloadJson").addEventListener("click", exportJson);
document.getElementById("printButton").addEventListener("click", () => window.print());
window.addEventListener("resize", render);

render();
