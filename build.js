const fs = require("fs");
const parseCss = require("css").parse;
const { version } = require("./package.json");

//const colorRegex = /#(?:[0-9a-fA-F]{3}){1,2}/g;
const colorRegex = /(#([0-9a-f]{3}){1,2}|(rgba|hsla)\(\d{1,3}%?(,\s?\d{1,3}%?){2},\s?(1|0?\.\d+)\)|(rgb|hsl)\(\d{1,3}%?(,\s?\d{1,3}%?\)){2})/gi;

const colorsMap = {
  "#ffffff": "#222",
  "#000000": "#999",
  "#aaaaaa": "#444",
  "#f5f5f5": "#181818",
  "#e5e5e5": "#333",
  "#ececec": "#444",
  "#c5c5c5": "#444",
  "#f8f8f8": "#181818",
  "#333333": "#d0d0d0",
  "#d9ebf8": "#3F6A88",
  "#fbf1f1": "#440000",
  "#f5dddd": "#330000",
  "#cccccc": "#444",
  "#d6d6d6": "#444",
  "#efefef": "#333",
  "#c0c0c0": "#444",
  "#999999": "#555",
  "#ebebeb": "#444",
  "#fff0b9": "#444",
  "#e9e9e9": "#444",
  "#d9d9d9": "#444",
  "#b3b3b3": "#444",

  "rgb(22, 56, 84)": "rgb(33, 107, 165)",

  "rgba(32, 32, 32, 0.8)": "rgba(150, 150, 150, 0.8)",
  "rgba(0, 0, 0, 0.25)": "rgba(100, 100, 100, 0.25)",
  "rgba(255, 255, 255, 0.75)": "rgba(10, 10, 10, 0.75)"
};

const propertyColorsMap = {
  color: {
    "#ffffff": "#a5a5a5",
    "#333333": "#a5a5a5"
  }
};

const manualCss = `
.loading-indicator__inner {
  border-color: rgb(33, 107, 165) transparent transparent rgb(33, 107, 165) !important;
}

i.icon-logo, input {
  color: #c0c0c0 !important;
}

.inline-banner {
  border-color: #333 !important;
}

@media (min-width: 850px) {
  div.topbar-navigation-wrapper {
    border: 0 !important;
  }
}

hr {
  border-color: #555;
}
`;

const ignoredSelector = [
  ".signed-in .topbar-navigation-link",
  ".signed-in .topbar-navigation-link:hover",
  ".signed-in .topbar-navigation-link.active",
  ".signed-in .topbar-navigation-link:active",
  ".signed-in .topbar-navigation-link:visited",
  ".signed-in .topbar-logo",
  ".signed-in .topbar-logo:hover",
  ".label",
  ".wizard-caption-heading.is-active"
];

fs.readdir("css-files", (err, files) => {
  if (err) {
    throw err;
  }

  if (!err && files && files.length) {
    let output = `/* ==UserStyle==
@name        HackerOne Dark
@namespace   https://github.com/sijad/hackerone-dark
@version     ${version}
@license     MIT
==/UserStyle== */

@-moz-document url-prefix("https://hackerone.com") {
${manualCss}`;

    files
      .filter(file => file.indexOf(".") !== 0)
      .forEach(file => {
        output += parse(fs.readFileSync(`./css-files/${file}`, "utf8"));
      });

    output += "}";

    fs.writeFileSync("hackerone-dark.user.css", output);
  }
});

function parse(data) {
  const {
    stylesheet: { rules }
  } = parseCss(data);

  const colorRules = rules.map(processRules).filter(v => v && true);

  if (!colorRules || !colorRules.length) {
    throw "no color rules.";
  }

  const newRules = {};
  colorRules.forEach(({ selectors, properties }) => {
    properties.forEach(({ property, value, originalValue }) => {
      const key = `${property}-${originalValue}`;
      if (!newRules[key]) {
        newRules[key] = {
          property,
          value,
          originalValue,
          selectors: []
        };
      }
      selectors = selectors.filter(
        selector => ignoredSelector.indexOf(selector) === -1
      );
      newRules[key].selectors.push(...selectors);
    });
  });

  return buildCss(newRules);
}

function buildCss(rules) {
  const ruleValues = Object.values(rules);
  let output = "";
  ruleValues.forEach(({ property, value, selectors }) => {
    if (selectors && selectors.length) {
      value = value.replace("!important", "");
      output += `\n${selectors.join(
        ","
      )} {\n${property}: ${value} !important;\n}\n`;
    }
  });
  return output;
}

// itrates over all rules and return only wanted rules.
function processRules({ declarations, rules, type, selectors }) {
  if (rules) {
    return rules.forEach(processRules);
  }

  if (type === "keyframes" || type === "comment" || type === "charset") {
    return;
  }

  if (!declarations) {
    throw "no declarations";
  }

  const properties = declarations
    .map(({ value, property }) => {
      // make sure it's not comment.
      if (value && value.match(colorRegex)) {
        const newValue = value.replace(new RegExp(colorRegex, "gi"), c =>
          processColor(c, property)
        );
        if (newValue !== value) {
          return {
            property,
            value: newValue,
            originalValue: value
          };
        }
      }
      return false;
    })
    .filter(v => v);

  if (properties && properties.length) {
    return {
      properties,
      selectors
    };
  }
}

function processColor(color, property) {
  if (color) {
    const cleaned = cleanupColor(color);
    if (propertyColorsMap[property] && propertyColorsMap[property][cleaned]) {
      return propertyColorsMap[property][cleaned];
    } else if (colorsMap[cleaned]) {
      return colorsMap[cleaned];
    }
  }
  return color;
}

function cleanupColor(color) {
  color = color.toLowerCase();
  if (color.length === 4 && color.indexOf("#") === 0) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${
      color[3]
    }`;
  }
  return color;
}
