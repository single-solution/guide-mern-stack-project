const mongoose = require("mongoose");

const countrySchema = mongoose.Schema(
	{
		code: { type: String, required: true },
		title: { type: String, required: true },
		currency: {
			code: { type: String, required: true },
			symbol: { type: String, required: true },
		},
		states: [{ title: { type: String, required: true }, code: { type: String, required: true } }],
		isActive: { type: Boolean, default: true },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	},
	{ timestamps: true },
);

module.exports = mongoose.model("countries", countrySchema);
