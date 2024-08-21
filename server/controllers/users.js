const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const users = require("../models/users.js");
const {
	generateRandomNumber,
	addMinutesToDate,
	sendJsonResponse,
	optimizeAndConvertImage,
	generateUniqueFilename,
	sendEmail,
	convertMillisecondsToTimeFormat,
} = require("../utils/helpers.js");
const chatGroups = require("../models/chatGroups.js");

var privateKEY = fs.readFileSync(path.join(__dirname, "../assets/encryptionKeys/privateKey.key"), "utf8");
var publicKEY = fs.readFileSync(path.join(__dirname, "../assets/encryptionKeys/publicKey.key"), "utf8");

const mediaFilePath = path.join(__dirname, "../assets");

const getUser = async (request, response) => {
	let query = {};

	try {
		const { userID, page, limit, count, userRole, searchQuery } = request.query;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (count === "true") {
			const totalRecords = await users.countDocuments({ userRole: { $ne: "admin" } });
			return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Total Records!", { total: totalRecords });
		}

		const authenticatingDBUser = await users
			.findOne({ _id: authenticatingUserID }, { password: 0 })
			.populate("subscriptions.subscription");

		if (!userID && (!page || !limit)) {
			if (authenticatingDBUser)
				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record Found", authenticatingDBUser);
			else return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "No Record Found!", null);
		}

		if (
			authenticatingDBUser?.userRole === "admin" ||
			authenticatingDBUser?.userRole === "subAdmin" ||
			userID === authenticatingUserID
		) {
			if (userID) query._id = userID;
			if (userRole) query.userRole = userRole;
			if (searchQuery) {
				// Trim the name to remove leading and trailing spaces
				const trimmedName = searchQuery.trim();
				const nameParts = trimmedName.split(" ");
				const nameRegex = nameParts.map((part) => new RegExp(part, "i"));

				query.$or = [{ firstName: { $in: nameRegex } }, { lastName: { $in: nameRegex } }];
			}

			const dbUsers = await users
				.find(query, { password: 0 })
				.populate("subscriptions.subscription")
				.limit(limit)
				.skip(page && (page - 1) * limit);

			if (dbUsers?.length > 0) {
				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record Found", userID ? dbUsers[0] : dbUsers);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "No Record Found!", null);
			}
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.UNAUTHORIZED, false, "Access denied!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error?.message || error,
		});
	}
};

const createSubAdmin = async (request, response) => {
	const payload = request.body;
	const { userID: authenticatingUserID } = request.jwtPayload;
	const originUrl = request?.headers?.origin;

	if (!payload?.email) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
	}

	try {
		const dbUser = await users.findOne({ email: payload?.email });

		if (dbUser) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.CONFLICT, false, "This User Already Exists!", null);
		} else {
			const oneTimeCode = generateRandomNumber(6);
			const expiresAt = addMinutesToDate(new Date(), 100);

			const user = new users({
				...payload,
				isVerified: { status: true, createdAt: new Date() },
				passwordReset: { count: 1, code: oneTimeCode, expiresAt: expiresAt },
				userRole: "subAdmin",
				createdBy: authenticatingUserID,
				updatedBy: authenticatingUserID,
			});

			const newUser = await user.save();

			if (newUser) {
				const dbAdminUser = await users.findOne({ userRole: "admin" });

				const chatGroup = new chatGroups({
					title: newUser?.about?.firstName + " " + newUser?.about?.lastName,
					description: "A Private Chat With Admin",
					members: [newUser?._id],
					admins: [dbAdminUser?._id],
					groupType: "private",
					createdBy: dbAdminUser?._id,
					updatedBy: dbAdminUser?._id,
				});

				await chatGroup.save();

				const allDBUsers = await users.find({ userRole: "user" }, { _id: 1 }).lean();

				await chatGroups.updateMany(
					{ members: { $in: allDBUsers.map((item) => item?._id.toString()) }, admins: { $ne: newUser?._id } },
					{ $push: { admins: newUser?._id } },
				);

				var token = jwt.sign(
					{ email: newUser?.email, userID: newUser?._id, code: oneTimeCode },
					privateKEY,
					LOGIN_TOKEN_PREFERENCES,
				);

				const emailReplacements = {
					subject: "Setup Your Account Password",
					passwordResetLink: originUrl + `/reset-password?passwordReset=true&&token=${token}`,
					expiresAt: convertMillisecondsToTimeFormat(expiresAt - new Date()),
				};

				const emailSent = await sendEmail(newUser?.email, emailReplacements, "resetPassword.html");

				if (emailSent) {
					return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Created And Email Sent::Success", emailSent);
				} else {
					return sendJsonResponse(
						response,
						HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
						false,
						"Created But Email Sent::Failure",
						null,
					);
				}
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Sub Admin created::failure", null);
			}
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error?.message || error,
		});
	}
};

