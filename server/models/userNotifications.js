const mongoose = require("mongoose");

const userNotificationSchema = new mongoose.Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		type: { type: String, enum: ["message", "invite", "request"] },
		message: {
			type: { type: String, enum: ["group", "private"] },
			message: String,
			sender: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
			group: { type: mongoose.Schema.Types.ObjectId, ref: "chatGroups" },
			isRead: { type: Boolean, default: false },
		},
		invite: {
			type: { type: String, enum: ["group"] },
			message: String,
			sender: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
			group: { type: mongoose.Schema.Types.ObjectId, ref: "chatGroups" },
			isRead: { type: Boolean, default: false },
			status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
		},
		request: {
			type: { type: String, enum: ["group", "private"] },
			sender: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
			group: { type: mongoose.Schema.Types.ObjectId, ref: "chatGroups" },
			isRead: { type: Boolean, default: false },
			status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
		},
		isRead: { type: Boolean, default: false },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	},
	{ timestamps: true },
);

module.exports = mongoose.model("userNotifications", userNotificationSchema);
