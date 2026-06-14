const express = require("express");
const multer = require("multer");
const path = require("path");
const importController = require("../controllers/importController");

const router = express.Router();

// Configure disk storage for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Resolve to the existing backend/src/uploads folder
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${fileExt}`);
  },
});

// File filter to accept only CSV files
const fileFilter = (req, file, cb) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  // Support both standard .csv and excel-derived CSV content-types
  if (
    fileExt === ".csv" ||
    file.mimetype === "text/csv" ||
    file.mimetype === "application/vnd.ms-excel"
  ) {
    cb(null, true);
  } else {
    // Reject other file types (req.file will be undefined in controller)
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit to 5MB
  },
});

// Endpoint: POST /api/import/csv
router.post("/import/csv", upload.single("file"), importController.importCSV);

module.exports = router;