const register = async (request, response) => {
	const payload = request.body;
	const files = request.files;

	if (!payload?.email || !payload?.password) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
	}

	try {
		USER_FIELDS_UPDATE_BY_ADMIN_ONLY.forEach((key) => delete payload[key]);

		const dbUser = await users.findOne({ email: payload?.email });

		if (dbUser) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.CONFLICT, false, "This User Already Exists!", null);
		} else {
			const hashedPassword = await bcrypt.hash(payload?.password, 12);

			if (files?.length > 0) {
				for (let file of files) {
					let filePathByMediaType = path.join(mediaFilePath, file.mimetype.startsWith("video") ? "videos" : "images");

					if (file.mimetype.startsWith("image")) file = await optimizeAndConvertImage(file, "webp", 90);

					const generatedFileName = generateUniqueFilename(file, filePathByMediaType);
					const fileFullPath = path.join(filePathByMediaType, generatedFileName);

					await fs.promises.writeFile(fileFullPath, file.buffer);

					if (file.fieldname === "about[profileImage][filename]") {
						payload.about.profileImage = { mimetype: file.mimetype, filename: generatedFileName };
					}
				}
			}

			// Set isApproved to true for buyers
			if (payload.userRole === "buyer") {
				payload.isApproved = true;
			}

			const user = new users({ ...payload, password: hashedPassword });

			user.createdBy = payload?.createdBy || user["_id"];
			user.updatedBy = payload?.updatedBy || user["_id"];

			const newUser = await user.save();

			if (newUser) {
				if (newUser?.userRole === "user") {
					const dbAdminUser = await users.findOne({ userRole: "admin" });
					const dbSubAdmins = await users.find({ userRole: "subAdmin" });

					const chatGroup = new chatGroups({
						title: newUser?.firstName + " " + newUser?.lastName,
						description: "A Private Chat With Admin",
						members: [newUser?._id],
						admins: [dbAdminUser?._id, ...dbSubAdmins?.map((subAdmin) => subAdmin?._id)],
						groupType: "private",
						createdBy: dbAdminUser?._id,
						updatedBy: dbAdminUser?._id,
					});

					await chatGroup.save();
				}

				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "User created::success", newUser);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "User created::failure", null);
			}
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error?.message || error,
		});
	}
};

const login = async (request, response) => {
	const { email, password, isAdminLogin } = request.body;

	if (!email || !password) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
	}

	try {
		const dbUser = await users.findOne({ email: { $regex: new RegExp(email, "i") } });

		if (dbUser) {
			if (dbUser?.isActive) {
				if (
					(isAdminLogin && (dbUser?.userRole === "admin" || dbUser?.userRole === "subAdmin")) ||
					(!isAdminLogin && dbUser?.userRole !== "admin")
				) {
					const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

					if (isPasswordMatched) {
						var token = jwt.sign(
							{
								username: dbUser.username,
								email: dbUser.email,
								userID: dbUser._id,
								userRole: dbUser.userRole,
								userStatus: dbUser.userStatus,
							},
							privateKEY,
							LOGIN_TOKEN_PREFERENCES,
						);

						if (token) {
							return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Login::success", { token: token });
						} else {
							return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Login::failure", null);
						}
					} else {
						return sendJsonResponse(response, HTTP_STATUS_CODES.UNAUTHORIZED, false, "Invalid Password!", null);
					}
				} else {
					return sendJsonResponse(response, HTTP_STATUS_CODES.UNAUTHORIZED, false, "Access denied!", null);
				}
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.UNAUTHORIZED, false, "Account is disabled!", null);
			}
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "No Record Found!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error?.message || error,
		});
	}
};

