const router = require("express").Router();
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

// http://localhost:3000/v1//user/update-me
router.patch("/update-me", authController.protect, userController.updateMe);

router.get("/get-users", authController.protect, userController.getUsers);
router.get("/get-friends", authController.protect, userController.getFriends);
router.get(
  "/get-friend-requests",
  authController.protect,
  userController.getFriendRequests
);

module.exports = router;
