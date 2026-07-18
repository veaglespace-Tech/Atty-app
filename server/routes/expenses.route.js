const express = require("express");
const router = express.Router();
const { getBalanceAndTransactions, addDeposit, addWithdrawal, settleClaim, exportTransactionsExcel, exportTransactionsPdf, getTransactionById } = require("../controllers/expenses.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const { singleUpload } = require("../middlewares/upload");

router.use(verifyToken);

router.get("/balance", getBalanceAndTransactions);
router.post("/deposit", addDeposit);
router.post("/withdrawal", singleUpload("receipt"), addWithdrawal);
router.post("/settle-claim", singleUpload("receipt"), settleClaim);

router.get("/export/excel", exportTransactionsExcel);
router.get("/export/pdf", exportTransactionsPdf);
router.get("/:id", getTransactionById);

module.exports = router;