const updateUser = async (request, response) => {
	try {
		const { password, ...payload } = request.body;
		const { userID: authenticatingUserID } = request.jwtPayload;
		const files = request.files;

		if (!payload?._id) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const authenticatingDBUser = await users.findOne({ _id: authenticatingUserID });

		if (authenticatingDBUser?.userRole !== "admin") USER_FIELDS_UPDATE_BY_ADMIN_ONLY.forEach((key) => delete payload[key]);

		if (payload._id === authenticatingUserID || authenticatingDBUser?.userRole === "admin") {
			const prevDBRecord = await users.findOne({ _id: payload._id });

			if (files?.length > 0) {
				for (let file of files) {
					let filePathByMediaType = path.join(mediaFilePath, file.mimetype.startsWith("video") ? "videos" : "images");

					if (file.mimetype.startsWith("image")) file = await optimizeAndConvertImage(file, "webp", 90);

					const generatedFileName = generateUniqueFilename(file, filePathByMediaType);
					const fileFullPath = path.join(filePathByMediaType, generatedFileName);

					await fs.promises.writeFile(fileFullPath, file.buffer);

					if (file.fieldname === "about[profileImage][filename]") {
						if (!payload?.about) payload.about = {};
						payload.about.profileImage = { mimetype: file.mimetype, filename: generatedFileName };
					}
				}
			}

			if (prevDBRecord?.userRole === "buyer" && payload?.userRole === "seller") payload.isApproved = false;

			const updatedUser = await users.findOneAndUpdate(
				{ _id: payload._id },
				{ $set: { ...payload, updatedBy: authenticatingDBUser?.id || authenticatingUserID } },
				{ fields: { password: 0 }, new: true },
			);

			if (updatedUser) {
				if (files?.length > 0) {
					for (let file of files) {
						if (file.fieldname === "profileImage[filename]") {
							if (prevDBRecord?.profileImage?.filename) {
								const existingFilePath = path.join(
									mediaFilePath,
									prevDBRecord.profileImage.mimetype.startsWith("video") ? "videos" : "images",
									prevDBRecord.profileImage.filename,
								);
								if (fs.existsSync(existingFilePath)) await fs.promises.unlink(existingFilePath);
							}
						} else if (file.fieldname === "drivingLicense[front][filename]") {
							if (prevDBRecord?.drivingLicense?.front?.filename) {
								const existingFilePath = path.join(
									mediaFilePath,
									prevDBRecord.drivingLicense?.front.mimetype.startsWith("video") ? "videos" : "images",
									prevDBRecord.drivingLicense?.front.filename,
								);
								if (fs.existsSync(existingFilePath)) await fs.promises.unlink(existingFilePath);
							}
						} else if (prevDBRecord?.drivingLicense?.back?.filename) {
							const existingFilePath = path.join(
								mediaFilePath,
								prevDBRecord.drivingLicense?.back.mimetype.startsWith("video") ? "videos" : "images",
								prevDBRecord.drivingLicense?.back.filename,
							);
							if (fs.existsSync(existingFilePath)) await fs.promises.unlink(existingFilePath);
						}
					}
				}

				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record updated::success", updatedUser);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record updated::failure", null);
			}
		} else {
			return sendJsonResponse(
				response,
				HTTP_STATUS_CODES.UNAUTHORIZED,
				false,
				"Access denied. Insufficient privileges!",
				null,
			);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error?.message || error,
		});
	}
};

