const express = require('express');

const CONTROLLER = require('../controller/index')

const router = express.Router();

router.get('/healthcheck', (req, res) => {
	res.status(200).json({message: "Server is alive"})
})

router.post("/register", CONTROLLER.register);
router.post("/login", CONTROLLER.login);
router.post("/update_my_data", CONTROLLER.update_my_data);
router.get("/my_data", CONTROLLER.my_data);
router.get("/search_for_new_friends", CONTROLLER.search_for_new_friends);
router.post("/friend_requests", CONTROLLER.friend_requests);
router.post("/confirm_friend_request", CONTROLLER.confirm_friend_request);
router.post("/decline_friend_request", CONTROLLER.decline_friend_request);
router.post("/send_message", CONTROLLER.send_message);
router.post("/delete_received_message", CONTROLLER.delete_received_message);
router.post("/delete_sent_message", CONTROLLER.delete_sent_message);
router.post("/get_conv_list", CONTROLLER.get_conv_list);
module.exports = router;