const subscriptions = require("../models/subscriptions");
const users = require("../models/users");
const { sendJsonResponse, sendEmail } = require("../utils/helpers");
const moment = require("moment");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.WEBHOOK_ENDPOINT_SECRET;

const getPaymentInfo = async (request, response) => {
	let paymentInfo = null;

	try {
		const { paymentType, paymentID } = request.query;

		if (paymentType === "recurring") {
			paymentInfo = await stripe.subscriptions.retrieve(paymentID);
		} else if (paymentType === "once") {
			paymentInfo = await stripe.payments.retrieve(paymentID);
		}

		if (paymentInfo) return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record Found", paymentInfo);
		return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "No Record Found!", null);
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const getPaymentSession = async (request, response) => {
	const originUrl = request?.headers?.origin;
	const { gateway, product, payment } = request.query;
	const { userID: authenticatingUserID } = request.jwtPayload;

	let productDetails = {};

	try {
		if (!gateway || (!product && !payment)) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		if (gateway !== "stripe") {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOT_ACCEPTABLE, false, "Payment Channel Not Supported!", null);
		}

		if (product?.type && product?.id) {
			switch (product?.type) {
				case "subscription":
					const subscriptionDBPayload = await subscriptions.findOne({ _id: product?.id });
					if (!subscriptionDBPayload?._id) {
						return sendJsonResponse(
							response,
							HTTP_STATUS_CODES.NOT_FOUND,
							false,
							"Subscription not found in database",
							null,
						);
					}

					productDetails = {
						paymentMode: subscriptionDBPayload?.payment?.type === "recurring" ? "subscription" : "payment",
						priceKey: subscriptionDBPayload?.payment?.priceKey,
						quantity: 1,
					};
					break;
				default:
					break;
			}
		} else if (payment?.amount) {
			console.log("payment type request");
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOT_ACCEPTABLE, false, "Payment Mode Not Supported!", null);
		}

		if (!productDetails?.priceKey) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOT_FOUND, false, "Price Key Not Found!", null);
		}

		const session = await stripe.checkout.sessions.create({
			mode: productDetails.paymentMode,
			payment_method_types: ["card"],
			line_items: [{ price: productDetails.priceKey, quantity: productDetails.quantity }],
			allow_promotion_codes: true,
			client_reference_id: authenticatingUserID,
			metadata: { product: product?.type, productID: product?.id },
			success_url: originUrl + "?payment-status=success",
			cancel_url: originUrl + "?payment-status=failed",
		});

		if (session) {
			sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Payment Session Created::success", session);
		} else {
			sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Payment Session Created::failure", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const handleWebhook = async (request, response) => {
	let event = null;
	let paymentInfo = null;
	let session = { client_reference_id: null, paymentID: null, paymentStatus: null, product: null, productID: null };

	try {
		const sig = request.headers["stripe-signature"];
		event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);

		switch (event.type) {
			case STRIPE_EVENTS.SESSION_COMPLETED:
				const eventPayload = event.data.object;

				session = {
					client_reference_id: eventPayload?.client_reference_id,
					paymentID: eventPayload?.subscription || eventPayload?.payment_intent,
					paymentStatus: eventPayload?.payment_status,
					product: eventPayload?.metadata?.product,
					productID: eventPayload?.metadata?.productID,
				};

				break;
			case STRIPE_EVENTS.PAYMENT_SUCCEEDED:
				// Handle other events if needed
				break;
			case STRIPE_EVENTS.PAYMENT_FAILED:
				// Handle other events if needed
				break;
			case STRIPE_EVENTS.ACCOUNT_UPDATED:
				// Handle other events if needed
				break;
			default:
				return response.status(400).end();
		}

		if (!session?.client_reference_id || !session?.paymentID || !session?.product || !session?.productID) {
			response.status(200).json({ received: false });
		}

		if (session?.product === "subscription") {
			if (session?.paymentID?.startsWith("sub")) paymentInfo = await stripe.subscriptions.retrieve(session.paymentID);
			else if (session?.paymentID?.startsWith("pi")) paymentInfo = await stripe.paymentIntents.retrieve(session.paymentID);

			if (paymentInfo) {
				// Check if the user has a subscription with the given productID
				const user = await users.findOne({
					_id: session.client_reference_id,
					"subscriptions.subscription": session.productID,
				});

				if (user) {
					await users.findOneAndUpdate(
						{ _id: session.client_reference_id, "subscriptions.subscription": session.productID },
						{
							$set: {
								"subscriptions.$.paymentID": session.paymentID,
								"subscriptions.$.schedule.start": new Date(
									(paymentInfo?.current_period_start || paymentInfo?.created) * 1000,
								),
								"subscriptions.$.schedule.end": new Date(
									(paymentInfo?.current_period_end || paymentInfo?.created) * 1000,
								),
								"subscriptions.$.paymentStatus": session.paymentStatus || "pending",
								"subscriptions.$.isActive": paymentInfo?.status ? true : false,
								"subscriptions.$.isActiveByAdmin": false,
								"subscriptions.$.cancelation.status": false,
								"subscriptions.$.cancelation.date": null,
								"subscriptions.$.cancelation.reason": null,
							},
						},
						{ new: true },
					);
				} else {
					await users.findOneAndUpdate(
						{ _id: session.client_reference_id },
						{
							$push: {
								subscriptions: {
									subscription: session.productID,
									paymentID: session.paymentID,
									schedule: {
										start: new Date((paymentInfo?.current_period_start || paymentInfo?.created) * 1000),
										end: new Date((paymentInfo?.current_period_end || paymentInfo?.created) * 1000),
									},
									paymentStatus: session.paymentStatus || "pending",
									isActive: paymentInfo?.status ? true : false,
									isActiveByAdmin: false,
									cancelation: { status: false, date: null, reason: null },
								},
							},
						},
						{ new: true, upsert: true },
					);
				}

				const emailReplacements = { subject: "Subscription Purchased", subscription: "" };
				await sendEmail(updatedUser?.email, emailReplacements, "subscriptionBuy.html");
				response.status(200).json({ received: true });
			}
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const cancelSubscriptionPlan = async (request, response) => {
	try {
		const { productID } = request.query;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!productID) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const authenticatingDBUser = await users.findOne({ _id: authenticatingUserID });

		if (authenticatingDBUser?.subscriptions?.length > 0) {
			const subscriptionIndex = authenticatingDBUser?.subscriptions?.findIndex(
				(subscription) => subscription?.subscription.toString() === productID,
			);

			if (subscriptionIndex !== -1) {
				const paymentID = authenticatingDBUser?.subscriptions?.[subscriptionIndex]?.paymentID;
				const updatedSubscription = await stripe.subscriptions.update(paymentID, { cancel_at_period_end: true });

				const updatedUser = await users.findOneAndUpdate(
					{ _id: authenticatingDBUser._id },
					{
						$set: {
							[`subscriptions.${subscriptionIndex}.subscription`]: productID,
							[`subscriptions.${subscriptionIndex}.paymentID`]: null,
							[`subscriptions.${subscriptionIndex}.schedule`]: { start: null, end: null },
							[`subscriptions.${subscriptionIndex}.paymentStatus`]: "unpaid",
							[`subscriptions.${subscriptionIndex}.isActive`]: false,
							[`subscriptions.${subscriptionIndex}.isActiveByAdmin`]: false,
							[`subscriptions.${subscriptionIndex}.cancelation`]: {
								status: true,
								date: new Date(updatedSubscription?.canceled_at * 1000),
							},
						},
					},
				);

				if (updatedUser) {
					const emailReplacements = {
						subject: "Subscription Cancelled",
						user: updatedUser?.firstName + " " + updatedUser?.lastName,
						subscription: "",
						message: `Your subscription will still work till ${moment(updatedUser?.subscription?.expiryDate).format(
							"ddd MMM DD, YYYY",
						)}, and you will no longer be charged after this date. Your profile will be changed to free member, all your information will remain the same but your pictures will be deleted and you will need to upload them again to your portfolio.`,
					};

					await sendEmail(updatedUser?.email, emailReplacements, "subscriptionCancel.html");

					return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record updated::success", updatedUser);
				} else {
					return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record updated::failure", null);
				}
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Subscription Update Error!", null);
			}
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "Subscriptions Not Found!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

module.exports = {
	getPaymentSession,
	handleWebhook,
	getPaymentInfo,
	cancelSubscriptionPlan,
};
