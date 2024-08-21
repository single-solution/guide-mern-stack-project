const mongoose = require("mongoose");

const subscriptionFeatureSchema = mongoose.Schema(
	{
		title: { type: String, required: true },
		description: String,
		position: Number,
		subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: "subscriptions" }],
		isActive: { type: Boolean, default: true },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	},
	{ timestamps: true },
);

module.exports = mongoose.model("subscriptionFeatures", subscriptionFeatureSchema);
