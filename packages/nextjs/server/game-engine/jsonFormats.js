"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableFromJson = tableFromJson;
exports.tableToJson = tableToJson;
function tableFromJson(json) {
    return { ...json, actedSinceLastRaise: new Set(json.actedSinceLastRaise) };
}
function tableToJson(table) {
    return {
        ...table,
        actedSinceLastRaise: Array.from(table.actedSinceLastRaise),
    };
}
//# sourceMappingURL=jsonFormats.js.map