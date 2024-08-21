const mongoose = require("mongoose");

const chatGroupSchema = mongoose.Schema(
	{
		title: { type: String, trim: true, required: true },
		description: { type: String, trim: true },
		profileImage: { filename: String, mimetype: String, url: String },
		members: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
		admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
		invites: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
		requests: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
		lastMessage: {
			message: { type: mongoose.Schema.Types.ObjectId, ref: "chatMessages" },
			seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
			timestamp: { type: Date, default: Date.now },
		},
		isActive: { type: Boolean, default: true },
		type: { type: String, enum: ["private", "public"], default: "private" },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	},
	{ timestamps: true },
);

module.exports = mongoose.model("chatGroups", chatGroupSchema);
