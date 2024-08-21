const mongoose = require("mongoose");

const newsletterSchema = mongoose.Schema(
	{
		emails: [String],
		sentEmails: [String],
		failedEmails: [String],
		message: String,
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	},
	{ timestamps: true },
);

module.exports = mongoose.model("newsletters", newsletterSchema);
