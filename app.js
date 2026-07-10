const ids = [
  "hidePrices",
  "showCase",
  "showNickel",
  "showBalanceWires",
  "showSeriesLabels",
  "series",
  "parallel",
  "cellPreset",
  "cellAh",
  "cellNominalVoltage",
  "cellFullVoltage",
  "cellMaxDischarge",
  "cellWeight",
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
  "bmsWeight",
  "bmsMaxDischarge",
  "caseLength",
  "caseWidth",
  "caseHeight",
  "enclosureWeight",
  "cellCost",
  "bmsCost",
  "hardwareCost",
  "hourlyRate",
  "laborHours",
  "markup",
  "quoteNumber",
  "quoteDate",
  "quoteValidity",
  "depositPercent",
  "shippingCost",
  "companyName",
  "companyAddress",
  "companyLegal",
  "customerName",
  "customerEmail",
  "customerAddress",
  "paypalUrl",
  "paymentTerms",
  "legalTerms",
];

const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

const outputs = Object.fromEntries(
  [
    "metricArchitecture",
    "metricCells",
    "metricVoltage",
    "metricEnergy",
    "metricWeight",
    "metricMaxDischarge",
    "metricCost",
    "metricGain",
    "topScale",
    "sideDimensions",
    "widthDimensions",
    "packDims",
    "caseDims",
    "packWeight",
    "clearanceLength",
    "clearanceWidth",
    "clearanceHeight",
    "fitMessage",
    "fitStatus",
    "cellMaxDischargeOut",
    "cellArrayMaxDischarge",
    "packMaxDischarge",
    "dischargeLimit",
    "packMaxPower",
    "maxVoltage",
    "cellsSubtotal",
    "laborSubtotal",
    "totalCost",
    "salePrice",
    "quoteCompanyName",
    "quoteCompanyAddress",
    "quoteCompanyLegal",
    "quoteCustomerName",
    "quoteCustomerAddress",
    "quoteNumberOut",
    "quoteDateOut",
    "quoteValidUntilOut",
    "quoteBatteryDetails",
    "quoteSalePrice",
    "quoteShippingRow",
    "quoteShippingPrice",
    "quotePaymentTerms",
    "quotePaypalUrlText",
    "quoteTotal",
    "quoteDeposit",
    "quoteLegalTerms",
  ].map((id) => [id, document.getElementById(id)]),
);

const svgs = {
  top: document.getElementById("topView"),
  side: document.getElementById("sideView"),
  width: document.getElementById("widthView"),
};

const publicQuoteUi = {
  status: document.getElementById("publicQuoteStatus"),
  link: document.getElementById("publicQuoteLink"),
};

const workspaceUi = {
  design: document.getElementById("designWorkspace"),
  quote: document.getElementById("quoteDocument"),
  designTab: document.getElementById("designTab"),
  quoteTab: document.getElementById("quoteTab"),
  title: document.getElementById("workspaceTitle"),
  fit: document.getElementById("workspaceFit"),
};

const presets = {
  "18650": { diameter: 18.4, height: 65, ah: 3.2, dischargeA: 10, weightG: 45 },
  "21700": { diameter: 21.2, height: 70, ah: 5, dischargeA: 15, weightG: 70 },
};

let logoDataUrl = "";
let initialState = null;
let activeWorkspaceView = "design";
const saveStorageKey = "batterielab:saves:v1";
const saveUi = {
  name: document.getElementById("saveName"),
  list: document.getElementById("savedConfigs"),
  status: document.getElementById("saveStatus"),
};

function num(input, fallback = 0) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function money(value) {
  return `${Math.round(value).toLocaleString("fr-FR")} EUR`;
}

function amps(value) {
  return `${fixed(value, 1)} A`;
}

function power(value) {
  if (value >= 1000) return `${fixed(value / 1000, 1)} kW`;
  return `${Math.round(value).toLocaleString("fr-FR")} W`;
}

function weight(valueG) {
  return `${fixed(valueG / 1000, 2)} kg`;
}

function text(input) {
  return input.value.trim();
}

function fixed(value, digits = 1) {
  return Number(value).toLocaleString("fr-FR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: value % 1 === 0 ? 0 : digits,
  });
}

