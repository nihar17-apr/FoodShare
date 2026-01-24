const express = require("express");
const router = express.Router();
const acceptorController = require("../controllers/acceptorController");

router.get("/acceptors", acceptorController.getAllVerified);
router.post("/add-acceptor", acceptorController.addAcceptor);
router.put("/verify-acceptor/:id", acceptorController.verifyAcceptor);
router.delete("/delete-acceptor/:id", acceptorController.deleteAcceptor);
router.get("/admin/acceptors", acceptorController.getAdminAcceptors);

module.exports = router;
