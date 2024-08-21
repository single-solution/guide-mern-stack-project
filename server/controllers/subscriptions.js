const { sendJsonResponse } = require("../utils/helpers.js");
const subscriptions = require("../models/subscriptions.js");
const subscriptionFeatures = require("../models/subscriptionFeatures.js");
const countries = require("../models/countries.js");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const getSubscriptions = async (request, response) => {
	try {
		const { _id: itemID, page, limit, count } = request.query;

		if (count === "true") {
			const totalRecords = await subscriptions.countDocuments({});
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Total Records!", { total: totalRecords });
		}

		if (!itemID && (!page || !limit)) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const dbPayload = await subscriptions
			.find(itemID ? { _id: itemID } : {})
			.populate("payment.country")
			.limit(limit)
			.skip(page && (page - 1) * limit)
			.lean();

		if (dbPayload.length > 0) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record Found!", itemID ? dbPayload[0] : dbPayload);
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "Record not Found!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const createSubscription = async (request, response) => {
	try {
		const payload = request.body;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!payload?.title) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing or invalid parameters!", null);
		}

		const product = await stripe.products.create({ name: payload.title, description: payload.description, type: "service" });

		if (product?.id) {
			const country = await countries.findOne({ _id: payload?.payment?.countryID }, { "currency.code": 1 });

			const productPrice = await stripe.prices.create({
				product: product.id,
				unit_amount: payload?.payment?.price * 100,
				currency: country?.currency?.code,
				...(payload?.payment?.type === "recurring" && { recurring: { interval: payload?.duration?.type } }),
			});

			if (productPrice?.id) {
				const payloadToSaveInDB = new subscriptions({
					...payload,
					"payment.priceKey": productPrice?.id,
					"payment.country": payload?.payment?.countryID,
					createdBy: authenticatingUserID,
					updatedBy: authenticatingUserID,
				});

				const newDBPayload = await payloadToSaveInDB.save();

				if (newDBPayload) {
					if (payload?.features?.length) {
						for (let subscriptionFeatureID of payload?.features) {
							await subscriptionFeatures.findOneAndUpdate(
								{ _id: subscriptionFeatureID },
								{ $push: { subscriptions: newDBPayload?._id } },
								{ new: true },
							);
						}
					}

					return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record created successfully", newDBPayload);
				} else {
					return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Failed to create record", null);
				}
			} else {
				return sendJsonResponse(
					response,
					HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
					false,
					"Failed to create product pricing",
					null,
				);
			}
		} else {
			return sendJsonResponse(
				response,
				HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
				false,
				"Failed to create stripe product",
				null,
			);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const updateSubscription = async (request, response) => {
	try {
		const payload = request.body;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!payload?._id || !payload?.payment?.priceKey) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const stripePriceData = await stripe.prices.retrieve(payload.payment.priceKey);

		if (stripePriceData?.product) {
			await stripe.products.update(stripePriceData.product, {
				name: payload.title,
				description: payload.description,
			});

			const country = await countries.findOne({ _id: payload?.payment?.countryID }, { "currency.code": 1 });

			const productPrice = await stripe.prices.create({
				product: stripePriceData?.product,
				unit_amount:
					(payload?.discount?.type
						? payload?.discount?.type === "flat"
							? payload?.payment?.price - payload?.discount?.value
							: payload?.payment?.price - (payload?.payment?.price * payload?.discount?.value) / 100
						: payload?.payment?.price) * 100,
				currency: country?.currency?.code,
				...(payload?.payment?.type === "recurring" && {
					recurring: { interval: payload?.duration?.type, interval_count: payload?.duration?.value },
				}),
			});

			if (productPrice?.id) {
				await stripe.prices.update(payload.payment.priceKey, { active: false });
				payload.payment.priceKey = productPrice?.id;
			}

			if (payload?.payment?.countryID) payload.payment.country = payload.payment.countryID;

			const updatedDBPayload = await subscriptions.findOneAndUpdate(
				{ _id: payload._id },
				{ $set: { ...payload, updatedBy: authenticatingUserID } },
				{ new: true },
			);

			if (updatedDBPayload) {
				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record updated::success", updatedDBPayload);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record updated::failure", null);
			}
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "No Product Found In Stripe", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

const deleteSubscription = async (request, response) => {
	try {
		const { _id: deleteItemID } = request.query;

		if (!deleteItemID) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const subscriptionDBPayload = await subscriptions.findOne({ _id: deleteItemID });

		const stripePriceData = await stripe.prices.retrieve(subscriptionDBPayload?.payment?.priceKey);

		if (stripePriceData?.product) {
			const prices = await stripe.prices.list({ product: stripePriceData?.product });
			for (const price of prices.data) {
				if (price.active) await stripe.prices.update(price.id, { active: false });
			}

			await stripe.products.update(stripePriceData?.product, { active: false });

			const deletedDBPayload = await subscriptions.findOneAndDelete({ _id: deleteItemID }, { new: true });

			if (deletedDBPayload) {
				await subscriptionFeatures.updateMany({}, { $pull: { subscriptions: deletedDBPayload?._id } }, { new: true });

				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record delete::success", deletedDBPayload);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record delete::failure", null);
			}
		} else {
			return sendJsonResponse(
				response,
				HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
				false,
				"Stripe Price Key Data Not Found!",
				null,
			);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Error!", {
			error: error?.message || error,
		});
	}
};

module.exports = {
	getSubscriptions,
	createSubscription,
	updateSubscription,
	deleteSubscription,
};