function readState() {
  const cellNominalVoltage = Math.max(0.1, num(el.cellNominalVoltage, 3.6));
  const cellFullVoltage = Math.max(cellNominalVoltage, num(el.cellFullVoltage, 4.2));
  return {
    hidePrices: el.hidePrices.checked,
    showCase: el.showCase.checked,
    showNickel: el.showNickel.checked,
    showBalanceWires: el.showBalanceWires.checked,
    showSeriesLabels: el.showSeriesLabels.checked,
    series: Math.max(1, Math.round(num(el.series, 13))),
    parallel: Math.max(1, Math.round(num(el.parallel, 8))),
    cellPreset: el.cellPreset.value,
    cellAh: Math.max(0.1, num(el.cellAh, 5)),
    cellNominalVoltage,
    cellFullVoltage,
    cellMaxDischarge: Math.max(0, num(el.cellMaxDischarge, 15)),
    cellWeight: Math.max(0, num(el.cellWeight, 70)),
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
    bmsWeight: Math.max(0, num(el.bmsWeight, 120)),
    bmsMaxDischarge: Math.max(0, num(el.bmsMaxDischarge, 100)),
    caseLength: Math.max(1, num(el.caseLength, 330)),
    caseWidth: Math.max(1, num(el.caseWidth, 270)),
    caseHeight: Math.max(1, num(el.caseHeight, 95)),
    enclosureWeight: Math.max(0, num(el.enclosureWeight, 500)),
    cellCost: Math.max(0, num(el.cellCost, 4.2)),
    bmsCost: Math.max(0, num(el.bmsCost, 65)),
    hardwareCost: Math.max(0, num(el.hardwareCost, 45)),
    hourlyRate: Math.max(0, num(el.hourlyRate, 45)),
    laborHours: Math.max(0, num(el.laborHours, 3.5)),
    markup: Math.max(0, num(el.markup, 30)),
    quoteNumber: text(el.quoteNumber),
    quoteDate: el.quoteDate.value,
    quoteValidity: Math.max(1, Math.round(num(el.quoteValidity, 30))),
    depositPercent: Math.max(0, Math.min(100, num(el.depositPercent, 30))),
    shippingCost: Math.max(0, num(el.shippingCost, 0)),
    companyName: text(el.companyName),
    companyAddress: text(el.companyAddress),
    companyLegal: text(el.companyLegal),
    customerName: text(el.customerName),
    customerEmail: text(el.customerEmail),
    customerAddress: text(el.customerAddress),
    paypalUrl: text(el.paypalUrl),
    paymentTerms: text(el.paymentTerms),
    legalTerms: text(el.legalTerms),
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
  const nominalVoltage = state.series * state.cellNominalVoltage;
  const maxVoltage = state.series * state.cellFullVoltage;
  const capacityAh = state.parallel * state.cellAh;
  const energyWh = nominalVoltage * capacityAh;
  const cellArrayMaxDischargeA = state.parallel * state.cellMaxDischarge;
  const maxDischargeA = state.bmsEnabled ? Math.min(cellArrayMaxDischargeA, state.bmsMaxDischarge) : cellArrayMaxDischargeA;
  const dischargeLimit = state.bmsEnabled && state.bmsMaxDischarge < cellArrayMaxDischargeA ? "BMS" : "Cellules";
  const maxPowerW = nominalVoltage * maxDischargeA;
  const cellsWeightG = cellCount * state.cellWeight;
  const bmsWeightG = state.bmsEnabled ? state.bmsWeight : 0;
  const totalWeightG = cellsWeightG + bmsWeightG + state.enclosureWeight;
  const cellsSubtotal = cellCount * state.cellCost;
  const laborSubtotal = state.hourlyRate * state.laborHours;
  const totalCost = cellsSubtotal + laborSubtotal + state.hardwareCost + (state.bmsEnabled ? state.bmsCost : 0);
  const salePrice = totalCost * (1 + state.markup / 100);
  const quoteShipping = state.shippingCost;
  const quoteTotal = salePrice + quoteShipping;
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
    cellArrayMaxDischargeA,
    maxDischargeA,
    dischargeLimit,
    maxPowerW,
    cellsWeightG,
    bmsWeightG,
    totalWeightG,
    cellsSubtotal,
    laborSubtotal,
    totalCost,
    salePrice,
    quoteShipping,
    quoteTotal,
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

function drawEnvelopeLabels(svg, s, caseRect, packRect, showCase) {
  if (showCase) {
    svg.append(
      svgEl("text", {
        x: s.x(caseRect.x + 2),
        y: s.y(caseRect.y) - 8,
        class: "small-svg",
      }, "Boitier disponible"),
    );
  }
  svg.append(
    svgEl("text", {
      x: s.x(packRect.x + packRect.w - 5),
      y: s.y(packRect.y + packRect.h - 7),
      class: "small-svg",
      "text-anchor": "end",
    }, "Enveloppe requise"),
  );
}

function drawDimensions(svg, s, rect, horizontalLabel, verticalLabel) {
  const offset = 17 / s.scale;
  const tick = 4 / s.scale;
  const bottomY = rect.y + rect.h + offset;
  const leftX = rect.x - offset;

  svg.append(
    svgEl("line", { x1: s.x(rect.x), y1: s.y(bottomY), x2: s.x(rect.x + rect.w), y2: s.y(bottomY), class: "dimension-line" }),
    svgEl("line", { x1: s.x(rect.x), y1: s.y(bottomY - tick), x2: s.x(rect.x), y2: s.y(bottomY + tick), class: "dimension-line" }),
    svgEl("line", { x1: s.x(rect.x + rect.w), y1: s.y(bottomY - tick), x2: s.x(rect.x + rect.w), y2: s.y(bottomY + tick), class: "dimension-line" }),
    svgEl("text", { x: s.x(rect.x + rect.w / 2), y: s.y(bottomY - tick), class: "dimension-label" }, horizontalLabel),
    svgEl("line", { x1: s.x(leftX), y1: s.y(rect.y), x2: s.x(leftX), y2: s.y(rect.y + rect.h), class: "dimension-line" }),
    svgEl("line", { x1: s.x(leftX - tick), y1: s.y(rect.y), x2: s.x(leftX + tick), y2: s.y(rect.y), class: "dimension-line" }),
    svgEl("line", { x1: s.x(leftX - tick), y1: s.y(rect.y + rect.h), x2: s.x(leftX + tick), y2: s.y(rect.y + rect.h), class: "dimension-line" }),
    svgEl("text", {
      x: s.x(leftX + tick),
      y: s.y(rect.y + rect.h / 2),
      class: "dimension-label",
      transform: `rotate(-90 ${s.x(leftX + tick)} ${s.y(rect.y + rect.h / 2)})`,
    }, verticalLabel),
  );
}

function drawTop(state, data) {
  const modelWidth = Math.max(state.caseLength, data.packLength);
  const modelHeight = Math.max(state.caseWidth, data.packWidth);
  const s = makeScaler(svgs.top, modelWidth, modelHeight, 50);
  outputs.topScale.textContent = `1 px = ${fixed(1 / s.scale, 1)} mm`;

  const caseRect = {
    x: (modelWidth - state.caseLength) / 2,
    y: (modelHeight - state.caseWidth) / 2,
    w: state.caseLength,
    h: state.caseWidth,
  };
  const packRect = {
    x: (modelWidth - data.packLength) / 2,
    y: (modelHeight - data.packWidth) / 2,
    w: data.packLength,
    h: data.packWidth,
  };

  if (state.showCase) {
    svgs.top.append(
      svgEl("rect", {
        x: s.x(caseRect.x),
        y: s.y(caseRect.y),
        width: s.d(caseRect.w),
        height: s.d(caseRect.h),
        rx: 4,
        class: "case-outline",
      }),
    );
  }

  const originX = packRect.x + state.casePadding;
  const originY = packRect.y + state.casePadding;
  svgs.top.append(
    svgEl("rect", {
      x: s.x(packRect.x),
      y: s.y(packRect.y),
      width: s.d(packRect.w),
      height: s.d(packRect.h),
      rx: 4,
      class: "pack-shadow",
    }),
  );
  drawEnvelopeLabels(svgs.top, s, caseRect, packRect, state.showCase);
  drawDimensions(svgs.top, s, packRect, `${fixed(data.packLength)} mm`, `${fixed(data.packWidth)} mm`);

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
  if (state.showNickel) {
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
  }

  for (let col = 0; col < state.series; col += 1) {
    for (let row = 0; row < state.parallel; row += 1) {
      const { x, y } = cellCenter(state, data, originX, originY, col, row);
      const positive = col % 2 === 0;
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
    if (withLabels && state.showSeriesLabels) {
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

  const chipCount = Math.max(2, Math.min(5, Math.floor(rect.w / 22)));
  for (let i = 0; i < chipCount; i += 1) {
    const chipWidth = Math.min(11, rect.w / (chipCount * 1.8));
    svg.append(
      svgEl("rect", {
        x: s.x(rect.x + ((i + 1) * rect.w) / (chipCount + 1) - chipWidth / 2),
        y: s.y(rect.y + rect.h * 0.28),
        width: s.d(chipWidth),
        height: s.d(Math.max(5, rect.h * 0.28)),
        rx: 1,
        class: "bms-chip",
      }),
    );
  }

  drawBmsLabel(svg, s, rect, data.bms.label);
  if (!state.showBalanceWires) return;

  for (let col = 0; col <= state.series; col += 1) {
    const cellCol = Math.min(Math.max(col - 1, 0), state.series - 1);
    const row = col === 0 ? 0 : (cellCol % 2 === 0 ? state.parallel - 1 : 0);
    const point = cellCenter(state, data, originX, originY, cellCol, row);
    const x = point.x;
    const y = point.y + (row === 0 ? -state.cellDiameter * 0.32 : state.cellDiameter * 0.32);
    const position = (col + 1) / (state.series + 2);
    let connector = { x: rect.x + rect.w * position, y: rect.y + rect.h };
    if (state.bmsPosition === "side") connector = { x: rect.x + rect.w * position, y: rect.y };
    if (state.bmsPosition === "end") connector = { x: rect.x, y: rect.y + rect.h * position };
    const hue = Math.round((col / Math.max(1, state.series)) * 260);
    svg.append(
      svgEl("path", {
        d: `M ${s.x(x)} ${s.y(y)} C ${s.x(x)} ${s.y((y + connector.y) / 2)} ${s.x(connector.x)} ${s.y((y + connector.y) / 2)} ${s.x(connector.x)} ${s.y(connector.y)}`,
        class: "wire-balance",
        stroke: `hsl(${hue} 70% 44%)`,
      }),
      svgEl("circle", { cx: s.x(connector.x), cy: s.y(connector.y), r: 1.7, fill: `hsl(${hue} 70% 44%)` }),
    );
  }
}

function drawMainLeads(svg, s, state, data, modelWidth, modelHeight, originX, originY) {
  const negative = cellCenter(state, data, originX, originY, 0, 0);
  const positiveRow = (state.series - 1) % 2 === 0 ? state.parallel - 1 : 0;
  const positive = cellCenter(state, data, originX, originY, state.series - 1, positiveRow);
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
  svg.append(
    svgEl("text", { x: s.x(exitX - 7), y: s.y(exitY + 20), class: "lead-label", "text-anchor": "end" }, "P+"),
    svgEl("text", { x: s.x(exitX - 7), y: s.y(exitY + 36), class: "lead-label", "text-anchor": "end" }, "P-"),
  );
}

function drawSide(state, data) {
  const modelWidth = Math.max(state.caseLength, data.packLength);
  const modelHeight = Math.max(state.caseHeight, data.packHeight);
  const s = makeScaler(svgs.side, modelWidth, modelHeight, 42);
  outputs.sideDimensions.textContent = `${fixed(data.packLength)} x ${fixed(data.packHeight)} mm`;
  const bms = data.bms;

  const caseRect = {
    x: (modelWidth - state.caseLength) / 2,
    y: (modelHeight - state.caseHeight) / 2,
    w: state.caseLength,
    h: state.caseHeight,
  };
  if (state.showCase) {
    svgs.side.append(svgEl("rect", { x: s.x(caseRect.x), y: s.y(caseRect.y), width: s.d(caseRect.w), height: s.d(caseRect.h), rx: 3, class: "case-outline" }));
  }

  const packRect = {
    x: (modelWidth - data.packLength) / 2,
    y: (modelHeight - data.packHeight) / 2,
    w: data.packLength,
    h: data.packHeight,
  };
  const packX = packRect.x;
  const packY = packRect.y;
  svgs.side.append(svgEl("rect", { x: s.x(packRect.x), y: s.y(packRect.y), width: s.d(packRect.w), height: s.d(packRect.h), rx: 3, class: "pack-shadow" }));
  drawEnvelopeLabels(svgs.side, s, caseRect, packRect, state.showCase);
  drawDimensions(svgs.side, s, packRect, `${fixed(data.packLength)} mm`, `${fixed(data.packHeight)} mm`);

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
  const s = makeScaler(svgs.width, modelWidth, modelHeight, 42);
  outputs.widthDimensions.textContent = `${fixed(data.packWidth)} x ${fixed(data.packHeight)} mm`;
  const bms = data.bms;

  const caseRect = {
    x: (modelWidth - state.caseWidth) / 2,
    y: (modelHeight - state.caseHeight) / 2,
    w: state.caseWidth,
    h: state.caseHeight,
  };
  if (state.showCase) {
    svgs.width.append(svgEl("rect", { x: s.x(caseRect.x), y: s.y(caseRect.y), width: s.d(caseRect.w), height: s.d(caseRect.h), rx: 3, class: "case-outline" }));
  }

  const packRect = {
    x: (modelWidth - data.packWidth) / 2,
    y: (modelHeight - data.packHeight) / 2,
    w: data.packWidth,
    h: data.packHeight,
  };
  const packX = packRect.x;
  const packY = packRect.y;
  svgs.width.append(svgEl("rect", { x: s.x(packRect.x), y: s.y(packRect.y), width: s.d(packRect.w), height: s.d(packRect.h), rx: 3, class: "pack-shadow" }));
  drawEnvelopeLabels(svgs.width, s, caseRect, packRect, state.showCase);
  drawDimensions(svgs.width, s, packRect, `${fixed(data.packWidth)} mm`, `${fixed(data.packHeight)} mm`);

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

function parseDateInput(value) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function formatDateFr(date) {
  return new Intl.DateTimeFormat("fr-FR").format(date);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function setText(node, value, fallback = "") {
  node.textContent = value || fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safePaymentUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    return "";
  }
  return "";
}

function renderQuote(state, data) {
  const quoteDate = parseDateInput(state.quoteDate);
  const validUntil = addDays(quoteDate, state.quoteValidity);
  const deposit = data.quoteTotal * (state.depositPercent / 100);
  const layoutLabel = state.cellLayout === "staggered" ? "quinconce serre" : "grille droite";
  const bmsPositions = { side: "sur le cote", top: "au-dessus", end: "en bout" };
  const bmsLabel = state.bmsEnabled
    ? `BMS ${bmsPositions[state.bmsPosition]}, ${state.bmsMount === "edge" ? "sur tranche" : "a plat"}, rotation ${state.bmsRotation} deg, ${amps(state.bmsMaxDischarge)} continu`
    : "sans BMS";
  const details = [
    `${state.series}S${state.parallel}P - ${data.cellCount} cellules ${state.cellPreset}`,
    `${fixed(data.nominalVoltage)} V nominal / ${fixed(data.maxVoltage)} V pleine charge`,
    `${fixed(data.capacityAh)} Ah - ${Math.round(data.energyWh).toLocaleString("fr-FR")} Wh`,
    `Decharge max estimee : ${amps(data.maxDischargeA)} (${power(data.maxPowerW)})`,
    `Poids estime : ${weight(data.totalWeightG)}`,
    `Dimensions enveloppe : ${fixed(data.packLength)} x ${fixed(data.packWidth)} x ${fixed(data.packHeight)} mm`,
    `Arrangement : ${layoutLabel} - ${bmsLabel}`,
  ].join("\n");

  setText(outputs.quoteCompanyName, state.companyName, "Entreprise");
  setText(outputs.quoteCompanyAddress, state.companyAddress, "Coordonnees entreprise");
  setText(outputs.quoteCompanyLegal, state.companyLegal, "Infos legales entreprise");
  setText(outputs.quoteCustomerName, state.customerName, "Client");
  setText(outputs.quoteCustomerAddress, state.customerAddress, "Coordonnees client");
  setText(outputs.quoteNumberOut, state.quoteNumber, "Devis");
  outputs.quoteDateOut.textContent = formatDateFr(quoteDate);
  outputs.quoteValidUntilOut.textContent = `Valable jusqu'au ${formatDateFr(validUntil)}`;
  outputs.quoteBatteryDetails.textContent = details;
  outputs.quoteSalePrice.textContent = money(data.salePrice);
  outputs.quoteShippingPrice.textContent = money(data.quoteShipping);
  outputs.quoteShippingRow.classList.toggle("is-hidden", data.quoteShipping <= 0);
  setText(outputs.quotePaymentTerms, state.paymentTerms, "Conditions de paiement");
  outputs.quoteTotal.textContent = money(data.quoteTotal);
  outputs.quoteDeposit.textContent = `${money(deposit)} (${fixed(state.depositPercent)} %)`;
  setText(outputs.quoteLegalTerms, state.legalTerms, "Mentions devis / legales");

  const logo = document.getElementById("quoteLogo");
  logo.src = logoDataUrl;
  logo.classList.toggle("has-logo", Boolean(logoDataUrl));

  const paypal = document.getElementById("quotePaypalLink");
  const paypalUrl = safePaymentUrl(state.paypalUrl);
  paypal.href = paypalUrl || "#";
  paypal.classList.toggle("is-disabled", !paypalUrl);
  outputs.quotePaypalUrlText.textContent = paypalUrl ? `Lien de paiement : ${paypalUrl}` : "";
  outputs.quotePaypalUrlText.classList.toggle("is-disabled", !paypalUrl);
}

function setControlAvailability(state) {
  ["bmsPosition", "bmsMount", "bmsRotation", "bmsThickness", "bmsLength", "bmsWidth", "bmsWeight", "bmsMaxDischarge"].forEach((id) => {
    el[id].disabled = !state.bmsEnabled;
  });
  document.getElementById("bmsPanel").classList.toggle("bms-disabled", !state.bmsEnabled);

  const customCell = state.cellPreset === "custom";
  el.cellDiameter.disabled = !customCell;
  el.cellHeight.disabled = !customCell;
}

function fitDiagnostic(data) {
  const axes = [
    ["longueur", data.clearance.length],
    ["largeur", data.clearance.width],
    ["hauteur", data.clearance.height],
  ];
  const exceeded = axes.filter(([, value]) => value < 0);
  if (exceeded.length) return `Depassement : ${exceeded.map(([axis, value]) => `${axis} ${fixed(Math.abs(value))} mm`).join(", ")}.`;
  const tight = axes.filter(([, value]) => value < 5);
  if (tight.length) {
    const axisList = new Intl.ListFormat("fr-FR", { style: "long", type: "conjunction" }).format(tight.map(([axis]) => axis));
    return `Montage serre sur ${axisList}.`;
  }
  return "Le pack, son BMS et les jeux de montage entrent dans le boitier.";
}

function render() {
  const state = readState();
  const data = derive(state);
  document.body.classList.toggle("hide-prices", state.hidePrices);
  setControlAvailability(state);

  workspaceUi.title.textContent = `Pack ${state.series}S${state.parallel}P`;
  workspaceUi.fit.textContent = data.minClearance < 0 ? "Depasse les dimensions du boitier" : data.minClearance < 5 ? "Compatible, montage serre" : "Compatible avec le boitier";
  workspaceUi.fit.className = data.minClearance < 0 ? "danger" : data.minClearance < 5 ? "warning" : "";

  outputs.metricArchitecture.textContent = `${state.series}S${state.parallel}P`;
  outputs.metricCells.textContent = data.cellCount.toLocaleString("fr-FR");
  outputs.metricVoltage.textContent = `${fixed(data.nominalVoltage)} V`;
  outputs.metricEnergy.textContent = `${Math.round(data.energyWh).toLocaleString("fr-FR")} Wh`;
  outputs.metricWeight.textContent = weight(data.totalWeightG);
  outputs.metricMaxDischarge.textContent = amps(data.maxDischargeA);
  outputs.metricCost.textContent = money(data.totalCost);
  outputs.metricGain.textContent = money(data.gain);

  outputs.packDims.textContent = `${fixed(data.packLength)} x ${fixed(data.packWidth)} x ${fixed(data.packHeight)} mm`;
  outputs.caseDims.textContent = `${fixed(state.caseLength)} x ${fixed(state.caseWidth)} x ${fixed(state.caseHeight)} mm`;
  outputs.packWeight.textContent = weight(data.totalWeightG);
  const clearanceOutputs = [
    [outputs.clearanceLength, data.clearance.length],
    [outputs.clearanceWidth, data.clearance.width],
    [outputs.clearanceHeight, data.clearance.height],
  ];
  clearanceOutputs.forEach(([node, value]) => {
    node.textContent = `${fixed(value)} mm`;
    node.classList.toggle("negative", value < 0);
  });
  outputs.fitMessage.textContent = fitDiagnostic(data);
  outputs.fitStatus.textContent = data.minClearance < 0 ? "Depasse" : data.minClearance < 5 ? "Serre" : "OK";
  outputs.fitStatus.className = `status-pill ${data.minClearance < 0 ? "danger" : data.minClearance < 5 ? "warning" : ""}`.trim();
  outputs.cellMaxDischargeOut.textContent = amps(state.cellMaxDischarge);
  outputs.cellArrayMaxDischarge.textContent = amps(data.cellArrayMaxDischargeA);
  outputs.packMaxDischarge.textContent = amps(data.maxDischargeA);
  outputs.dischargeLimit.textContent = data.dischargeLimit;
  outputs.packMaxPower.textContent = power(data.maxPowerW);
  outputs.maxVoltage.textContent = `${fixed(data.maxVoltage)} V`;
  outputs.cellsSubtotal.textContent = money(data.cellsSubtotal);
  outputs.laborSubtotal.textContent = money(data.laborSubtotal);
  outputs.totalCost.textContent = money(data.totalCost);
  outputs.salePrice.textContent = money(data.salePrice);

  drawTop(state, data);
  drawSide(state, data);
  drawWidth(state, data);
  renderQuote(state, data);
}

function applyPreset() {
  const preset = presets[el.cellPreset.value];
  if (!preset) return;
  el.cellDiameter.value = preset.diameter;
  el.cellHeight.value = preset.height;
  el.cellAh.value = preset.ah;
  el.cellMaxDischarge.value = preset.dischargeA;
  el.cellWeight.value = preset.weightG;
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

function fitCaseToPack() {
  const data = derive(readState());
  const roundUp = (value) => Math.ceil((value + 5) / 5) * 5;
  el.caseLength.value = roundUp(data.packLength);
  el.caseWidth.value = roundUp(data.packWidth);
  el.caseHeight.value = roundUp(data.packHeight);
  render();
}

function switchWorkspaceView(view) {
  activeWorkspaceView = view === "quote" ? "quote" : "design";
  const quoteActive = activeWorkspaceView === "quote";
  workspaceUi.design.hidden = quoteActive;
  workspaceUi.quote.hidden = !quoteActive;
  workspaceUi.designTab.setAttribute("aria-selected", String(!quoteActive));
  workspaceUi.quoteTab.setAttribute("aria-selected", String(quoteActive));
  if (!quoteActive) requestAnimationFrame(render);
}

function serializedTopSvg() {
  const svg = svgs.top.cloneNode(true);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.removeAttribute("role");
  svg.removeAttribute("aria-label");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    svg{--cell-a:#e8f4f0;--cell-b:#f3efe5;--wire-red:#d92d20;--wire-black:#22272b}
    .cell-outline{stroke:#2c3934;stroke-width:.9}
    .cell-terminal{fill:#fff;stroke:#394642;stroke-width:.5}
    .case-outline{fill:rgba(255,255,255,.42);stroke:#6a766f;stroke-width:1.2;stroke-dasharray:6 5}
    .pack-shadow{fill:rgba(15,118,110,.08);stroke:rgba(15,118,110,.45);stroke-width:1}
    .bms{fill:#183a37;stroke:#091f1d;stroke-width:1}
    .bms-chip{fill:#d6e3df;opacity:.9}
    .nickel{stroke:#a9a29a;stroke-width:5;stroke-linecap:round;opacity:.78}
    .wire-main{fill:none;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
    .wire-balance{fill:none;stroke-width:1.15;stroke-linecap:round;opacity:.78}
    .label-svg{fill:#20302b;font-size:10px;font-family:Arial,sans-serif;text-anchor:middle;dominant-baseline:middle}
    .bms-label{fill:#fff}
    .small-svg{fill:#4c5a55;font-size:9px;font-family:Arial,sans-serif}
    .dimension-line{fill:none;stroke:#65736e;stroke-width:.8}
    .dimension-label{fill:#43514c;font-size:9px;font-family:Arial,sans-serif;text-anchor:middle}
    .lead-label{fill:#34423d;font-size:9px;font-family:Arial,sans-serif;font-weight:700}
  `;
  svg.prepend(style);
  return new XMLSerializer().serializeToString(svg);
}

function publicQuotePayload() {
  const state = readState();
  const data = derive(state);
  return {
    state,
    results: data,
    logoDataUrl,
    topSvg: serializedTopSvg(),
    quote: {
      number: state.quoteNumber,
      date: state.quoteDate,
      validUntil: formatDateFr(addDays(parseDateInput(state.quoteDate), state.quoteValidity)),
      companyName: state.companyName,
      companyAddress: state.companyAddress,
      companyLegal: state.companyLegal,
      customerName: state.customerName,
      customerEmail: state.customerEmail,
      customerAddress: state.customerAddress,
      paymentTerms: state.paymentTerms,
      legalTerms: state.legalTerms,
      paypalUrl: safePaymentUrl(state.paypalUrl),
      itemPrice: data.salePrice,
      shippingCost: data.quoteShipping,
      salePrice: data.quoteTotal,
      depositPercent: state.depositPercent,
      depositAmount: data.quoteTotal * (state.depositPercent / 100),
    },
  };
}

function setPublicQuoteStatus(message, url = "") {
  publicQuoteUi.status.textContent = message;
  publicQuoteUi.link.textContent = url;
  publicQuoteUi.link.href = url || "#";
  publicQuoteUi.link.classList.toggle("is-empty", !url);
}

async function createPublicQuote() {
  const payload = publicQuotePayload();
  if (!payload.quote.customerEmail) {
    setPublicQuoteStatus("Ajoute un email client avant l'envoi automatique.");
    return;
  }

  setPublicQuoteStatus("Creation du lien public en cours...");
  try {
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Erreur serveur");
    const emailText = result.emailSent ? "Email envoye." : `Lien cree, email non envoye (${result.emailMessage || "SMTP non configure"}).`;
    setPublicQuoteStatus(`${emailText} URL publique :`, result.url);
  } catch (error) {
    setPublicQuoteStatus(`Service public indisponible: ${error.message}`);
  }
}

async function exportQuotePdf() {
  const payload = publicQuotePayload();
  setPublicQuoteStatus("Generation du PDF en cours...");
  try {
    const response = await fetch("/api/quote-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || "Erreur PDF");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = `${(payload.quote.number || "devis-batterielab").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}.pdf`;
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setPublicQuoteStatus("PDF genere et telecharge.");
  } catch (error) {
    setPublicQuoteStatus(`Export PDF indisponible: ${error.message}`);
  }
}

function readSaves() {
  try {
    const parsed = JSON.parse(localStorage.getItem(saveStorageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSaves(saves) {
  localStorage.setItem(saveStorageKey, JSON.stringify(saves));
}

function normalizeSave(rawSave) {
  if (!rawSave || typeof rawSave !== "object" || !rawSave.fields) return null;
  return {
    id: String(rawSave.id || `save-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name: String(rawSave.name || "Sauvegarde importee"),
    updatedAt: rawSave.updatedAt || new Date().toISOString(),
    fields: rawSave.fields,
    logoDataUrl: rawSave.logoDataUrl || "",
  };
}

function saveStatus(message) {
  saveUi.status.textContent = message;
}

function fieldSnapshot() {
  return Object.fromEntries(ids.map((id) => {
    const field = el[id];
    return [id, field.type === "checkbox" ? field.checked : field.value];
  }));
}

function defaultSaveName() {
  const state = readState();
  const customer = state.customerName && state.customerName !== "Nom du client" ? `${state.customerName} - ` : "";
  return `${customer}${state.series}S${state.parallel}P - ${new Date().toLocaleString("fr-FR")}`;
}

function renderSaveList(selectedId = "") {
  const saves = readSaves().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  saveUi.list.replaceChildren();

  if (!saves.length) {
    saveUi.list.append(new Option("Aucune sauvegarde", ""));
    return;
  }

  saves.forEach((save) => {
    const date = new Date(save.updatedAt).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    saveUi.list.append(new Option(`${save.name} - ${date}`, save.id));
  });

  if (selectedId) saveUi.list.value = selectedId;
}

function saveCurrentConfig() {
  const name = saveUi.name.value.trim() || defaultSaveName();
  const saves = readSaves();
  const now = new Date().toISOString();
  const existing = saves.find((save) => save.name.toLowerCase() === name.toLowerCase());
  const entry = {
    id: existing?.id || `save-${Date.now()}`,
    name,
    updatedAt: now,
    fields: fieldSnapshot(),
    logoDataUrl,
  };
  const next = existing ? saves.map((save) => (save.id === existing.id ? entry : save)) : [...saves, entry];

  try {
    writeSaves(next);
    saveUi.name.value = name;
    renderSaveList(entry.id);
    saveStatus(existing ? `Sauvegarde mise a jour : ${name}` : `Sauvegarde creee : ${name}`);
  } catch {
    saveStatus("Impossible de sauvegarder: stockage local plein ou indisponible.");
  }
}

function applySavedConfig(save) {
  Object.entries(save.fields || {}).forEach(([id, value]) => {
    const field = el[id];
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value;
  });

  logoDataUrl = save.logoDataUrl || "";
  document.getElementById("companyLogo").value = "";
  saveUi.name.value = save.name;
  render();
}

function loadSelectedConfig() {
  const selectedId = saveUi.list.value;
  const save = readSaves().find((item) => item.id === selectedId);
  if (!save) {
    saveStatus("Choisis une sauvegarde a recharger.");
    return;
  }
  applySavedConfig(save);
  renderSaveList(save.id);
  saveStatus(`Sauvegarde rechargee : ${save.name}`);
}

function deleteSelectedConfig() {
  const selectedId = saveUi.list.value;
  const saves = readSaves();
  const save = saves.find((item) => item.id === selectedId);
  if (!save) {
    saveStatus("Choisis une sauvegarde a supprimer.");
    return;
  }
  writeSaves(saves.filter((item) => item.id !== selectedId));
  renderSaveList();
  saveStatus(`Sauvegarde supprimee : ${save.name}`);
}

function saveDatabasePayload() {
  return {
    app: "BatterieLab",
    version: 1,
    exportedAt: new Date().toISOString(),
    saves: readSaves(),
  };
}

function exportSaveDatabase() {
  const payload = saveDatabasePayload();
  const stamp = new Date().toISOString().slice(0, 10);
  download(`batterielab-sauvegardes-${stamp}.json`, JSON.stringify(payload, null, 2), "application/json");
  saveStatus(`${payload.saves.length} sauvegarde(s) exportee(s) en JSON.`);
}

function mergeImportedSaves(importedSaves) {
  const current = readSaves();
  const byKey = new Map(current.map((save) => [save.id, save]));

  importedSaves.forEach((save) => {
    const sameName = current.find((item) => item.name.toLowerCase() === save.name.toLowerCase());
    const key = byKey.has(save.id) ? save.id : sameName?.id || save.id;
    byKey.set(key, { ...save, id: key });
  });

  const merged = Array.from(byKey.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  writeSaves(merged);
  renderSaveList(merged[0]?.id || "");
  return merged.length;
}

function importSaveDatabaseFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const rawSaves = Array.isArray(parsed) ? parsed : parsed.saves;
      if (!Array.isArray(rawSaves)) throw new Error("Format invalide");
      const saves = rawSaves.map(normalizeSave).filter(Boolean);
      if (!saves.length) throw new Error("Aucune sauvegarde valide");
      const total = mergeImportedSaves(saves);
      saveStatus(`${saves.length} sauvegarde(s) importee(s). Total local : ${total}.`);
    } catch {
      saveStatus("Import impossible: fichier JSON de sauvegardes invalide.");
    } finally {
      document.getElementById("importSaveDb").value = "";
    }
  });
  reader.readAsText(file);
}

function quoteHtmlDocument() {
  const state = readState();
  const title = state.quoteNumber || "devis-batterielab";
  const styles = Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .join("\n");
  const quote = document.getElementById("quoteDocument").cloneNode(true);
  quote.removeAttribute("hidden");
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${styles}</style>
  </head>
  <body class="quote-print">
    ${quote.outerHTML}
  </body>
</html>`;
}

function exportQuoteHtml() {
  const state = readState();
  const filename = `${(state.quoteNumber || "devis-batterielab").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}.html`;
  download(filename, quoteHtmlDocument(), "text/html");
}

function printQuote() {
  document.body.classList.add("quote-print");
  workspaceUi.quote.hidden = false;
  window.print();
}

window.addEventListener("afterprint", () => {
  document.body.classList.remove("quote-print");
  switchWorkspaceView(activeWorkspaceView);
});

function initializeQuoteDefaults() {
  const today = new Date();
  const year = String(today.getFullYear());
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const isoDate = `${year}-${month}-${day}`;
  if (el.quoteDate.value === "2026-07-07") el.quoteDate.value = isoDate;
  if (el.quoteNumber.value === "DEV-20260707-001") el.quoteNumber.value = `DEV-${year}${month}${day}-001`;
}

function initializeResponsivePanels() {
  if (!window.matchMedia("(max-width: 680px)").matches) return;
  ["bmsPanel", "casePanel", "costPanel"].forEach((id) => {
    document.getElementById(id).open = false;
  });
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
  logoDataUrl = "";
  document.getElementById("companyLogo").value = "";
  render();
});

document.getElementById("downloadSvg").addEventListener("click", exportSvg);
document.getElementById("downloadJson").addEventListener("click", exportJson);
document.getElementById("downloadQuoteHtml").addEventListener("click", exportQuoteHtml);
document.getElementById("downloadQuotePdf").addEventListener("click", exportQuotePdf);
document.getElementById("printQuote").addEventListener("click", printQuote);
document.getElementById("printButton").addEventListener("click", () => window.print());
document.getElementById("createPublicQuote").addEventListener("click", createPublicQuote);
document.getElementById("fitCase").addEventListener("click", fitCaseToPack);
workspaceUi.designTab.addEventListener("click", () => switchWorkspaceView("design"));
workspaceUi.quoteTab.addEventListener("click", () => switchWorkspaceView("quote"));
document.getElementById("jumpToDesign").addEventListener("click", () => {
  document.querySelector(".workspace").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("saveConfig").addEventListener("click", saveCurrentConfig);
document.getElementById("loadConfig").addEventListener("click", loadSelectedConfig);
document.getElementById("deleteConfig").addEventListener("click", deleteSelectedConfig);
document.getElementById("exportSaveDb").addEventListener("click", exportSaveDatabase);
document.getElementById("importSaveDbButton").addEventListener("click", () => {
  document.getElementById("importSaveDb").click();
});
document.getElementById("importSaveDb").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importSaveDatabaseFile(file);
});
document.getElementById("clearSaveName").addEventListener("click", () => {
  saveUi.name.value = "";
  saveStatus("Nom de sauvegarde vide.");
});
document.getElementById("companyLogo").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    logoDataUrl = String(reader.result || "");
    render();
  });
  reader.readAsDataURL(file);
});
document.getElementById("removeLogo").addEventListener("click", () => {
  logoDataUrl = "";
  document.getElementById("companyLogo").value = "";
  render();
});
window.addEventListener("resize", render);

initializeQuoteDefaults();
initializeResponsivePanels();
initialState = readState();
renderSaveList();
render();
