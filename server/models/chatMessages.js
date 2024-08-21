const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
	{
		sender: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
		receiver: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		group: { type: mongoose.Schema.Types.ObjectId, ref: "chatGroups" },
		type: { type: String, enum: ["text", "media", "file", "system"], default: "text" },
		content: {
			text: { type: String, trim: true },
			media: { filename: String, mimetype: String, url: String },
			file: { filename: String, mimetype: String, url: String },
		},
		reactions: [
			{
				user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
				type: { type: String, enum: ["like", "love", "laugh", "angry", "sad", "wow"], required: true },
			},
		],
		status: [
			{
				user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
				status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
				timestamp: { type: Date, default: Date.now },
			},
		],
		mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
		isEdited: { type: Boolean, default: false },
		isDeleted: { type: Boolean, default: false },
		editedAt: { type: Date },
		deletedAt: { type: Date },
	},
	{ timestamps: true },
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
