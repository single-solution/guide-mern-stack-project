const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const users = require("../models/users.js");
const chatMessages = require("../models/chatMessages");
const chatGroups = require("../models/chatGroups.js");
const { sendJsonResponse, convertImageToWebp, generateUniqueFilename } = require("../utils/helpers.js");
const { createUserNotification } = require("./userNotifications.js");
const userNotifications = require("../models/userNotifications.js");

const placeholderImage = path.join(__dirname, "../assets/placeholders/user-profile.webp");
const filePath = path.join(__dirname, "../assets/images");
const mediaFilePath = path.join(__dirname, "../assets");

const getChat = async (request, response) => {
	let query = {};

	try {
		const { senderID, receiverID, groupID, message, page, limit, reported } = request.query;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!senderID && !receiverID && !groupID && !message && (!page || !limit)) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Invalid parameters!", null);
		}

		if (authenticatingUserID && groupID) {
			const authenticatingDBUser = await users.findOne({ _id: authenticatingUserID });
			const dbChatGroup = await chatGroups.findOne({
				_id: groupID,
				$or: [{ members: authenticatingUserID }, { admins: authenticatingUserID }],
			});

			if (!dbChatGroup && authenticatingDBUser?.userRole !== "admin") {
				return sendJsonResponse(response, HTTP_STATUS_CODES.FORBIDDEN, false, "Not a member!", null);
			}
		}

		if (reported) query.report = { $exists: true };
		if (senderID) query.sender = senderID;
		if (receiverID) query.receiver = receiverID;
		if (groupID) query.group = groupID;
		if (message) query.message = new RegExp(message, "i");

		const dbChatMessages = await chatMessages
			.find(query)
			.populate("sender", "about")
			.limit(limit)
			.skip(page && (page - 1) * limit);

		if (dbChatMessages.length) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record Found!", dbChatMessages);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "Record not Found!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const getChatMessageMedia = async (request, response) => {
	try {
		const { filename, width, mimetype } = request.query;

		if (!filename || !mimetype) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		let filePathByMediaType = null;

		if (mimetype?.startsWith("video")) {
			filePathByMediaType = path.join(mediaFilePath, "videos");
		} else if (mimetype.startsWith("image")) {
			filePathByMediaType = path.join(mediaFilePath, "images");
		} else {
			filePathByMediaType = path.join(mediaFilePath, "files");
		}

		const fileFullPath = path.join(filePathByMediaType, filename);
		const isFileExists = fs.existsSync(fileFullPath);

		const sourceFile = fs.readFileSync(isFileExists ? fileFullPath : placeholderImage);
		const optimizedImage =
			mimetype.startsWith("image") && width ? await sharp(sourceFile).resize(parseInt(width)).toBuffer() : sourceFile;

		response.writeHead(200, {
			"Content-Type": mimetype,
		});

		response.end(optimizedImage);
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const saveAndSendMessage = async (io, socket, message) => {
	let chatMessage = null;

	try {
		if (!message?.type) return;

		switch (message.type) {
			case "text":
				chatMessage = new chatMessages({
					type: message?.type,
					message: message?.message,
					sender: message?.sender,
					group: message?.groupID,
					receiver: message?.receiver,
				});
				break;

			case "media":
				let filePathByMediaType = null;

				if (message?.media?.mimetype?.startsWith("video")) {
					filePathByMediaType = path.join(mediaFilePath, "videos");
				} else if (message?.media?.mimetype.startsWith("image")) {
					filePathByMediaType = path.join(mediaFilePath, "images");
				} else {
					filePathByMediaType = path.join(mediaFilePath, "files");
				}

				// const generatedFileName = generateUniqueFilename(file, filePath);
				const fileFullPath = path.join(filePathByMediaType, message?.media?.filename);
				await fs.promises.writeFile(fileFullPath, message?.media?.file);

				chatMessage = new chatMessages({
					type: message?.type,
					media: { mimetype: message?.media?.mimetype, filename: message?.media?.filename },
					sender: message?.sender,
					group: message?.groupID,
					receiver: message?.receiver,
				});
				break;

			default:
				break;
		}

		const createdPayload = await chatMessage.save();

		if (!createdPayload) throw new Error("Failed to save chat message");

		const socketsToSendMessage = Object.entries(io.activeSockets)
			.filter(
				([socketID, data]) =>
					data.roomID === createdPayload?.group?.toString() || data.userID === createdPayload?.sender?.toString(),
			)
			.map(([socketID]) => socketID);

		for (let socketID of socketsToSendMessage) {
			io.to(socketID).emit("receive-message", createdPayload);
		}

		if (createdPayload?.group) {
			const { members, admins } = await chatGroups.findOne({ _id: createdPayload.group }, { members: 1, admins: 1, _id: 0 });

			const allGroupMembersToSendNotification = [
				...new Set([...members.map((id) => id.toString()), ...admins.map((id) => id.toString())]),
			].filter((memberID) => !socketsToSendMessage.some((socketID) => io.activeSockets[socketID].userID === memberID));

			for (let groupMember of allGroupMembersToSendNotification) {
				const notificationPayload = await createUserNotification({
					user: groupMember,
					type: "message",
					message: {
						type: "group",
						message: "Message",
						sender: createdPayload?.sender,
						group: createdPayload?.group,
					},
				});

				if (notificationPayload) {
					const socketToSendNotification = Object.keys(io.activeSockets).find(
						(socketID) => io.activeSockets[socketID].userID === groupMember,
					);

					if (socketToSendNotification) {
						io.to(socketToSendNotification).emit("receive-notification", {
							type: "info",
							message: `New message received.`,
						});
					}
				}
			}
		}
	} catch (error) {
		console.error(error);
	}
};

const updateAndSendMessage = async (io, socket, message) => {
	try {
		const updatePayload = await chatMessages.findOneAndUpdate(
			{ _id: message._id },
			{ $set: { message: message.message, edited: { status: true, date: new Date() } } },
			{ new: true },
		);

		if (updatePayload) {
			socket.emit("receive-updated-message", updatePayload);
			return updatePayload;
		}
	} catch (error) {
		console.error(error);
	}
};

const deleteChatMessage = async (request, response) => {
	try {
		const { _id: deleteItemID } = request.query;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!deleteItemID) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const authenticatingDBUser = await users.findOne({ _id: authenticatingUserID });
		const dbChatMessage = await chatMessages.findOne({ _id: deleteItemID });

		if (dbChatMessage?.sender?._id.toString() === authenticatingUserID || authenticatingDBUser?.userRole === "admin") {
			const deletedChatMessage = await chatMessages.findOneAndDelete({ _id: deleteItemID }, { new: true });

			if (deletedChatMessage) {
				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record delete::success", deletedChatMessage);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record delete::failure", null);
			}
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.UNAUTHORIZED, false, "Permission denied!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const getChatReports = async (request, response) => {
	let query = {};

	try {
		const { page, limit } = request.query;

		if (!page || !limit) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing Parameters!", null);
		}

		query.report = { $exists: true, $ne: null };

		const dbChatMessages = await chatMessages
			.find(query)
			.populate("sender report.reporter")
			.limit(limit)
			.skip(page && (page - 1) * limit);

		if (dbChatMessages.length) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record Found!", dbChatMessages);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "Record not Found!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const reportMessage = async (request, response) => {
	try {
		const { _id: itemID } = request.body;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!itemID) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const dbUpdatedPayload = await chatMessages.findOneAndUpdate(
			{ _id: itemID },
			{
				$set: { report: { status: "pending", reporter: authenticatingUserID, message: "" }, updatedBy: authenticatingUserID },
			},
			{ new: true },
		);

		if (dbUpdatedPayload) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record updated::success", dbUpdatedPayload);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record updated::failure", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const updateMessageReportStatus = async (request, response) => {
	try {
		const payload = request.body;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!payload._id) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const updatedChatMessage = await chatMessages.findOneAndUpdate(
			{ _id: payload._id },
			{ $set: { "report.status": payload?.status, updatedBy: authenticatingUserID } },
			{ new: true },
		);

		if (updatedChatMessage) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record updated::success", updatedChatMessage);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record updated::failure", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const getChatGroups = async (request, response) => {
	let query = {};

	try {
		const { userID: authenticatingUserID } = request?.jwtPayload;

		const { _id: chatGroupID, page, limit, includePublicGroups, searchKey } = request.query;

		if (!chatGroupID && (!page || !limit)) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const userDBPayload = await users.findOne({ _id: authenticatingUserID });

		if (userDBPayload.userRole !== "admin") {
			if (chatGroupID) {
				query._id = chatGroupID;
			} else if (includePublicGroups && authenticatingUserID) {
				query.$or = [{ groupType: "public" }, { members: authenticatingUserID }, { admins: authenticatingUserID }];
			} else if (authenticatingUserID) {
				query.$or = [{ members: authenticatingUserID }, { admins: authenticatingUserID }];
			} else if (includePublicGroups) {
				query.groupType = "public";
			}
		}

		if (searchKey) query.title = new RegExp(searchKey, "i");

		const dbChatGroups = await chatGroups
			.find(query)
			.limit(limit)
			.skip(page && (page - 1) * limit);

		if (dbChatGroups.length) {
			return sendJsonResponse(
				response,
				HTTP_STATUS_CODES.OK,
				true,
				"Record Found!",
				chatGroupID ? dbChatGroups[0] : dbChatGroups,
			);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "Record not Found!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const getChatGroupImage = async (request, response) => {
	try {
		const { filename, width, mimetype } = request.query;

		if (!filename || !mimetype) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const fileFullPath = path.join(filePath, filename);
		const isFileExists = fs.existsSync(fileFullPath);

		const sourceFile = fs.readFileSync(isFileExists ? fileFullPath : placeholderImage);
		const optimizedImage =
			mimetype.startsWith("image") && width ? await sharp(sourceFile).resize(parseInt(width)).toBuffer() : sourceFile;

		response.writeHead(200, {
			"Content-Type": mimetype,
		});

		response.end(optimizedImage);
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const createChatGroup = async (request, response) => {
	try {
		const payload = request.body;
		const { userID: authenticatingUserID } = request.jwtPayload;
		const files = request.files;

		if (!payload?.title || !payload?.members?.length) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		if (files?.length) {
			let file = files[0];
			if (file.mimetype.startsWith("image")) file = await convertImageToWebp(file);

			const generatedFileName = generateUniqueFilename(file, filePath);
			const fileFullPath = path.join(filePath, generatedFileName);

			await fs.promises.writeFile(fileFullPath, file.buffer);
			payload.media = { mimetype: file.mimetype, filename: generatedFileName };
		}

		payload.admins = [authenticatingUserID];
		payload.members = Array.isArray(payload.members) ? payload.members : JSON.parse(payload.members);
		payload.members = payload.members.filter((member) => member !== authenticatingUserID);

		const chatGroup = new chatGroups({
			...payload,
			createdBy: authenticatingUserID,
			updatedBy: authenticatingUserID,
		});

		const newChatGroup = await chatGroup.save();

		if (newChatGroup) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record created::success", newChatGroup);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record created::failure", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const updateChatGroup = async (request, response) => {
	try {
		const payload = request.body;
		const { userID: authenticatingUserID } = request.jwtPayload;
		const files = request.files;

		if (!payload._id) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const authenticatingDBUser = await users.findOne({ _id: authenticatingUserID });

		if (payload?.userID === authenticatingUserID || authenticatingDBUser?.userRole === "admin") {
			const dbChatGroup = await chatGroups.findOne({ _id: payload._id });

			if (files.length) {
				let file = files[0];
				if (file.mimetype.startsWith("image")) file = await convertImageToWebp(file);

				const generatedFileName = generateUniqueFilename(file, filePath);
				const fileFullPath = path.join(filePath, generatedFileName);

				await fs.promises.writeFile(fileFullPath, file.buffer);

				payload.media = { mimetype: file.mimetype, filename: generatedFileName };
			}

			const updatedChatGroup = await chatGroups.findOneAndUpdate(
				{ _id: payload._id },
				{ $set: { ...payload, updatedBy: authenticatingUserID } },
				{ new: true },
			);

			if (updatedChatGroup) {
				if (dbChatGroup?.media?.filename) {
					const existingFilePath = path.join(filePath, dbChatGroup.media.filename);
					const isThereExistingFile = fs.existsSync(existingFilePath);

					if (isThereExistingFile) await fs.promises.unlink(existingFilePath);
				}

				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record updated::success", updatedChatGroup);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record updated::failure", null);
			}
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.UNAUTHORIZED, false, "Permission denied!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const leaveChatGroup = async (request, response) => {
	try {
		const { _id: chatGroupID } = request.query;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!chatGroupID) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const authenticatingDBUser = await users.findOne({ _id: authenticatingUserID });

		if (authenticatingDBUser?._id) {
			const updatedChatGroup = await chatGroups.findOneAndUpdate(
				{ _id: chatGroupID },
				{ $pull: { members: { $in: [authenticatingUserID] } } },
				{ new: true },
			);

			if (updatedChatGroup) {
				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Group Left::success", updatedChatGroup);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Group Left::failure", null);
			}
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.UNAUTHORIZED, false, "Permission denied!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const deleteChatGroup = async (request, response) => {
	try {
		const { _id: chatGroupID } = request.query;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!chatGroupID) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const authenticatingDBUser = await users.findOne({ _id: authenticatingUserID });
		const dbChatGroup = await chatGroups.findOne({ _id: chatGroupID });

		if (dbChatGroup?.admins.includes(authenticatingUserID) || authenticatingDBUser?.userRole === "admin") {
			const deletedChatGroup = await chatGroups.findOneAndDelete({ _id: chatGroupID }, { new: true });

			if (deletedChatGroup) {
				if (deletedChatGroup?.media?.filename) {
					const fileFullPath = path.join(filePath, dbChatGroup.media.filename);
					if (fs.existsSync(fileFullPath)) await fs.promises.unlink(fileFullPath);
				}

				await userNotifications.deleteMany({ type: "message", "message.group": chatGroupID });

				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record delete::success", deletedChatGroup);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record delete::failure", null);
			}
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.UNAUTHORIZED, false, "Permission denied!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const saveAndSendGroupRequest = async (io, socket, payload) => {
	if (!payload?.type) return;

	if (payload?.type === "group") {
		const { admins } = await chatGroups.findOne({ _id: payload.groupID }, { admins: 1, _id: 0 });

		for (let admin of admins) {
			const dbChatGroup = await chatGroups.findOne({
				_id: payload?.groupID,
				$or: [{ members: payload?.userID }, { admins: payload?.userID }, { requests: payload?.userID }],
			});

			if (!dbChatGroup) {
				const updatedChatGroup = await chatGroups.findOneAndUpdate(
					{ _id: payload?.groupID },
					{ $addToSet: { requests: payload?.userID } },
				);

				if (updatedChatGroup) {
					const notificationPayload = await createUserNotification({
						user: admin,
						type: "request",
						request: { type: "group", sender: payload?.userID, group: payload?.groupID },
					});

					if (notificationPayload) {
						const socketToSendNotification = Object.keys(io.activeSockets).find(
							(socketID) => io.activeSockets[socketID].userID === admin?.toString(),
						);

						if (socketToSendNotification) {
							io.to(socketToSendNotification).emit("receive-notification", {
								type: "info",
								message: "New Group Join Request",
							});
						}
					}
				}
			}
		}
	}
};

const updateAndSendGroupRequestUpdate = async (io, socket, payload) => {
	if (!payload?._id || !payload?.status) return;

	const dbNotificationPayload = await userNotifications.findOne({ _id: payload._id }, { request: 1, _id: 0 });

	if (dbNotificationPayload?.request?.sender) {
		const updatedDBGroupPayload = await chatGroups.findOneAndUpdate(
			{ _id: dbNotificationPayload?.request?.group },
			{
				$addToSet: { members: dbNotificationPayload.request.sender },
				$pull: { requests: dbNotificationPayload.request.sender },
			},
			{ new: true },
		);

		if (updatedDBGroupPayload) {
			const updatedDBNotificationPayload = await userNotifications.findOneAndUpdate(
				{ _id: payload._id },
				{ "request.status": payload.status },
				{ new: true },
			);

			if (updatedDBNotificationPayload) {
				const socketToSendNotification = Object.keys(io.activeSockets).find(
					(socketID) => io.activeSockets[socketID].userID === dbNotificationPayload.request.sender.toString(),
				);
				if (socketToSendNotification) {
					io.to(socketToSendNotification).emit("receive-notification", {
						type: "info",
						message: `Request to ${updatedDBGroupPayload?.title} got Accepted`,
					});
				}
			}
		}
	}
};

module.exports = {
	getChat,
	getChatMessageMedia,
	saveAndSendMessage,
	updateAndSendMessage,
	deleteChatMessage,
	getChatReports,
	reportMessage,
	updateMessageReportStatus,
	getChatGroups,
	getChatGroupImage,
	createChatGroup,
	updateChatGroup,
	leaveChatGroup,
	deleteChatGroup,
	saveAndSendGroupRequest,
	updateAndSendGroupRequestUpdate,
};
