const {
	saveAndSendMessage,
	updateAndSendMessage,
	saveAndSendGroupRequest,
	updateAndSendGroupRequestUpdate,
} = require("../controllers/chats");

module.exports = (io) => {
	io.activeSockets = {};

	io.on("connection", (socket) => {
		io.activeSockets[socket.id] = {};

		const updateSocketData = (key, value) => {
			if (io.activeSockets[socket.id]) {
				io.activeSockets[socket.id][key] = value;
			}
		};

		socket.on("user-connected", ({ userID }) => updateSocketData("userID", userID));

		socket.on("joinRoom", ({ roomID }) => updateSocketData("roomID", roomID));
		socket.on("leaveRoom", () => updateSocketData("roomID", null));

		socket.on("send-message", async (payload) => await saveAndSendMessage(io, socket, payload));
		socket.on("edit-message", async (payload) => await updateAndSendMessage(io, socket, payload));

		socket.on("send-request", async (payload) => saveAndSendGroupRequest(io, socket, payload));
		socket.on("update-request", async (payload) => updateAndSendGroupRequestUpdate(io, socket, payload));

		socket.on("disconnect", () => {
			delete io.activeSockets[socket.id];
		});
	});
};
