const multer = require("multer");

const multerMiddleware = () => {
	const storage = multer.memoryStorage();
	const upload = multer({ storage: storage });
	return upload.any(); // Allow any number of fields/files
};

module.exports = multerMiddleware;
