const User = require('../models/users')
const JWT = require('jsonwebtoken');
const CONFIG = require('../config');

const register = (req, res) => {
	if (req.body && req.body.username && req.body.password && req.body.email) {
		var newUser = new User({
			username: req.body.username,
			password: req.body.password,
			confirmareparola: req.body.confirmareparola,
			nr_telefon: req.body.nr_telefon,
			link_poza: req.body.link_poza,
			email: req.body.email,

		})

		if (req.body.password !== req.body.confirmareparola) {
			res.send("Parola diferita");
		}
		newUser.save((err, result) => {
			if (err) {
				console.log(err);
				res.status(409).json({ message: "User already exists" });
			} else {
				res.send("Succes");
			}
		})
	}
	else if (req.body.username === "" || req.body.password === "" || req.body.email === "") {
		alert("Continut invalid");
		res.sendStatus(422);
	}

}

const login = (req, res) => {
	if (req.body && req.body.username && req.body.password) {
		var findUser = {
			username: req.body.username,
			password: req.body.password,
		}
		User.findOne(findUser)
			.then(data => {
				if (data == null) {
					res.status(401).json({ message: "Wrong combination" })
				} else {
					var token = JWT.sign(
						{
							username: req.body.username,
							exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60
						},
						CONFIG.JWT_SECRET_KEY
					)
					res.status(200).json({ token })
				}
			})
			.catch(err => {
				res.status(500).json({ message: "Problems with data base" })
			})


	}
	else if (req.body.username === "" || req.body.password === "") {
		alert("Continut invalid");
		res.sendStatus(422);
	}

}

const search_for_new_friends = (req, res) => {
	if (req.headers['token'] && req.query.search_word) {
		JWT.verify(req.headers['token'], CONFIG.JWT_SECRET_KEY, (err, payload) => {
			if (err)
				res.status(403).json({ message: "Invalid token" });
			else {
				User.findOne({ username: payload.username })
					.then(currentUser => {
						User.find({
							username: {
								$regex: "^" + req.query.search_word,
								$nin: [...currentUser.friends, currentUser.username]
							}
						}, {
								username: 1
							})
							.then(data => {
								res.send(data);
							})
					})
			}
		})
	}
}

const update_my_data = (req, res) => {
	if (!req.headers['token']) {
		res.status(403);
		return res.send({ message: "Please provide token" });
	}

	if (!req.body.my_data) {
		res.status(409);
		return res.send({ message: "Please provide my_data field" })
	}

	var token = req.headers['token'];
	JWT.verify(token, CONFIG.JWT_SECRET_KEY, (err, payload) => {
		if (err) {
			res.status(403);
			res.send({ message: "Invalid token" });
		} else {
			console.log
			User.update({ username: payload.username }, {
				$set: {
					user_data: req.body
				}
			})
				.then(data => {
					res.sendStatus(200);
				})
				.catch(err => {
					console.log("Eroare la update");
					console.log(err);
					res.sendStatus(500);
				})
		}
	})
}

const my_data = (req, res) => {
	if (!req.headers['token']) {
		res.status(403);
		return res.send({ message: "Please provide token" })
	}

	var token = req.headers['token'];
	JWT.verify(token, CONFIG.JWT_SECRET_KEY, (err, payload) => {
		if (err) {
			res.status(403);
			res.send({ message: "Invalid token" })
		} else {
			User.findOne({ username: payload.username })
				.then(data => {
					res.send({ user_data: data.user_data })
				})
				.catch(err => {
					console.log("Eroare la cautare in BD");
					console.log(err);
					res.sendStatus(500);
				})
		}
	})
}

