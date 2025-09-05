/**
 * VNDB Service Module
 * Handles VNDB API interactions for the immersion tracker
 */

const { getVNInfo, getVNInfoById, searchVNs } = require("../utils/vndbAPI");
const { asyncHandler } = require("../utils/errorHandler");

module.exports = {
  getVNInfo,
  getVNInfoById,
  searchVNs
};