const updatePassword = async (request, response) => {
	try {
		const { _id: userID, oldPassword: oldPassword, newPassword: newPassword } = request.body;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!userID || !oldPassword || !newPassword) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		if (userID === authenticatingUserID) {
			const dbUser = await users.findOne({ _id: userID });

			if (dbUser) {
				const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);

				if (isPasswordMatched) {
					const hashedPassword = await bcrypt.hash(newPassword, 12);

					const updatedUser = await users.findOneAndUpdate(
						{ _id: userID },
						{
							$set: {
								password: hashedPassword,
								updatedBy: authenticatingUserID,
							},
						},
						{ fields: { password: 0 }, new: true },
					);

					if (updatedUser) {
						return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record updated::success", updatedUser);
					} else {
						return sendJsonResponse(
							response,
							HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
							false,
							"Record updated::failure",
							null,
						);
					}
				} else {
					return sendJsonResponse(response, HTTP_STATUS_CODES.CONFLICT, false, "Password Verification::failure", null);
				}
			}
		} else {
			return sendJsonResponse(
				response,
				HTTP_STATUS_CODES.UNAUTHORIZED,
				false,
				"Access denied. Insufficient privileges!",
				null,
			);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error?.message || error,
		});
	}
};

const sendUserVerificationEmail = async (request, response) => {
	const { userID: authenticatingUserID } = request.jwtPayload;

	try {
		if (!authenticatingUserID) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const otp = generateRandomNumber(6);
		const expiresAt = addMinutesToDate(new Date(), 100);

		const updatedPayload = await users.findOneAndUpdate(
			{ _id: authenticatingUserID },
			{
				"isVerified.code": otp,
				"isVerified.createdAt": new Date(),
				"isVerified.expiresAt": expiresAt,
			},
			{ new: true },
		);

		const emailReplacements = {
			subject: "User OTP verification",
			otp: otp,
			expiresAt: convertMillisecondsToTimeFormat(expiresAt - new Date()),
		};

		if (updatedPayload?.email) {
			const emailPayload = await sendEmail(updatedPayload?.email, emailReplacements, "otpVerification.html");

			if (emailPayload?.accepted?.[0]) {
				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Email sent::success", emailPayload);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Email sent::Failure", emailPayload);
			}
		} else return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, true, "OTP Generation::failure", null);
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error?.message || error,
		});
	}
};

const verifyUserEmailByOTP = async (request, response) => {
	const { otp } = request.body;
	const { userID: authenticatingUserID } = request.jwtPayload;

	try {
		if (!otp) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}

		const dbUserPayload = await users.findOne({ _id: authenticatingUserID }, { isVerified: 1 });

		if (dbUserPayload?._id) {
			if (dbUserPayload?.isVerified?.expiresAt > new Date()) {
				if (dbUserPayload?.isVerified?.code === parseInt(otp)) {
					const updatedPayload = await users.findOneAndUpdate(
						{ _id: authenticatingUserID },
						{
							"isVerified.status": true,
							"isVerified.code": null,
							"isVerified.createdAt": null,
							"isVerified.expiresAt": null,
						},
						{ new: true },
					);

					if (updatedPayload) {
						return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "User Verified::success", updatedPayload);
					} else {
						return sendJsonResponse(
							response,
							HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
							false,
							"User Verified::Failure",
							null,
						);
					}
				} else return sendJsonResponse(response, HTTP_STATUS_CODES.FORBIDDEN, false, "Invalid OTP::Failure", null);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.NOT_ACCEPTABLE, false, "OTP Expired::Failure", null);
			}
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error?.message || error,
		});
	}
};

const sendPasswordResetEmail = async (request, response) => {
	const { email } = request.body;
	const originUrl = request?.headers?.origin;

	if (!email) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
	}

	try {
		const oneTimeCode = generateRandomNumber(6);
		const expiresAt = addMinutesToDate(new Date(), 100);
		const dbUser = await users.findOne({ email: email }, { password: 0 });

		if (dbUser?._id) {
			const updatedUser = await users.findOneAndUpdate(
				{ _id: dbUser._id },
				{
					passwordReset: {
						count: dbUser?.passwordReset?.count + 1 || 1,
						code: oneTimeCode,
						expiresAt: expiresAt,
					},
				},
				{ new: true },
			);

			if (updatedUser) {
				var token = jwt.sign({ email: email, userID: dbUser._id, code: oneTimeCode }, privateKEY, LOGIN_TOKEN_PREFERENCES);

				const emailReplacements = {
					subject: "Reset User Password",
					passwordResetLink: originUrl + `/reset-password?passwordReset=true&&token=${token}`,
					expiresAt: convertMillisecondsToTimeFormat(expiresAt - new Date()),
				};

				const emailSent = await sendEmail(dbUser?.email, emailReplacements, "resetPassword.html");

				if (emailSent) {
					return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Email sent::success", emailSent);
				} else {
					return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Email sent::Failure", null);
				}
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Password Request::failure", null);
			}
		} else {
			return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "No Record Found!", null);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error?.message || error,
		});
	}
};