const friend_requests = (req, res) => {
	if (req.headers['token'] && req.body && req.body.friend_username) {
		JWT.verify(req.headers['token'], CONFIG.JWT_SECRET_KEY, (err, payload) => {
			if (err) {
				res.status(403).json({ message: "invalid token" });
			}
			else {
				if (payload.username === req.body.friend_username)
					res.status(400).json({ message: "You can't send request yourself" });
				else {
					User.findOne({ username: payload.username })
						.then(currentUser => {
							User.findOne({ username: req.body.friend_username })
								.then(targetUser => {
									if (targetUser === null)
										res.sendStatus(404).json({ message: "Utilizatorul nu exista" });
									else {
										var alreadyFriendOrRequest = (currentUser.friends.some(x => x === req.body.friend_username)) ||
											(currentUser.requests_to_confirm.some(x => x === req.body.friend_username)) ||
											(currentUser.sent_requests.some(x => x === req.body.friend_username))
										if (alreadyFriendOrRequest) {
											res.status(400).json({ message: "This user is already your friend or it already sent you a request" })
										}
										else {
											currentUser.sent_requests.push(req.body.friend_username);
											targetUser.requests_to_confirm.push(payload.username);
											currentUser.save();
											targetUser.save();
											res.status(200).json({message:"Success"})
										}
									}
								})
						})
				}
			}
		})
	}
}

const confirm_friend_request = (req,res) => {
	if (req.headers['token'] && req.body && req.body.friend_username) {
		JWT.verify(req.headers['token'], CONFIG.JWT_SECRET_KEY, (err, payload) => {
			if (err) {
				res.status(403).json({ message: "invalid token" });
			}
			else {
				if (payload.username === req.body.friend_username)
					res.status(400).json({ message: "You can't send request yourself" });
				else {
					User.findOne({ username: payload.username })
						.then(currentUser => {
							User.findOne({ username: req.body.friend_username })
								.then(targetUser => {
									if (targetUser === null)
										res.sendStatus(404).json({ message: "Utilizatorul nu exista" });
									else {
										var hasFriendRequest = (targetUser.sent_requests.some(x => x === payload.username)) &&
											(currentUser.requests_to_confirm.some(x => x === req.body.friend_username))
											
										if (hasFriendRequest) {
											{
												currentUser.requests_to_confirm = currentUser.requests_to_confirm.filter(x => x != req.body.friend_username);
												targetUser.sent_requests = targetUser.sent_requests.filter(x => x != payload.username);
												currentUser.friends.push(req.body.friend_username);
												targetUser.friends.push(payload.username);
												currentUser.save();
												targetUser.save();
												res.status(200).json({message:"Success"})
											}
										} else {
											res.status(400).json({message:"You don't have request from this user"})
										}
										
									}
								})
						})
				}
			}
		})
	}
}

const decline_friend_request = (req,res) => {
	if(req.headers['token'] && req.body && req.body.friend_username)
	{
		JWT.verify(req.headers['token'],CONFIG.JWT_SECRET_KEY, (err, payload) => {
			if(err)
			{
				res.status(400).json({message : "Invalid token"});
			}
			else {
				if(payload.username === req.body.friend_username)
				{
					res.status(400).json({message : "You can't send request to yourself"});
				}
				else {
					User.findOne({username : payload.username})
					.then(currentUser => {
						User.findOne({username : req.body.friend_username})
						.then(targetUser => {
							if(targetUser === null)
							{
								res.status(400).json({message : "The user doesn't exists"});
							}
							else {
								var hasFriendRequest = (currentUser.requests_to_confirm.some(x => x === req.body.friend_username)) && 
								(targetUser.sent_requests.some(x => x === payload.username));
								if(hasFriendRequest)
								{
									currentUser.requests_to_confirm = currentUser.requests_to_confirm.filter(x => x!==req.body.friend_username);
									targetUser.sent_requests = targetUser.sent_requests.filter(x => x!==payload.username);
									currentUser.save();
									targetUser.save();
									res.status(200).json({message : "Succes"});
								}
								else {
									res.status(400).json({message : "You don't have requests from this user"});
								}
							}
						})
					})
				}
			}
		})
	}
	else {
		res.status(400).json({message : "Please provide token or verify the params you sent"});
	}
}

