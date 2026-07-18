const express = require("express");
const router = express.Router();
const { addStock, getStock } = require("../controllers/stock.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.use(verifyToken);

router.route("/")
  .get(getStock)
  .post(addStock);

module.exports = router;
