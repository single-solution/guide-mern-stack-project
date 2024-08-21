const mongoose = require("mongoose");

const subscriptionSchema = mongoose.Schema(
	{
		title: { type: String, required: true },
		color: { type: String, default: "#cacaca" },
		description: String,
		subscriptionFeatures: [
			{
				feature: { type: mongoose.Schema.Types.ObjectId, ref: "subscriptionFeatures" },
				status: { type: Boolean, default: true },
			},
		],
		payment: {
			price: { type: Number, default: 0, min: 0 },
			type: { type: String, enum: ["once", "recurring"] },
			country: { type: mongoose.Schema.Types.ObjectId, ref: "countries" },
			discount: { type: { type: String, enum: ["flat", "percent"] }, value: Number },
		},
		coupons: [
			{
				code: String,
				expiry: Date,
				type: { type: String, enum: ["private", "public"], default: "public" },
				discount: { type: { type: String, enum: ["flat", "percent"] }, value: Number },
				eligibleUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
				buyers: [
					{
						user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
						purchaseDate: Date,
					},
				],
				status: { type: String, enum: ["available", "discarded"] },
			},
		],
		duration: { type: { type: String, enum: ["day", "week", "month", "year"] }, value: Number },
		type: { type: String, enum: ["free", "paid"], default: "paid" },
		isActive: { type: Boolean, default: true },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	},
	{ timestamps: true },
);

module.exports = mongoose.model("subscriptions", subscriptionSchema);