const passwordResetUsingVerificationEmail = async (request, response) => {
	const { token, password } = request.body;

	if (!token && !password) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
	}

	try {
		const decodedToken = jwt.verify(token, publicKEY, LOGIN_TOKEN_PREFERENCES);

		const dbUser = await users.findOne({ email: decodedToken.email, _id: decodedToken.userID }, { password: 0 });

		if (dbUser) {
			if (dbUser?.passwordReset?.expiresAt > new Date()) {
				if (dbUser?.passwordReset?.code === decodedToken.code) {
					const hashedPassword = await bcrypt.hash(password, 12);

					const updatedUser = await users.findOneAndUpdate(
						{ _id: dbUser._id },
						{
							password: hashedPassword,
							"passwordReset.code": null,
							"passwordReset.lastResetDate": new Date(),
							"passwordReset.expiresAt": null,
						},
						{ fields: { password: 0 }, new: true },
					);
					if (updatedUser) {
						return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Password Reset::success", updatedUser);
					} else {
						return sendJsonResponse(
							response,
							HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
							false,
							"Password reset::failure",
							null,
						);
					}
				} else return sendJsonResponse(response, HTTP_STATUS_CODES.CONFLICT, false, "Email Verification::failure", null);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.GONE, false, "Password reset Link Expired", null);
			}
		} else return sendJsonResponse(response, HTTP_STATUS_CODES.NOTFOUND, false, "No Record Found!", null);
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error?.message || error,
		});
	}
};

const deleteUser = async (request, response) => {
	try {
		const { _id: userID } = request.query;
		const { userID: authenticatingUserID } = request.jwtPayload;

		if (!userID) {
			return sendJsonResponse(response, HTTP_STATUS_CODES.BAD_REQUEST, false, "Missing parameters!", null);
		}
		const authenticatingDBUser = await users.findOne({ _id: authenticatingUserID });

		if (userID === authenticatingUserID || authenticatingDBUser?.userRole === "admin") {
			const deletedUser = await users.findOneAndDelete({ _id: userID }, { new: true });

			if (deletedUser) {
				if (deletedUser?.profileImage?.filename) {
					const existingFilePath = path.join(
						mediaFilePath,
						deletedUser.profileImage.mimetype.startsWith("video") ? "videos" : "images",
						deletedUser.profileImage.filename,
					);
					if (fs.existsSync(existingFilePath)) await fs.promises.unlink(existingFilePath);
				}

				await chatGroups.deleteMany({ members: userID });
				await chatGroups.updateMany({ admins: userID, members: { $ne: userID } }, { $pull: { admins: userID } });

				return sendJsonResponse(response, HTTP_STATUS_CODES.OK, true, "Record delete::success", deletedUser);
			} else {
				return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Record delete::failure", null);
			}
		} else {
			return sendJsonResponse(
				response,
				HTTP_STATUS_CODES.UNAUTHORIZED,
				false,
				"Access denied. Insufficient privileges!",
				null,
			);
		}
	} catch (error) {
		return sendJsonResponse(response, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, false, "Server Error!", {
			error: error?.message || error,
		});
	}
};

module.exports = {
	getUser,
	login,
	createSubAdmin,
	register,
	updateUser,
	updatePassword,
	sendUserVerificationEmail,
	verifyUserEmailByOTP,
	sendPasswordResetEmail,
	passwordResetUsingVerificationEmail,
	deleteUser,
};
