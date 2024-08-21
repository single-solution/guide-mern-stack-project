const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

var nodemailer = require("nodemailer");
var handlebars = require("handlebars");

const generateRandomNumber = (numberLength) => {
	return Math.floor(Math.random() * (9 * Math.pow(10, numberLength - 1))) + Math.pow(10, numberLength - 1);
};

const addMinutesToDate = (date, minutes) => {
	return new Date(date.getTime() + minutes * 60000);
};

const Sleep = (time) => {
	return new Promise((resolve) => setTimeout(resolve, time));
};

const sendJsonResponse = (response, httpCode, status = false, message = "No Message To Show!", payload = null) => {
	return response.status(HTTP_STATUS_CODES.OK).json({ httpCode, status, message, count: payload?.length, payload });
};

const convertMillisecondsToTimeFormat = (milliseconds) => {
	const portions = [];

	const msInHour = 1000 * 60 * 60;
	const hours = Math.trunc(milliseconds / msInHour);
	if (hours > 0) {
		portions.push(hours + "h");
		milliseconds = milliseconds - hours * msInHour;
	}

	const msInMinute = 1000 * 60;
	const minutes = Math.trunc(milliseconds / msInMinute);
	if (minutes > 0) {
		portions.push(minutes + "m");
		milliseconds = milliseconds - minutes * msInMinute;
	}

	const seconds = Math.trunc(milliseconds / 1000);
	if (seconds > 0) {
		portions.push(seconds + "s");
	}

	return portions.join(" ");
};

const optimizeAndConvertImage = async (file, fileType, quality) => {
	let outputBuffer = null;

	try {
		switch (fileType) {
			case "webp":
				outputBuffer = await sharp(file.buffer).webp({ quality: quality }).toBuffer();
				break;
			case "png":
				outputBuffer = await sharp(file.buffer).png({ quality: quality }).toBuffer();
				break;
			default:
				return file;
		}

		if (outputBuffer) {
			file.originalname = path.basename(file.originalname, path.extname(file.originalname)) + "." + fileType;
			file.mimetype = "image/" + fileType;
		}

		return file;
	} catch (error) {
		throw error;
	}
};

const generateUniqueFilename = (file, filePath, filename) => {
	let uniqueFileName = null;

	while (!uniqueFileName || fs.existsSync(path.join(filePath, uniqueFileName))) {
		const uniqueFileID = generateRandomNumber(10);
		const currentTimestamp = new Date().toISOString().replace(/[-:.]/g, "");
		const originalFileName = filename || file.originalname;

		const sanitizedFileName = originalFileName.replace(/[_\s,.]/g, "-");
		const fileExtension = file.originalname.split(".").pop();

		uniqueFileName = `${sanitizedFileName}-${uniqueFileID}-${currentTimestamp}.${fileExtension}`;
	}

	return uniqueFileName;
};

const sendEmail = async (receiver, replacements, template) => {
	let emailResponse = null;
	let emailTemplate = null;

	try {
		const transporter = nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			secure: false,
			port: 587,
			auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
		});

		emailTemplate = fs.readFileSync(path.join(__dirname, "/../utils/emailTemplates/" + template), "utf-8").toString();
		emailTemplate = handlebars.compile(emailTemplate);
		const htmlToSend = emailTemplate(replacements);

		var mailOptions = {
			from: process.env.EMAIL_SENDER_NAME,
			to: receiver,
			subject: replacements?.subject || "",
			html: htmlToSend,
		};

		await transporter.sendMail(mailOptions).then((data, error) => {
			if (error) throw error;
			else if (data) emailResponse = data;
		});

		return emailResponse;
	} catch (error) {
		return error?.message;
	}
};

module.exports = {
	generateRandomNumber,
	addMinutesToDate,
	Sleep,
	sendJsonResponse,
	convertMillisecondsToTimeFormat,
	optimizeAndConvertImage,
	generateUniqueFilename,
	sendEmail,
};