const send_message = (req,res) => {
	if(req.headers['token'] && req.body && req.body.friend_username && req.body.message)
	{
		JWT.verify(req.headers['token'], CONFIG.JWT_SECRET_KEY, (err, payload) => {
			if(err)
			{
				res.status(400).json({message : "Invalid token"});
			}
			else {
				if(payload.username === req.body.friend_username)
				{
					res.status(400).json({message : "You can't send message to yourself"});
				}
				else {
					User.findOne({username : payload.username})
						.then(currentUser => {
							User.findOne({username : req.body.friend_username})
								.then(targetUser => {
									if(targetUser === null)
									{
										res.status.json({message : "The user doesn't exist"});
									}
									else {
										var are_friends = (targetUser.friends.some(x => x === currentUser.username)) && 
										(currentUser.friends.some(x => x === targetUser.username));
										if(are_friends)
										{
											targetUser.messages.push({continut : req.body.message, from_who : currentUser.username, to_who : ""});
											currentUser.messages.push({continut : req.body.message, from_who : "", to_who : targetUser.username});
											targetUser.save();
											currentUser.save();
											res.status(200).json({message : "Succes"});
										}
										else {
											res.status(400).json({message : "The user is not your friend"});
										}
									}
								})
						})
				}
			}
		})
	}
	else {
		res.status(403).json({message : "Nu ati completat corespunzator datele"});
	}
}

const delete_received_message = (req,res) => {
	if(req.headers['token'] && req.body && req.body.friend_username && req.body.message_to_delete)
	{
		JWT.verify(req.headers['token'], CONFIG.JWT_SECRET_KEY, (err, payload) => {
			if(err)
			{
				res.status(400).json({message : "Invalid token"});
			}
			else {
				User.findOne({username : payload.username})
					.then(currentUser => {
						User.findOne({username : req.body.friend_username})
							.then(targetUser => {
								if(targetUser === null)
								{
									res.status(404).json({message : "The user doesn't exist"});
								}
								else {

									var are_friends = (targetUser.friends.some(x => x === currentUser.username)) && 
									(currentUser.friends.some(x => x === targetUser.username));
									has_received_message = (currentUser.received_messages.some(x => x === req.body.message_to_delete)) &&
										(targetUser.sent_messages.some(x => x === req.body.message_to_delete));
									if(are_friends && has_received_message)
									{
										currentUser.received_messages = currentUser.received_messages.filter(x => x!== req.body.message_to_delete);
										currentUser.save();
										res.status(200).json({message : "Message deleted with succes"});
									}
									else if(!are_friends)
									{
										res.status(404).json({message : "This user is not your friend"});
									}
									else if(!has_received_message)
									{
										res.status(404).json({message : "You haven't received this message"});
									}
								}
							})
					})
			}
		})
	}
	else {
		res.status(400).json({message : "Nu ati completat corespunzator datele"});
	}
}

const delete_sent_message = (req,res) => {
	if(req.headers['token'] && req.body && req.body.friend_username && req.body.message_to_delete)
	{
		JWT.verify(req.headers['token'], CONFIG.JWT_SECRET_KEY, (err, payload) => {
			if(err)
			{
				res.status(400).json({message : "Invalid token"});
			}
			else {
				User.findOne({username : payload.username})
					.then(currentUser => {
						User.findOne({username : req.body.friend_username})
							.then(targetUser => {
								if(targetUser === null)
								{
									res.status(400).json({message : "This user doesn't exist"});
								}
								else {
									var are_friends = (targetUser.friends.some(x => x === payload.username)) &&
										(currentUser.friends.some(x => x === req.body.friend_username));
									var has_sent_message = (targetUser.received_messages.some(x => x === req.body.message_to_delete)) &&
										(currentUser.sent_messages.some(x => x === req.body.message_to_delete));
									if(are_friends && has_sent_message)
									{
										currentUser.sent_messages = currentUser.sent_messages.filter(x => x!== req.body.message_to_delete);
										currentUser.save();
										res.status(200).json({message : "Message deleted with succes"});
									}
									else if(!are_friends)
									{
										res.status(404).json({message : "This user is not your friend"});
									}		
									else if(!has_sent_message)
									{
										res.status(404).json({message : "You haven't sent this message"});
									}
								}
							})
					})
			}
		})
	}
	else {
		res.status(400).json({message : "Nu ati completat corespunzator datele"});
	}
}

