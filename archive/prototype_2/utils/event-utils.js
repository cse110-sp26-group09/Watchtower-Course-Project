"use strict";

/**
 * Backwards-compatible re-export shim.
 *
 * The canonical event utility module now lives at
 * `src/shared/utils/event-utils.js` so both prototypes (and any
 * Sprint 3 hybrid) can import the same implementation. This file is
 * kept only so existing callers that imported
 * `src/prototype_2/utils/event-utils` continue to work without code
 * changes. New code should require the shared module directly.
 *
 * @module event-utils
 */

module.exports = require("../../shared/utils/event-utils");
