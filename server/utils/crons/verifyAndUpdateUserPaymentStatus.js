require("dotenv").config(); //get secret keys from env files
const { mongoose } = require("mongoose");
const moment = require("moment");
const users = require("../../models/users");
const subscriptions = require("../../models/subscriptions");
const { sendEmail } = require("../helpers");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// connect database
mongoose
	.connect(process.env.MONGO_DB_CONNECTION_URL, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(async () => {
		console.log(`-> Database connected::success\t-> ${moment().format("YYYY-MM-D, HH:mm:ss")}\n\n`);

		await verifyAndUpdateUserPaymentStatus();
	});

const verifyAndUpdateUserPaymentStatus = async () => {
	let paymentInfo = {};

	try {
		const usersHavingSubscriptions = await users
			.find({ "subscriptions.0": { $exists: true } })
			.populate("subscriptions.subscription")
			.lean();
		console.log("Total Event Bookings -> " + usersHavingSubscriptions?.length);

		if (usersHavingSubscriptions?.length) {
			for (let user of usersHavingSubscriptions) {
				console.log(`->User Found With Email\t->${user?.email} \t-> ${moment().format("YYYY-MM-D, HH:mm:ss")}\n`);
				console.log(
					`->Total Subscriptions Purchased\t->${user?.subscriptions?.length} \t-> ${moment().format(
						"YYYY-MM-D, HH:mm:ss",
					)}\n`,
				);

				for (let subscription of user.subscriptions) {
					if (subscription.paymentID.startsWith("sub")) {
						paymentInfo = await stripe.subscriptions.retrieve(subscription.paymentID);
						await processSubscription(user, subscription, paymentInfo);
					} else if (subscription.paymentID.startsWith("pi")) {
						paymentInfo = await stripe.paymentIntents.retrieve(subscription.paymentID);
						// Process payment intents if needed
					}
				}
			}
		} else {
			console.log(`->No Bookings Found To Send Reminder\t-> ${moment().format("YYYY-MM-D, HH:mm:ss")}\n`);
		}

		// Close MongoDB connection
		await mongoose.connection.close();
		process.exit(1);
	} catch (error) {
		console.error("An error occurred:", error);
		process.exit(1);
	}
};

const processSubscription = async (user, subscription, paymentInfo) => {
	const subscriptionExpiryDateFromStripe = new Date(paymentInfo.current_period_end * 1000);
	const subscriptionExpiryDateFromDB = new Date(subscription.schedule.end);
	const currentDate = new Date();
	const timeDifference = subscriptionExpiryDateFromDB.getTime() - currentDate.getTime();
	const daysRemaining = Math.ceil(timeDifference / (1000 * 3600 * 24)); // Convert milliseconds to days and round up

	let updatedUser = {};
	let emailSubject = "";
	let emailDescription = "";

	if (subscriptionExpiryDateFromStripe.toDateString() !== subscriptionExpiryDateFromDB.toDateString()) {
		updatedUser = await users.findOneAndUpdate(
			{ _id: user?._id, "subscriptions.subscription": session.productID },
			{ $set: { "subscriptions.$.schedule.end": subscriptionExpiryDateFromStripe } },
			{ new: true },
		);

		emailSubject = "Subscription Updated";
		emailDescription = `Your "${
			subscription?.subscription?.title
		}" subscription expiry date is updated. Next Expiry is ${moment(subscriptionExpiryDateFromStripe).format("YYYY-MM-D")}`;
	} else if (daysRemaining === 7 || daysRemaining === 3 || daysRemaining === 1) {
		emailSubject = "Subscription Expiring Soon";
		emailDescription = `You have ${daysRemaining > 1 ? `${daysRemaining} Days` : "1 Day"} left for your "${
			subscription.title
		}" subscription.`;
	} else if (daysRemaining <= 0) {
		updatedUser = await users.findOneAndUpdate(
			{ _id: user?._id, "subscriptions.subscription": session.productID },
			{ $set: { "subscriptions.$.paymentStatus": "pending", "subscriptions.$.isActive": false } },
			{ new: true },
		);

		emailSubject = "Subscription Updated";
		emailDescription = `Your "${subscription?.subscription?.title}" subscription has expired. Please buy the subscription again if you want to continue using it content`;
	}

	if (updatedUser?._id) {
		if (emailSubject) {
			// Sending reminder
			const emailPayload = await sendEmail(
				user.email,
				{
					user:
						user?.about?.firstName && user?.about?.lastName
							? `${user.about.firstName} ${user.about.lastName}`
							: user?.about?.firstName || user?.about?.lastName || "User",
					subject: emailSubject,
					description: emailDescription,
				},
				"generalInfo.html",
			);

			// Logging reminder status
			const userEmail = user.email.slice(0, 5) + "..." + user.email.slice(-5);
			const reminderStatus = emailPayload?.accepted?.[0] ? "sent" : "failed to send";
			console.log(
				`Reminder for ${emailSubject} ${reminderStatus} to email: ${userEmail} -> Fetched-at: ${moment().format(
					"YYYY-MM-D, HH:mm:ss",
				)}`,
			);
		}
	} else {
		console.log(`Failed To Update user: ${userEmail} -> Fetched-at: ${moment().format("YYYY-MM-D, HH:mm:ss")}`);
	}
};
