const mongoose = require("mongoose");

const subscriberSchema = mongoose.Schema(
	{
		email: { type: String, unique: true },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true },
);

module.exports = mongoose.model("subscribers", subscriberSchema);
