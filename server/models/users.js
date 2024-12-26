const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
	{
		username: String,
		email: String,
		password: String,
		about: {
			firstName: String,
			lastName: String,
			phone: String,
			streetAddress: String,
			country: { type: mongoose.Schema.Types.ObjectId, ref: "countries" },
			city: String,
			state: String,
			postalCode: String,
			profileImage: { filename: String, mimetype: String },
		},
		subscriptions: [
			{
				subscription: { type: mongoose.Schema.Types.ObjectId, ref: "subscriptions" },
				paymentID: String,
				schedule: { start: Date, end: Date },
				paymentStatus: { type: String, default: "unpaid" },
				isActive: { type: Boolean, default: false },
				isActiveByAdmin: { type: Boolean, default: false },
				cancellation: { status: { type: Boolean, default: false }, date: Date, reason: String },
			},
		],
		passwordReset: {
			count: { type: Number, min: 0, default: 0 },
			code: { type: Number, default: null },
			lastResetDate: Date,
			expiresAt: Date,
		},
		isVerified: {
			status: { type: Boolean, default: false },
			code: Number,
			createdAt: Date,
			expiresAt: Date,
		},
		userRole: { type: String, default: "user", enum: ["admin", "member", "user"] },
		isActive: { type: Boolean, default: true },
		isApproved: { type: Boolean, default: true },
		isFeatured: { type: Boolean, default: false },
		createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
		updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
	},
	{ timestamps: true },
);

userSchema.index({ email: 1, username: 1, userRole: 1 }, { unique: true });

// Middleware to convert username to lowercase before saving
userSchema.pre("save", function (next) {
	this.username = this.username.toLowerCase();
	this.email = this.email.toLowerCase();
	next();
});

module.exports = mongoose.model("users", userSchema);