const get_conv_list = (req,res) => {
	if(req.headers['token'] && req.body  && req.body.friend_username)
	{
		JWT.verify(req.headers['token'], CONFIG.JWT_SECRET_KEY, (err, payload) => {
			if(err)
			{
				res.status(400).json({message : "Invalid token"});
			}
			else {
				User.findOne({username : payload.username})
					.then(currentUser => {
						User.findOne({username : req.body.friend_username})
							.then(targetUser => {
								if(targetUser === null)
								{
									res.status(400).json({message : "This user doesn't exist"});
								}
								else {
									var convlist = [];
									
									 const messagesfromcurrentUser = currentUser.messages.filter(x => x.to_who === targetUser.username)
									 const messagesfromtargetUser = targetUser.messages.filter(x => x.to_who === currentUser.username)
										
										if(targetUser.messages[0].to_who === "")
										{
											if(messagesfromcurrentUser.length>messagesfromtargetUser.length)
											{
												var i = 0;
												while(messagesfromcurrentUser[i])
												{
													if(messagesfromcurrentUser[i])
													convlist.push(messagesfromcurrentUser[i]);
													if(messagesfromtargetUser[i])
													convlist.push(messagesfromtargetUser[i]);
													i++;
												}
											}
											else {
												var i = 0;
												while(messagesfromtargetUser[i])
												{
													if(messagesfromcurrentUser[i])
													convlist.push(messagesfromcurrentUser[i]);
													if(messagesfromtargetUser[i])
													convlist.push(messagesfromtargetUser[i]);
													i++;
												}
											}
										}
										else if(currentUser.messages[0].to_who === "")
										{
											if(messagesfromcurrentUser.length>messagesfromtargetUser.length)
											{
												var i = 0;
												while(messagesfromcurrentUser[i])
												{
													if(messagesfromcurrentUser[i])
													convlist.push(messagesfromcurrentUser[i]);
													if(messagesfromtargetUser[i])
													convlist.push(messagesfromtargetUser[i]);
													i++;
												}
											}
											else {
												var i = 0;
												while(messagesfromtargetUser[i])
												{
													if(messagesfromcurrentUser[i])
													convlist.push(messagesfromcurrentUser[i]);
													if(messagesfromtargetUser[i])
													convlist.push(messagesfromtargetUser[i]);
													i++;
												}
											}
										}
										res.send(convlist);
										
									
									// convlist.push({username : "Rares"});
									// res.send(convlist.length);

								// 	{var i = 0;
								// 	while(messagesfromcurrentUser[i] && messagesfromtargetUser[i])
								// 	{
								// 		if(messagesfromtargetUser[i])
								// 		{
								// 			convlist.push(messagesfromtargetUser[i]);
								// 		}
								// 		if(messagesfromcurrentUser[i])
								// 		{
								// 			convlist.push(messagesfromcurrentUser[i]);
								// 		}
								// 		i++;
								// 	}
								// 	res.send(convlist);
								// }
								// else {
								// 	var i = 0;
								// 	while(messagesfromcurrentUser[i] && messagesfromtargetUser[i])
								// 	{
								// 		if(messagesfromcurrentUser[i])
								// 		{
								// 			convlist.push(messagesfromcurrentUser[i]);
								// 		}
								// 		if(messagesfromtargetUser[i])
								// 		{
								// 			convlist.push(messagesfromtargetUser[i]);
								// 		}
								// 		i++;
								// 	}
								// 	res.send(convlist);
								// }

									// hasMessage = currentUser.messages.some(x => x.to_who === targetUser.username) && 
									// targetUser.messages.some(x => x.from_who === currentUser.username);
									// if(hasMessage)
									// {
									// 	var turn = -1;
									// 	if(turn === -1)
									// 	{
									// 		var i = currentUser.messages.length-1;
									// 		while(i>=0 && currentUser.messages[i].to_who!==targetUser.username)
									// 		i--;
									// 		res.json({from : currentUser.username, mesaj : currentUser.messages[i].continut});
									// 		turn = turn*-1;
									// 	}
									// 	else {
									// 		var i = targetUser.messages.length-1;
									// 		while(i>=0 && targetUser.messages[i].to_who!==currentUser.username)
									// 		i--;
									// 		res.json({from : targetUser.username, mesaj : targetUser.messages[i].continut});
									// 		turn = turn*-1;
									// 	}
									// }
								}
							})
					})
			}
		})
	}
}

module.exports = {
	register,
	login,
	update_my_data,
	my_data,
	search_for_new_friends,
	friend_requests,
	confirm_friend_request,
	decline_friend_request,
	send_message,
	delete_received_message,
	delete_sent_message,
	get_conv_list
}